/**
 * Oye AI: Autonomous Governance Engine
 * File Location: c:\Users\hartm\oye-ai\src\lib\services\autonomous-governance.ts
 * 
 * Provides unified platform autonomous governance, self-healing, self-routing,
 * self-monitoring, and financial anomaly protection. Implements hybrid scoring
 * model, SLA re-routing with quarantines, and backpressure campaign throttling.
 */

import { generateAICompletionWithFailover } from './ai';
import { createAdminClient } from '@/lib/supabase/server';
import { TelemetryService } from './observability';
import dns from 'dns';
import IORedis from 'ioredis';

export interface OnboardingRiskResult {
  score: number; // 0 - 100 (high score = high trust)
  autoActivate: boolean;
  throttledBeta: boolean;
  suspended: boolean;
  confidence: number;
  signals: {
    disposableEmail: boolean;
    hasMxRecord: boolean;
    highRiskRegion: boolean;
    velocityAnomaly: boolean;
    suspiciousFastSignup: boolean;
    stripeVerified: boolean;
    premiumDomain: boolean;
  };
  aiJustification: string;
  modelUsed: string;
}

export interface SlaBalancerState {
  activeProvider: string;
  quarantinedProviders: string[];
  cooldownUntil: Record<string, number>;
  failoversCount: number;
  lastEvaluation: number;
}

// Memory/Redis State Cache for SLA rerouting
let redisClient: IORedis | null = null;
const redisUrl = process.env.REDIS_URL;
if (redisUrl && !redisUrl.includes('placeholder')) {
  try {
    redisClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
  } catch (err: any) {
    console.warn('[Governance] Redis initialization failed. Using in-memory fallback.', err.message);
  }
}

// In-Memory fallback state
let localSlaState: SlaBalancerState = {
  activeProvider: 'langdock',
  quarantinedProviders: [],
  cooldownUntil: {},
  failoversCount: 0,
  lastEvaluation: 0,
};

export class AutonomousGovernanceServiceClass {
  private disposableDomains = new Set([
    'mailinator.com', 'yopmail.com', 'tempmail.com', 'temp-mail.org', 
    'sharklasers.com', 'guerrillamail.com', 'dispostable.com', '10minutemail.com'
  ]);

  private highRiskRegions = new Set([
    'KP', 'IR', 'SY', 'CU', 'SD' // standard high-risk sanctioned regions
  ]);

  /**
   * Evaluates onboarding risk for a new organization.
   * Leverages a hybrid approach using deterministic signals + AI interpretation.
   */
  async evaluateOnboardingRisk(
    orgId: string,
    email: string,
    regionCode = 'US',
    signupDurationSec = 5,
    traceId: string
  ): Promise<OnboardingRiskResult> {
    console.log(`[Governance] [Trace: ${traceId}] Evaluating onboarding risk for org: ${orgId}, email: ${email}`);
    const adminClient = await createAdminClient();

    // 1. DETERMINISTIC SIGNALS
    const emailDomain = email.split('@')[1]?.toLowerCase() || '';
    const disposableEmail = this.disposableDomains.has(emailDomain);
    const highRiskRegion = this.highRiskRegions.has(regionCode.toUpperCase());
    const suspiciousFastSignup = signupDurationSec < 3; // bot detection: under 3 seconds to register

    // Verify MX Record
    let hasMxRecord = true;
    if (emailDomain && emailDomain !== 'localhost' && !emailDomain.includes('.local')) {
      try {
        const mxRecords = await dns.promises.resolveMx(emailDomain);
        hasMxRecord = mxRecords && mxRecords.length > 0;
      } catch (err) {
        console.warn(`[Governance] DNS MX check failed for ${emailDomain}, assuming false fallback.`);
        hasMxRecord = false;
      }
    }

    // Stripe Verification State Check
    const { data: subscription } = await adminClient
      .from('subscriptions')
      .select('status')
      .eq('organization_id', orgId)
      .limit(1)
      .single();
    
    const stripeVerified = subscription?.status === 'active' || subscription?.status === 'trialing';

    // Velocity Anomaly Check (same domain registrations in last 24h)
    let velocityAnomaly = false;
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await adminClient
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('settings->>signup_domain', emailDomain)
        .gte('created_at', twentyFourHoursAgo);
      
      if (count && count > 3) {
        velocityAnomaly = true;
      }
    } catch {}

    const premiumDomain = !disposableEmail && hasMxRecord && emailDomain !== 'gmail.com' && emailDomain !== 'yahoo.com' && emailDomain !== 'hotmail.com';

    // 2. SCORING MATRIX
    let trustScore = 75; // Starting base score

    if (disposableEmail) trustScore -= 50;
    if (!hasMxRecord) trustScore -= 20;
    if (highRiskRegion) trustScore -= 30;
    if (velocityAnomaly) trustScore -= 20;
    if (suspiciousFastSignup) trustScore -= 25;
    if (stripeVerified) trustScore += 20;
    if (premiumDomain) trustScore += 10;

    // Constrain score between 0 and 100
    trustScore = Math.max(0, Math.min(100, trustScore));

    // 3. AI INTERPRETATION LAYER
    let aiJustification = '';
    let modelUsed = 'langdock';
    
    const prompt = `
      You are the Oye AI Platform Security & Autonomous Onboarding Supervisor.
      Analyze the onboarding risk metadata for a new tenant register request:
      - Email Domain: ${emailDomain}
      - Trust Score Calculation: ${trustScore}/100
      - Disposable Email Flag: ${disposableEmail}
      - Has MX Record: ${hasMxRecord}
      - High-Risk Region Code: ${regionCode} (High Risk Flag: ${highRiskRegion})
      - Suspicious Fast Bot Signup Flag: ${suspiciousFastSignup}
      - Stripe Payment Method Bound: ${stripeVerified}
      - Velocity Anomaly Detected: ${velocityAnomaly}

      Provide a concise 2-sentence risk assessment explanation.
      Specifically state if you approve auto-activation or suggest holding the account.
    `;

    try {
      const response = await generateAICompletionWithFailover(
        [{ role: 'user', content: prompt }],
        'langdock',
        'gpt-4o-mini',
        0.3,
        traceId,
        orgId
      );
      aiJustification = response.text.trim();
      modelUsed = response.usedProvider;
    } catch (err: any) {
      console.warn('[Governance] AI risk interpretation call failed. Using deterministic fallback explanation.', err.message);
      aiJustification = `Deterministic score computed at ${trustScore}/100. Signals processed successfully. MX records verified: ${hasMxRecord}.`;
    }

    // 4. ACTION ENFORCEMENT RULES
    // Score >= 85 -> Auto-activate
    // Score between 60 and 84 -> Throttled Beta activation
    // Score < 60 -> Suspended / Manual Escalation
    const autoActivate = trustScore >= 85;
    const throttledBeta = trustScore >= 60 && trustScore < 85;
    const suspended = trustScore < 60;

    let targetStatus: 'active' | 'beta_approved' | 'suspended' = 'suspended';
    if (autoActivate) targetStatus = 'active';
    else if (throttledBeta) targetStatus = 'beta_approved';

    // Apply the lifecycle updates in the database
    try {
      await adminClient
        .from('organizations')
        .update({ status: targetStatus })
        .eq('id', orgId);
      
      console.log(`[Governance] Autonomously set Organization ${orgId} status to: ${targetStatus}`);
    } catch (dbErr: any) {
      console.error('[Governance] DB state update failed:', dbErr.message);
    }

    const signals = {
      disposableEmail,
      hasMxRecord,
      highRiskRegion,
      velocityAnomaly,
      suspiciousFastSignup,
      stripeVerified,
      premiumDomain,
    };

    // 5. GOVERNANCE AUDIT LOGGING
    try {
      await adminClient.from('audit_logs').insert({
        organization_id: orgId,
        action: 'security.autonomous_onboarding_evaluation',
        details: {
          score: trustScore,
          targetStatus,
          signals,
          aiJustification,
          modelUsed,
          traceId,
          timestamp: new Date().toISOString(),
        }
      });
      console.log('[Governance] Audit log entry created successfully.');
    } catch (auditErr: any) {
      console.error('[Governance] Logging audit event failed:', auditErr.message);
    }

    return {
      score: trustScore,
      autoActivate,
      throttledBeta,
      suspended,
      confidence: trustScore / 100,
      signals,
      aiJustification,
      modelUsed,
    };
  }

  /**
   * Bounded SLA Route Balancer
   * Periodically scans reliability scores and quarantine list to re-route LLM requests.
   */
  async rebalanceSlaRouting(traceId: string): Promise<string> {
    console.log(`[Governance] [Trace: ${traceId}] Running SLA Route Balancer Diagnostics...`);
    const adminClient = await createAdminClient();

    // Recover SLA state from Redis or local memory fallback
    let state = localSlaState;
    if (redisClient) {
      try {
        const cached = await redisClient.get('governance:sla:state');
        if (cached) {
          state = JSON.parse(cached);
        }
      } catch {}
    }

    // Rate-limit re-routing evaluations to once every 60 seconds (cooldown)
    const now = Date.now();
    if (now - state.lastEvaluation < 60000) {
      console.log(`[Governance] Route balancer within cooldown interval. Current active provider: ${state.activeProvider}`);
      return state.activeProvider;
    }

    // Fetch provider scores from the DB
    const { data: scores, error } = await adminClient
      .from('provider_reliability_scores')
      .select('*');

    if (error || !scores) {
      console.error('[Governance] Error fetching provider scores for re-routing balancer:', error?.message);
      return state.activeProvider;
    }

    let updated = false;
    const nowSec = Math.floor(now / 1000);

    // 1. Quarantine Evaluation (Release past quarantines if quarantine period has elapsed)
    const activeQuarantines: string[] = [];
    for (const provider of state.quarantinedProviders) {
      const cooldown = state.cooldownUntil[provider] || 0;
      if (nowSec >= cooldown) {
        console.log(`[Governance] Releasing provider ${provider} from quarantine.`);
        delete state.cooldownUntil[provider];
        updated = true;

        // Update database provider_quarantines to mark restored
        try {
          await adminClient
            .from('provider_quarantines')
            .update({ restored_at: new Date().toISOString() })
            .eq('provider', provider)
            .is('restored_at', null);
          console.log(`[Governance] Updated provider quarantine status for ${provider} as restored in DB.`);
        } catch (dbErr: any) {
          console.warn(`[Governance] Failed to update provider quarantine restoration:`, dbErr.message);
        }
      } else {
        activeQuarantines.push(provider);
      }
    }
    state.quarantinedProviders = activeQuarantines;

    // 2. Identify Degraded Providers and Quarantine Them
    // Rules: Error rate > 15% OR p95 latency > 2500ms
    for (const row of scores) {
      const provider = row.provider;
      if (state.quarantinedProviders.includes(provider)) continue;

      const isDegraded = Number(row.error_rate) > 15.0 || row.p95_latency_ms > 2500;
      if (isDegraded) {
        console.warn(`[Governance] Provider ${provider} degraded (Error: ${row.error_rate}%, p95: ${row.p95_latency_ms}ms). Quarantining for 5 minutes.`);
        const quarantineUntilTime = new Date(now + 300 * 1000).toISOString();
        state.quarantinedProviders.push(provider);
        state.cooldownUntil[provider] = nowSec + 300; // 5-minute quarantine window
        state.failoversCount += 1;
        updated = true;

        // Persist to provider_quarantines table
        try {
          await adminClient.from('provider_quarantines').insert({
            provider,
            quarantined_at: new Date().toISOString(),
            quarantine_until: quarantineUntilTime,
            reason: `Error rate is ${row.error_rate}% and p95 latency is ${row.p95_latency_ms}ms (exceeded SLA thresholds)`,
            reroute_count: state.failoversCount,
            sla_breach_ms: Math.round(row.p95_latency_ms),
            trace_id: traceId,
          });
          console.log(`[Governance] Persisted provider quarantine for ${provider} in DB.`);
        } catch (dbErr: any) {
          console.warn(`[Governance] Failed to persist provider quarantine:`, dbErr.message);
        }

        // Log self-healing routing audit event
        try {
          await adminClient.from('audit_logs').insert({
            organization_id: '88888888-8888-8888-8888-888888888888',
            action: 'infrastructure.provider_quarantined',
            details: {
              provider,
              error_rate: row.error_rate,
              p95_latency_ms: row.p95_latency_ms,
              uptime_ratio: row.uptime_ratio,
              traceId,
            }
          });
        } catch {}
      }
    }

    // 3. Select Best Healthy Provider
    const fallbackPriority = ['langdock', 'openai', 'anthropic', 'gemini'];
    let bestProvider = 'langdock';

    for (const p of fallbackPriority) {
      if (!state.quarantinedProviders.includes(p)) {
        bestProvider = p;
        break;
      }
    }

    if (state.activeProvider !== bestProvider) {
      console.log(`[Governance] SLA Balancer Rerouted traffic from ${state.activeProvider} -> ${bestProvider}`);
      state.activeProvider = bestProvider;
      updated = true;

      // Log self-healing routing change
      try {
        await adminClient.from('audit_logs').insert({
          organization_id: '88888888-8888-8888-8888-888888888888',
          action: 'infrastructure.sla_reroute_triggered',
          details: {
            new_active_provider: bestProvider,
            quarantined: state.quarantinedProviders,
            traceId,
          }
        });
      } catch {}
    }

    state.lastEvaluation = now;

    // Persist State
    localSlaState = state;
    if (redisClient) {
      try {
        await redisClient.set('governance:sla:state', JSON.stringify(state));
      } catch {}
    }

    return state.activeProvider;
  }

  /**
   * SRE Queue Backpressure Monitor
   * Detects queue saturation and throttles campaigns or workloads gracefully.
   */
  async checkQueueSaturationThrottling(queueDepth: number, _traceId: string): Promise<{ throttleActive: boolean; message: string }> {
    if (queueDepth > 100) {
      console.warn(`[Governance] Backpressure engaged! Queue depth is ${queueDepth}. Throttling campaign workloads.`);
      return {
        throttleActive: true,
        message: `High backpressure detected (${queueDepth} jobs). Throttling campaign dispatches.`,
      };
    }
    return {
      throttleActive: false,
      message: 'Queue pressures are normal.',
    };
  }

  /**
   * Financial & Resource Abuse Protection Agent
   * Monitors consumption velocity spikes for specific organizations.
   */
  async evaluateQuotaAnomalies(
    orgId: string,
    messageSpike: number,
    tokenSpike: number
  ): Promise<{ anomalyDetected: boolean; action: 'none' | 'throttle' | 'soft_suspend' }> {
    // Detect message velocity (> 100/minute) or token velocity (> 100K/minute)
    if (messageSpike > 100 || tokenSpike > 100000) {
      console.warn(`[Governance] Quota anomaly detected in Org ${orgId}! Messages: ${messageSpike}, Tokens: ${tokenSpike}`);
      
      // If critical, trigger soft suspension
      if (messageSpike > 250) {
        return { anomalyDetected: true, action: 'soft_suspend' };
      }
      return { anomalyDetected: true, action: 'throttle' };
    }

    return { anomalyDetected: false, action: 'none' };
  }
}

export const GovernanceService = new AutonomousGovernanceServiceClass();
