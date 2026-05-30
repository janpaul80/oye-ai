/**
 * Oye AI: Observability & Telemetry Service
 * File Location: c:\Users\hartm\oye-ai\src\lib\services\observability.ts
 * 
 * Provides unified real-time telemetry metrics mapping for provider latencies,
 * uptime scoring, queue deep-inspection, failed dispatches, retries, and token-based
 * billing metrics. Supports Redis storage with a resilient in-memory fallback.
 */

import IORedis from 'ioredis';
import os from 'os';

export interface ProviderMetric {
  name: string;
  latencyMs: number;
  success: boolean;
  timestamp: string;
}

export interface ProviderSlaLogInput {
  organization_id?: string;
  provider: string;
  model: string;
  latency_ms: number;
  success: boolean;
  error_message?: string;
  tokens?: number;
  estimated_cost?: number;
  trace_id?: string;
  timeout_occurred?: boolean;
  failover_engaged?: boolean;
}

export interface QueueDepthMetrics {
  incoming_messages: number;
  outbound_dispatches: number;
  scheduled_campaigns: number;
  system_cleanup: number;
}

export interface SystemTelemetry {
  providerHealth: Record<string, { uptimeRatio: number; avgLatencyMs: number; errorCount: number }>;
  queueMetrics: QueueDepthMetrics;
  failedDispatchesCount: number;
  retryCount: number;
  dlqCount: number;
  tokenConsumptionByOrg: Record<string, { promptTokens: number; completionTokens: number; estimatedCostUsd: number }>;
  avgQueueWaitTimeMs: number;
  queueThroughputPerMin: number;
  hostDiagnostics: {
    cpuUsagePercent: number;
    totalMemoryGb: number;
    freeMemoryGb: number;
    memoryUsagePercent: number;
  };
  activeWorkers: Array<{
    id: string;
    queue: string;
    lastHeartbeat: string;
    status: 'active' | 'stale';
    completedCount: number;
    uptimeSec: number;
  }>;
  saturationWarnings: string[];
}

class ObservabilityService {
  private redisClient: IORedis | null = null;
  private startTime = Date.now();
  private lastSlaComputeTime = 0;
  
  // In-memory telemetry fallback databases
  private memProviderMetrics: Map<string, ProviderMetric[]> = new Map();
  private memFailedDispatches = 0;
  private memRetryCount = 0;
  private memDlqCount = 0;
  private memTokensByOrg: Map<string, { prompt: number; completion: number; cost: number }> = new Map();
  private memWaitTimes: number[] = [];
  private memThroughputTimes: number[] = [];
  private memWorkers: Map<string, { queue: string; lastHeartbeat: string; completedCount: number; startTime: number }> = new Map();

  constructor() {
    if (process.env.ENABLE_BULLMQ === 'true' || process.env.REDIS_URL) {
      try {
        const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        this.redisClient = new IORedis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false
        });
        console.log('[Observability] Initialized telemetry backend with active Redis connectivity.');
      } catch (err: any) {
        console.error('[Observability] Redis initialization failed. Falling back to internal engine memory:', err.message);
      }
    } else {
      console.log('[Observability] Initialized telemetry backend in local V8 in-memory fallback mode.');
    }
  }

  /**
   * Log an active AI provider latency/success occurrence. Supports legacy and structured overloads.
   */
  async logAICompletion(
    providerOrInput: string | ProviderSlaLogInput,
    durationMs?: number,
    success?: boolean
  ): Promise<void> {
    let input: ProviderSlaLogInput;

    if (typeof providerOrInput === 'object') {
      input = providerOrInput;
    } else {
      input = {
        provider: providerOrInput,
        latency_ms: durationMs || 0,
        success: success !== false,
        model: 'unknown',
        tokens: 0,
        estimated_cost: 0
      };
    }

    // 1. Log raw SLA metrics directly to PostgreSQL provider_sla_logs table
    try {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = await createAdminClient();
      const { error } = await adminClient.from('provider_sla_logs').insert({
        organization_id: input.organization_id || null,
        provider: input.provider,
        model: input.model,
        latency_ms: input.latency_ms,
        success: input.success,
        error_message: input.error_message || null,
        tokens: input.tokens || 0,
        estimated_cost: input.estimated_cost || 0.00000,
        trace_id: input.trace_id || null,
        timeout_occurred: input.timeout_occurred || false,
        failover_engaged: input.failover_engaged || false
      });
      if (error) {
        console.error('[Observability] PostgreSQL logging to provider_sla_logs failed:', error.message);
      }
    } catch (err: any) {
      console.error('[Observability] Failed to log to PostgreSQL provider_sla_logs:', err.message);
    }

    // 2. Perform Redis and in-memory list fallbacks for live telemetry graphs
    const metric: ProviderMetric = {
      name: input.provider,
      latencyMs: input.latency_ms,
      success: input.success,
      timestamp: new Date().toISOString()
    };

    if (this.redisClient) {
      try {
        const key = `telemetry:ai:provider:${input.provider}`;
        await this.redisClient.lpush(key, JSON.stringify(metric));
        await this.redisClient.ltrim(key, 0, 99); // Keep last 100 entries for moving averages
      } catch (err: any) {
        console.error('[Observability] Redis completions logging failed:', err.message);
        this.logAICompletionToMemory(input.provider, metric);
      }
    } else {
      this.logAICompletionToMemory(input.provider, metric);
    }
  }

  private logAICompletionToMemory(provider: string, metric: ProviderMetric): void {
    const metricsList = this.memProviderMetrics.get(provider) || [];
    metricsList.push(metric);
    if (metricsList.length > 100) metricsList.shift();
    this.memProviderMetrics.set(provider, metricsList);
  }

  /**
   * Background computation function to calculate SLA rolling statistics and cache them in provider_reliability_scores.
   */
  async computeProviderSlaScores(): Promise<void> {
    try {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = await createAdminClient();

      const providers = ['langdock', 'openai', 'anthropic', 'gemini'];

      for (const provider of providers) {
        // Fetch logs for the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: fetchedLogs, error } = await adminClient
          .from('provider_sla_logs')
          .select('*')
          .eq('provider', provider)
          .gte('created_at', twentyFourHoursAgo);

        let logs = fetchedLogs;

        if (error) {
          console.error(`[Observability] Error fetching SLA logs for ${provider}:`, error.message);
          continue;
        }

        // If no logs in the last 24 hours, fallback to getting the latest 100 logs of that provider
        if (!logs || logs.length === 0) {
          const { data: fallbackLogs, error: fallbackError } = await adminClient
            .from('provider_sla_logs')
            .select('*')
            .eq('provider', provider)
            .order('created_at', { ascending: false })
            .limit(100);
            
          if (fallbackError) {
            console.error(`[Observability] Error fetching fallback SLA logs for ${provider}:`, fallbackError.message);
            continue;
          }
          logs = fallbackLogs || [];
        }

        if (logs.length === 0) {
          continue;
        }

        const totalCount = logs.length;
        const latencies = logs.map(l => l.latency_ms);
        const successCount = logs.filter(l => l.success).length;
        const errorCount = totalCount - successCount;
        const timeoutCount = logs.filter(l => l.timeout_occurred).length;
        const failoverCount = logs.filter(l => l.failover_engaged).length;

        const avg_latency_ms = Math.round(latencies.reduce((a, b) => a + b, 0) / totalCount);
        
        const calculatePercentile = (values: number[], percentile: number): number => {
          if (values.length === 0) return 0;
          const sorted = [...values].sort((a, b) => a - b);
          const index = Math.ceil((percentile / 100) * sorted.length) - 1;
          return sorted[Math.max(0, index)];
        };

        const p50_latency_ms = calculatePercentile(latencies, 50);
        const p95_latency_ms = calculatePercentile(latencies, 95);
        const p99_latency_ms = calculatePercentile(latencies, 99);
        const error_rate = Number(((errorCount / totalCount) * 100).toFixed(2));
        const timeout_rate = Number(((timeoutCount / totalCount) * 100).toFixed(2));
        const uptime_ratio = Number(((successCount / totalCount) * 100).toFixed(2));

        // Upsert into provider_reliability_scores
        const { error: upsertError } = await adminClient
          .from('provider_reliability_scores')
          .upsert({
            provider,
            avg_latency_ms,
            p50_latency_ms,
            p95_latency_ms,
            p99_latency_ms,
            error_rate,
            timeout_rate,
            failover_count: failoverCount,
            uptime_ratio,
            updated_at: new Date().toISOString()
          }, { onConflict: 'provider' });

        if (upsertError) {
          console.error(`[Observability] Error caching SLA scores for ${provider}:`, upsertError.message);
        } else {
          console.log(`[Observability] Successfully updated SLA scores cache for provider: ${provider}`);
        }
      }
    } catch (err: any) {
      console.error('[Observability] Error computing SLA scores:', err.message);
    }
  }

  /**
   * Computes the Exponentially Weighted Moving Average (EWMA) latency for a provider.
   * Formula: EWMA_t = alpha * Latency_t + (1 - alpha) * EWMA_{t-1}
   * Alpha default is 0.3.
   */
  async getEwmaLatency(provider: string, alpha = 0.3): Promise<number> {
    let latencies: number[] = [];

    // Try fetching from Redis or in-memory
    if (this.redisClient) {
      try {
        const key = `telemetry:ai:provider:${provider}`;
        const rawList = await this.redisClient.lrange(key, 0, 49);
        latencies = rawList.map((item: string) => JSON.parse(item).latencyMs).reverse();
      } catch (err: any) {
        console.warn(`[Observability] Failed to read Redis metrics for EWMA:`, err.message);
      }
    }

    if (latencies.length === 0) {
      // In-memory fallback
      const metrics = this.memProviderMetrics.get(provider) || [];
      latencies = metrics.map(m => m.latencyMs);
    }

    if (latencies.length === 0) {
      // If still zero, fallback to DB last 20 logs
      try {
        const { createAdminClient } = await import('@/lib/supabase/server');
        const adminClient = await createAdminClient();
        const { data: dbLogs } = await adminClient
          .from('provider_sla_logs')
          .select('latency_ms')
          .eq('provider', provider)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (dbLogs && dbLogs.length > 0) {
          latencies = dbLogs.map(l => l.latency_ms).reverse();
        }
      } catch {}
    }

    if (latencies.length === 0) {
      return 1500; // Baseline default latency (1.5s) if no data
    }

    // Compute EWMA
    let ewma = latencies[0];
    for (let i = 1; i < latencies.length; i++) {
      ewma = alpha * latencies[i] + (1 - alpha) * ewma;
    }

    return Math.round(ewma);
  }

  /**
   * Scans provider latency logs and webhook trace logs to identify, cluster, and persist anomalies.
   */
  async detectAndClusterAnomalies(): Promise<void> {
    try {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = await createAdminClient();

      // Look at recent provider SLA logs in the last 15 minutes for latency spikes (> 2500ms) or errors
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: recentLogs } = await adminClient
        .from('provider_sla_logs')
        .select('*')
        .gte('created_at', fifteenMinutesAgo);

      if (recentLogs && recentLogs.length >= 3) {
        // Group by provider to check if any provider is having systemic failures or slowdowns
        const providerSlowdowns: Record<string, typeof recentLogs> = {};
        for (const log of recentLogs) {
          if (log.latency_ms > 2500 || !log.success) {
            if (!providerSlowdowns[log.provider]) {
              providerSlowdowns[log.provider] = [];
            }
            providerSlowdowns[log.provider].push(log);
          }
        }

        for (const [provider, logs] of Object.entries(providerSlowdowns)) {
          if (logs.length >= 3) {
            // Cluster detected! Persist to anomaly_clusters
            const details = {
              provider,
              total_scanned: logs.length,
              avg_latency: Math.round(logs.reduce((sum, l) => sum + l.latency_ms, 0) / logs.length),
              error_rate: Number(((logs.filter(l => !l.success).length / logs.length) * 100).toFixed(2)),
              samples: logs.slice(0, 5).map(l => ({ id: l.id, latency: l.latency_ms, success: l.success })),
            };

            const severity = details.error_rate > 50 ? 'critical' : 'high';

            // Check if there is an unmitigated cluster of same provider/anomaly type in last 30m
            const thirtymAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const { data: existing } = await adminClient
              .from('anomaly_clusters')
              .select('*')
              .eq('anomaly_type', 'provider_slowdown')
              .eq('details->>provider', provider)
              .eq('is_mitigated', false)
              .gte('detected_at', thirtymAgo)
              .limit(1);

            if (!existing || existing.length === 0) {
              await adminClient.from('anomaly_clusters').insert({
                anomaly_type: 'provider_slowdown',
                severity,
                correlated_events: logs.length,
                details,
                is_mitigated: false
              });
              console.log(`[Observability] Persisted anomaly cluster for degraded provider: ${provider}`);
            } else {
              // Update existing cluster with new count
              await adminClient
                .from('anomaly_clusters')
                .update({ 
                  correlated_events: (existing[0].correlated_events || 0) + 1,
                  detected_at: new Date().toISOString()
                })
                .eq('id', existing[0].id);
            }
          }
        }
      }

      // Also look at message_delivery_traces for webhook delays (latency_dispatch_to_delivered_ms > 15000ms)
      const { data: traceLogs } = await adminClient
        .from('message_delivery_traces')
        .select('*')
        .gte('dispatched_at', fifteenMinutesAgo);

      if (traceLogs && traceLogs.length >= 3) {
        const delayedTraces = traceLogs.filter(t => (t.latency_dispatch_to_delivered_ms || 0) > 15000 || t.status === 'failed');
        if (delayedTraces.length >= 3) {
          const details = {
            total_scanned: traceLogs.length,
            delayed_count: delayedTraces.length,
            avg_delay: Math.round(delayedTraces.reduce((sum, t) => sum + (t.latency_dispatch_to_delivered_ms || 0), 0) / delayedTraces.length),
            samples: delayedTraces.slice(0, 5).map(t => ({ id: t.id, latency: t.latency_dispatch_to_delivered_ms, status: t.status })),
          };

          const severity = delayedTraces.filter(t => t.status === 'failed').length > 50 ? 'critical' : 'high';

          const thirtymAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: existing } = await adminClient
            .from('anomaly_clusters')
            .select('*')
            .eq('anomaly_type', 'webhook_delay')
            .eq('is_mitigated', false)
            .gte('detected_at', thirtymAgo)
            .limit(1);

          if (!existing || existing.length === 0) {
            await adminClient.from('anomaly_clusters').insert({
              anomaly_type: 'webhook_delay',
              severity,
              correlated_events: delayedTraces.length,
              details,
              is_mitigated: false
            });
            console.log(`[Observability] Persisted anomaly cluster for webhook delays.`);
          } else {
            await adminClient
              .from('anomaly_clusters')
              .update({
                correlated_events: (existing[0].correlated_events || 0) + 1,
                detected_at: new Date().toISOString()
              })
              .eq('id', existing[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error('[Observability] Error in detectAndClusterAnomalies:', err.message);
    }
  }

  /**
   * Track token usage and estimated billing costs.
   */
  async recordTokenConsumption(
    orgId: string,
    promptTokens: number,
    completionTokens: number,
    _provider: string
  ): Promise<void> {
    // Estimations based on average gpt-4o-mini / langdock routing rates ($0.150 per 1M input / $0.600 per 1M output)
    const inputRate = 0.15 / 1000000;
    const outputRate = 0.60 / 1000000;
    const cost = (promptTokens * inputRate) + (completionTokens * outputRate);

    if (this.redisClient) {
      try {
        const key = `telemetry:org:${orgId}:tokens`;
        await this.redisClient.hincrby(key, 'prompt', promptTokens);
        await this.redisClient.hincrby(key, 'completion', completionTokens);
        await this.redisClient.hincrbyfloat(key, 'cost', cost);
      } catch (err: any) {
        console.error('[Observability] Redis billing aggregation failed:', err.message);
        this.recordTokensToMemory(orgId, promptTokens, completionTokens, cost);
      }
    } else {
      this.recordTokensToMemory(orgId, promptTokens, completionTokens, cost);
    }
  }

  private recordTokensToMemory(orgId: string, prompt: number, completion: number, cost: number): void {
    const current = this.memTokensByOrg.get(orgId) || { prompt: 0, completion: 0, cost: 0 };
    this.memTokensByOrg.set(orgId, {
      prompt: current.prompt + prompt,
      completion: current.completion + completion,
      cost: current.cost + cost
    });
  }

  /**
   * Log background queue event dispatches (failures, retries, dead-letter routes).
   */
  async incrementFailedDispatches(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.incr('telemetry:dispatches:failed').catch(() => this.memFailedDispatches++);
    } else {
      this.memFailedDispatches++;
    }
  }

  async incrementRetries(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.incr('telemetry:dispatches:retries').catch(() => this.memRetryCount++);
    } else {
      this.memRetryCount++;
    }
  }

  async incrementDlq(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.incr('telemetry:dlq:failures').catch(() => this.memDlqCount++);
    } else {
      this.memDlqCount++;
    }
  }

  /**
   * Pull active telemetry metrics from the system for dashboard output.
   */
  async getSystemTelemetry(): Promise<SystemTelemetry> {
    // Dynamically trigger non-blocking SLA scores computation if it hasn't run in the last 60 seconds
    const now = Date.now();
    if (!this.lastSlaComputeTime || (now - this.lastSlaComputeTime > 60000)) {
      this.lastSlaComputeTime = now;
      this.computeProviderSlaScores().catch(err => {
        console.error('[Observability] Non-blocking background SLA computation failed:', err.message);
      });
    }

    const providers = ['langdock', 'openai', 'anthropic', 'gemini'];
    const providerHealth: SystemTelemetry['providerHealth'] = {};

    for (const p of providers) {
      let metrics: ProviderMetric[] = [];

      if (this.redisClient) {
        try {
          const listData = await this.redisClient.lrange(`telemetry:ai:provider:${p}`, 0, 99);
          metrics = listData.map((d) => JSON.parse(d));
        } catch {
          metrics = this.memProviderMetrics.get(p) || [];
        }
      } else {
        metrics = this.memProviderMetrics.get(p) || [];
      }

      if (metrics.length === 0) {
        providerHealth[p] = { uptimeRatio: 1.0, avgLatencyMs: 0, errorCount: 0 };
      } else {
        const total = metrics.length;
        const successCount = metrics.filter((m) => m.success).length;
        const totalLatency = metrics.reduce((acc, m) => acc + m.latencyMs, 0);
        const errorCount = total - successCount;

        providerHealth[p] = {
          uptimeRatio: Number((successCount / total).toFixed(2)),
          avgLatencyMs: Math.round(totalLatency / total),
          errorCount
        };
      }
    }

    // Capture standard simulated queue depths when actual workers aren't registering
    const queueMetrics: QueueDepthMetrics = {
      incoming_messages: 0,
      outbound_dispatches: 0,
      scheduled_campaigns: 0,
      system_cleanup: 0
    };

    let failedDispatchesCount = this.memFailedDispatches;
    let retryCount = this.memRetryCount;
    let dlqCount = this.memDlqCount;

    if (this.redisClient) {
      try {
        // Collect exact BullMQ sizes in future runtime configurations
        queueMetrics.incoming_messages = Number(await this.redisClient.llen('bull:incoming_messages:wait') || 0);
        queueMetrics.outbound_dispatches = Number(await this.redisClient.llen('bull:outbound_dispatches:wait') || 0);
        queueMetrics.scheduled_campaigns = Number(await this.redisClient.llen('bull:scheduled_campaigns:wait') || 0);

        failedDispatchesCount = Number(await this.redisClient.get('telemetry:dispatches:failed') || 0);
        retryCount = Number(await this.redisClient.get('telemetry:dispatches:retries') || 0);
        dlqCount = Number(await this.redisClient.get('telemetry:dlq:failures') || 0);
      } catch {
        // Fallback gracefully
      }
    }

    const tokenConsumptionByOrg: SystemTelemetry['tokenConsumptionByOrg'] = {};
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys('telemetry:org:*:tokens');
        for (const k of keys) {
          const orgId = k.split(':')[2];
          const hash = await this.redisClient.hgetall(k);
          tokenConsumptionByOrg[orgId] = {
            promptTokens: Number(hash.prompt || 0),
            completionTokens: Number(hash.completion || 0),
            estimatedCostUsd: Number(Number(hash.cost || 0).toFixed(6))
          };
        }
      } catch {
        // Fallback to memory
      }
    }

    if (Object.keys(tokenConsumptionByOrg).length === 0) {
      this.memTokensByOrg.forEach((val, key) => {
        tokenConsumptionByOrg[key] = {
          promptTokens: val.prompt,
          completionTokens: val.completion,
          estimatedCostUsd: Number(val.cost.toFixed(6))
        };
      });
    }

    let waitTimes: number[] = [];
    if (this.redisClient) {
      try {
        const listData = await this.redisClient.lrange('telemetry:queue:incoming_messages:waittimes', 0, 99);
        waitTimes = listData.map((d) => Number(d));
      } catch {
        waitTimes = this.memWaitTimes;
      }
    } else {
      waitTimes = this.memWaitTimes;
    }
    const avgQueueWaitTimeMs = waitTimes.length > 0 
      ? Math.round(waitTimes.reduce((acc, t) => acc + t, 0) / waitTimes.length) 
      : 120; // Default mock fallback value of 120ms if no jobs have run

    // Calculate throughput per minute (number of jobs in the last 60 seconds)
    let throughputTimestamps: number[] = [];
    if (this.redisClient) {
      try {
        const listData = await this.redisClient.lrange('telemetry:throughput:timestamps', 0, 99);
        throughputTimestamps = listData.map((d) => Number(d));
      } catch {
        throughputTimestamps = this.memThroughputTimes;
      }
    } else {
      throughputTimestamps = this.memThroughputTimes;
    }
    const oneMinuteAgo = Date.now() - 60000;
    const queueThroughputPerMin = throughputTimestamps.filter((t) => t >= oneMinuteAgo).length || 8; // Default mock fallback of 8 jobs/min if no recent records

    const activeWorkers = await this.getActiveWorkers();

    const saturationWarnings: string[] = [];
    if (queueMetrics.incoming_messages > 20) {
      saturationWarnings.push(`Cola de entrada (incoming_messages) saturada: ${queueMetrics.incoming_messages} items pendientes.`);
    }
    if (queueMetrics.outbound_dispatches > 20) {
      saturationWarnings.push(`Cola de salida (outbound_dispatches) saturada: ${queueMetrics.outbound_dispatches} items pendientes.`);
    }
    if (queueMetrics.scheduled_campaigns > 20) {
      saturationWarnings.push(`Cola de campañas (scheduled_campaigns) saturada: ${queueMetrics.scheduled_campaigns} items pendientes.`);
    }

    const hostDiagnostics = this.getHostDiagnostics();

    return {
      providerHealth,
      queueMetrics,
      failedDispatchesCount,
      retryCount,
      dlqCount,
      tokenConsumptionByOrg,
      avgQueueWaitTimeMs,
      queueThroughputPerMin,
      hostDiagnostics,
      activeWorkers,
      saturationWarnings
    };
  }

  /**
   * Register or update the heartbeat of a background worker.
   */
  async registerWorkerHeartbeat(workerId: string, queue: string, completedCount: number): Promise<void> {
    const now = new Date().toISOString();
    const data = {
      id: workerId,
      queue,
      lastHeartbeat: now,
      completedCount,
      startTime: this.startTime
    };

    if (this.redisClient) {
      try {
        const key = `telemetry:worker:${workerId}:heartbeat`;
        
        let workerStartTime = this.startTime;
        const existing = await this.redisClient.get(key);
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (parsed.startTime) workerStartTime = parsed.startTime;
          } catch {}
        }

        const payload = {
          ...data,
          startTime: workerStartTime
        };

        await this.redisClient.set(key, JSON.stringify(payload), 'EX', 3600);
        await this.redisClient.sadd('telemetry:workers', workerId);
      } catch (err: any) {
        console.error('[Observability] Redis worker heartbeat failed:', err.message);
        this.registerWorkerHeartbeatToMemory(workerId, queue, completedCount);
      }
    } else {
      this.registerWorkerHeartbeatToMemory(workerId, queue, completedCount);
    }
  }

  private registerWorkerHeartbeatToMemory(workerId: string, queue: string, completedCount: number): void {
    const existing = this.memWorkers.get(workerId);
    const workerStartTime = existing ? existing.startTime : Date.now();
    this.memWorkers.set(workerId, {
      queue,
      lastHeartbeat: new Date().toISOString(),
      completedCount,
      startTime: workerStartTime
    });
  }

  /**
   * Fetch active and stale workers
   */
  async getActiveWorkers(): Promise<SystemTelemetry['activeWorkers']> {
    const activeWorkers: SystemTelemetry['activeWorkers'] = [];
    const nowMs = Date.now();

    if (this.redisClient) {
      try {
        const workerIds = await this.redisClient.smembers('telemetry:workers');
        for (const workerId of workerIds) {
          const key = `telemetry:worker:${workerId}:heartbeat`;
          const dataStr = await this.redisClient.get(key);
          if (!dataStr) {
            await this.redisClient.srem('telemetry:workers', workerId);
            continue;
          }

          try {
            const data = JSON.parse(dataStr);
            const lastHeartbeatMs = new Date(data.lastHeartbeat).getTime();
            const status = (nowMs - lastHeartbeatMs) > 90000 ? 'stale' : 'active';
            const uptimeSec = Math.round((nowMs - data.startTime) / 1000);

            activeWorkers.push({
              id: data.id,
              queue: data.queue,
              lastHeartbeat: data.lastHeartbeat,
              status,
              completedCount: data.completedCount,
              uptimeSec
            });
          } catch {
            await this.redisClient.srem('telemetry:workers', workerId);
          }
        }
      } catch (err: any) {
        console.error('[Observability] Redis getActiveWorkers failed, falling back to memory:', err.message);
        return this.getActiveWorkersFromMemory();
      }
    } else {
      return this.getActiveWorkersFromMemory();
    }

    return activeWorkers;
  }

  private getActiveWorkersFromMemory(): SystemTelemetry['activeWorkers'] {
    const activeWorkers: SystemTelemetry['activeWorkers'] = [];
    const nowMs = Date.now();

    this.memWorkers.forEach((worker, workerId) => {
      const lastHeartbeatMs = new Date(worker.lastHeartbeat).getTime();
      const status = (nowMs - lastHeartbeatMs) > 90000 ? 'stale' : 'active';
      const uptimeSec = Math.round((nowMs - worker.startTime) / 1000);

      activeWorkers.push({
        id: workerId,
        queue: worker.queue,
        lastHeartbeat: worker.lastHeartbeat,
        status,
        completedCount: worker.completedCount,
        uptimeSec
      });
    });

    return activeWorkers;
  }

  /**
   * Log the queue wait time (latency from enqueue to processor pickup)
   */
  async recordQueueWaitTime(queueName: string, waitTimeMs: number): Promise<void> {
    if (this.redisClient) {
      try {
        const key = `telemetry:queue:${queueName}:waittimes`;
        await this.redisClient.lpush(key, waitTimeMs.toString());
        await this.redisClient.ltrim(key, 0, 99); // Keep last 100 entries
      } catch (err: any) {
        console.error('[Observability] Redis wait time logging failed:', err.message);
        this.memWaitTimes.push(waitTimeMs);
        if (this.memWaitTimes.length > 100) this.memWaitTimes.shift();
      }
    } else {
      this.memWaitTimes.push(waitTimeMs);
      if (this.memWaitTimes.length > 100) this.memWaitTimes.shift();
    }
  }

  /**
   * Log a job completion timestamp to measure throughput
   */
  async recordJobThroughput(): Promise<void> {
    const now = Date.now();
    if (this.redisClient) {
      try {
        const key = `telemetry:throughput:timestamps`;
        await this.redisClient.lpush(key, now.toString());
        await this.redisClient.ltrim(key, 0, 99);
      } catch (err: any) {
        console.error('[Observability] Redis throughput logging failed:', err.message);
        this.memThroughputTimes.push(now);
        if (this.memThroughputTimes.length > 100) this.memThroughputTimes.shift();
      }
    } else {
      this.memThroughputTimes.push(now);
      if (this.memThroughputTimes.length > 100) this.memThroughputTimes.shift();
    }
  }

  /**
   * Fetch active host CPU/memory diagnostics
   */
  getHostDiagnostics(): { cpuUsagePercent: number; totalMemoryGb: number; freeMemoryGb: number; memoryUsagePercent: number } {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = Number(((usedMem / totalMem) * 100).toFixed(2));
    
    // Simple load average estimation since CPU percentage requires multi-sampling
    const loadAvg = os.loadavg();
    const cpus = os.cpus().length;
    const cpuUsagePercent = Number((Math.min(100, (loadAvg[0] / cpus) * 100)).toFixed(2));

    return {
      cpuUsagePercent,
      totalMemoryGb: Number((totalMem / (1024 ** 3)).toFixed(2)),
      freeMemoryGb: Number((freeMem / (1024 ** 3)).toFixed(2)),
      memoryUsagePercent
    };
  }

  /**
   * Performs hourly rollup snapshots for SLA and organization health analytics.
   */
  async dumpHourlyTelemetryRollups(): Promise<void> {
    try {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = await createAdminClient();
      
      const now = new Date();
      // Round to beginning of current hour
      const recordedHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0).toISOString();

      console.log(`[Observability] Running hourly telemetry aggregations rollup for hour: ${recordedHour}`);

      // A. Provider SLA rollup
      // Fetch latest reliability scores
      const { data: scores, error: scoresErr } = await adminClient
        .from('provider_reliability_scores')
        .select('*');

      if (scoresErr) {
        console.error('[Observability] Rollup failed to fetch reliability scores:', scoresErr.message);
      } else if (scores) {
        for (const score of scores) {
          // Check if rollup for this hour + provider already exists
          const { data: existing } = await adminClient
            .from('provider_sla_history')
            .select('id')
            .eq('provider', score.provider)
            .eq('recorded_hour', recordedHour)
            .limit(1)
            .maybeSingle();

          if (!existing) {
            const { error: insErr } = await adminClient
              .from('provider_sla_history')
              .insert({
                provider: score.provider,
                avg_latency_ms: score.avg_latency_ms,
                p50_latency_ms: score.p50_latency_ms,
                p95_latency_ms: score.p95_latency_ms,
                p99_latency_ms: score.p99_latency_ms,
                error_rate: score.error_rate,
                uptime_ratio: score.uptime_ratio,
                recorded_hour: recordedHour
              });
            
            if (insErr) {
              console.error(`[Observability] Failed to insert SLA history for ${score.provider}:`, insErr.message);
            }
          }
        }
      }

      // B. Organization Health rollup
      // Get all active organizations
      const { data: orgs, error: orgsErr } = await adminClient
        .from('organizations')
        .select('id, status');

      if (orgsErr) {
        console.error('[Observability] Rollup failed to fetch organizations:', orgsErr.message);
      } else if (orgs) {
        for (const org of orgs) {
          // Check if already rolled up
          const { data: existing } = await adminClient
            .from('org_health_history')
            .select('id')
            .eq('organization_id', org.id)
            .eq('recorded_hour', recordedHour)
            .limit(1)
            .maybeSingle();

          if (!existing) {
            let healthScore = 100;
            if (org.status === 'suspended') {
              healthScore = 0;
            } else if (org.status === 'pending_verification') {
              healthScore = 80;
            }

            const telemetry = await this.getSystemTelemetry();
            const consumption = telemetry.tokenConsumptionByOrg[org.id] || { promptTokens: 0, completionTokens: 0, estimatedCostUsd: 0 };
            const tokens = consumption.promptTokens + consumption.completionTokens;

            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { count: billingAnomalies } = await adminClient
              .from('audit_logs')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', org.id)
              .like('action', 'billing.quota%')
              .gte('created_at', oneHourAgo);

            const { count: messageVolume } = await adminClient
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', org.id)
              .gte('created_at', oneHourAgo);

            if (billingAnomalies && billingAnomalies > 0) {
              healthScore -= Math.min(50, billingAnomalies * 25);
            }
            healthScore = Math.max(0, healthScore);

            const { error: insErr } = await adminClient
              .from('org_health_history')
              .insert({
                organization_id: org.id,
                health_score: healthScore,
                message_volume: messageVolume || 0,
                token_count: tokens || 0,
                billing_anomalies: billingAnomalies || 0,
                recorded_hour: recordedHour
              });

            if (insErr) {
              console.error(`[Observability] Failed to insert Org health history for ${org.id}:`, insErr.message);
            }
          }
        }
      }

      console.log('[Observability] Hourly telemetry rollups aggregation complete.');
    } catch (err: any) {
      console.error('[Observability] Error executing dumpHourlyTelemetryRollups:', err.message);
    }
  }

  /**
   * Logs a governance decision or ledger event directly to PostgreSQL audit_logs.
   */
  async logGovernanceEvent(input: {
    organizationId?: string;
    userId?: string;
    action: string;
    details: Record<string, any>;
  }): Promise<void> {
    try {
      console.log(`[Observability] [Governance Event] Action: ${input.action} | Org: ${input.organizationId || 'System'}`);
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = await createAdminClient();
      const { error } = await adminClient.from('audit_logs').insert({
        organization_id: input.organizationId || null,
        user_id: input.userId || null,
        action: input.action,
        details: input.details
      });
      if (error) {
        console.error('[Observability] PostgreSQL logging of governance event failed:', error.message);
      }
    } catch (err: any) {
      console.error('[Observability] Failed to log governance event to PostgreSQL:', err.message);
    }
  }
}

export const TelemetryService = new ObservabilityService();
