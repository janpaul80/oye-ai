/**
 * Oye AI: Queue & Background Worker Architecture Scaffolding
 * File Location: c:\Users\hartm\oye-ai\src\lib\services\queue.ts
 * 
 * Provides standard type definitions, generic job formats, and a unified queue manager 
 * interface that supports both high-performance Redis/BullMQ and local V8 async in-memory processors.
 */

import { TelemetryService } from './observability';

// ==========================================
// 1. Core Types & Job Definitions
// ==========================================

export type QueueName = 'incoming_messages' | 'outbound_dispatches' | 'scheduled_campaigns' | 'system_cleanup';

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'dead_letter';

/**
 * Supported Queue Job Action Types
 */
export type QueueJobAction = 
  | 'whatsapp.inbound_process'
  | 'whatsapp.outbound_dispatch'
  | 'stripe.subscription_sync'
  | 'ai.cascade_inference'
  | 'campaign.bulk_notify'
  | 'system.purge_logs';

/**
 * Generic Envelope representing a Job running inside the decoupled architecture.
 */
export interface QueueJob<TPayload = any> {
  id: string;
  queueName: QueueName;
  action: QueueJobAction;
  payload: TPayload;
  traceId: string;
  organizationId: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  scheduledFor?: string; // ISO string for delayed retries
}

/**
 * Output results returned from Queue Worker executions.
 */
export interface QueueJobResult {
  success: boolean;
  durationMs: number;
  messageId?: string;
  error?: string;
  failoverEngaged?: boolean;
}

/**
 * Schema defining the Dead-Letter Queue (DLQ) diagnostic entry
 */
export interface DLQDiagnosticEntry {
  id: string;
  jobId: string;
  queueName: QueueName;
  action: QueueJobAction;
  organizationId: string;
  exhaustedAt: string;
  payload: any;
  lastError: string;
  errorLogs: Array<{
    timestamp: string;
    attempt: number;
    error: string;
  }>;
}

// ==========================================
// 2. Worker Core Contract Interface
// ==========================================

export type JobProcessor<TPayload = any> = (job: QueueJob<TPayload>) => Promise<QueueJobResult>;

// ==========================================
// 3. Unified Queue Service Interface
// ==========================================

export interface IQueueService {
  /**
   * Add a type-safe job to the specified queue.
   */
  addJob<TPayload>(
    queue: QueueName,
    action: QueueJobAction,
    payload: TPayload,
    options?: {
      delayMs?: number;
      maxRetries?: number;
      organizationId?: string;
      traceId?: string;
    }
  ): Promise<string>;

  /**
   * Bind a worker thread processor to execute jobs from a queue.
   */
  registerWorker(queue: QueueName, processor: JobProcessor): void;

  /**
   * Check connection status of the underlying queue host database (Redis).
   */
  checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; activeJobs: number }>;
}

// Durable persistence helper to write dead-letter jobs transaction-safely to public.dead_letter_queue
async function persistToDurableDLQ(job: QueueJob, errorMsg: string) {
  try {
    const { createAdminClient } = await import('../supabase/server');
    const supabase = await createAdminClient();
    
    // Extract conversation ID if present and is a UUID
    let conversationId: string | null = null;
    if (job.payload?.conversationId && typeof job.payload.conversationId === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(job.payload.conversationId)) {
        conversationId = job.payload.conversationId;
      }
    }
    
    // Ensure organization ID is a valid UUID
    let organizationId = job.organizationId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
      organizationId = '88888888-8888-8888-8888-888888888888';
    }

    const insertData = {
      organization_id: organizationId,
      conversation_id: conversationId,
      queue_name: job.queueName,
      job_id: job.id,
      action: job.action,
      payload: job.payload,
      error_message: errorMsg,
      retry_count: job.retryCount,
      status: 'pending'
    };

    const { error } = await supabase
      .from('dead_letter_queue')
      .insert(insertData);

    if (error) {
      if (error.code === '23503') {
        await supabase.from('dead_letter_queue').insert({
          ...insertData,
          conversation_id: null
        });
      } else {
        throw error;
      }
    }
    console.log(`[DLQ Durability] Successfully persisted failed job ${job.id} to DB dead_letter_queue`);
  } catch (err: any) {
    console.error(`[DLQ Durability] Database persistence failed for job ${job.id}:`, err.message);
  }
}

// ==========================================
// 4. In-Memory Mock Queue Processor (Staging / Fallback Mode)
// ==========================================

export class InMemoryQueueService implements IQueueService {
  private workers: Map<QueueName, JobProcessor> = new Map();
  private activeJobsCount = 0;

  async addJob<TPayload>(
    queue: QueueName,
    action: QueueJobAction,
    payload: TPayload,
    options?: { delayMs?: number; maxRetries?: number; organizationId?: string; traceId?: string }
  ): Promise<string> {
    const jobId = `mock_job_${Math.random().toString(36).substr(2, 9)}`;
    const traceId = options?.traceId || `trace_${Math.random().toString(36).substr(2, 9)}`;
    const organizationId = options?.organizationId || 'system';

    const job: QueueJob<TPayload> = {
      id: jobId,
      queueName: queue,
      action,
      payload,
      traceId,
      organizationId,
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 3,
      createdAt: new Date().toISOString()
    };

    console.log(`[Mock Queue] Enqueued job ${jobId} under [${queue}] | Action: ${action} | Delay: ${options?.delayMs || 0}ms`);

    // Async execution to simulate background processing
    const delay = options?.delayMs || 0;
    setTimeout(() => {
      this.executeJob(job);
    }, delay);

    return jobId;
  }

  private async executeJob(job: QueueJob): Promise<void> {
    const processor = this.workers.get(job.queueName);
    if (!processor) {
      console.warn(`[Mock Queue] No registered worker for queue: ${job.queueName}. Job ${job.id} skipped.`);
      return;
    }

    this.activeJobsCount++;
    const startTime = Date.now();

    try {
      // Record queue wait time when the job starts processing
      const waitTimeMs = Date.now() - new Date(job.createdAt).getTime();
      await TelemetryService.recordQueueWaitTime(job.queueName, waitTimeMs);

      console.log(`[Mock Worker] Starting processing of job ${job.id} (${job.action})`);
      const result = await processor(job);
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`[Mock Worker] Successfully executed job ${job.id} | Duration: ${duration}ms`);
        // Record throughput on success
        await TelemetryService.recordJobThroughput();
      } else {
        throw new Error(result.error || 'Execution failure');
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      job.retryCount++;
      console.error(`[Mock Worker] Error processing job ${job.id} on attempt ${job.retryCount}/${job.maxRetries}: ${err.message}`);

      if (job.retryCount < job.maxRetries) {
        // Schedule delayed retry
        const retryDelay = 2000 * Math.pow(2, job.retryCount); // Exponential backoff retry
        console.log(`[Mock Worker] Rescheduling job ${job.id} with delay of ${retryDelay}ms`);
        setTimeout(() => this.executeJob(job), retryDelay);
      } else {
        // Move to DLQ (simulate)
        console.error(`[Mock Worker] Job ${job.id} exhausted all attempts. ROUTING TO DEAD-LETTER QUEUE (DLQ) 🟥`);
        this.routeToDLQ(job, err.message);
      }
    } finally {
      this.activeJobsCount--;
    }
  }

  private routeToDLQ(job: QueueJob, errorMsg: string): void {
    const dlqEntry: DLQDiagnosticEntry = {
      id: `dlq_${Math.random().toString(36).substr(2, 9)}`,
      jobId: job.id,
      queueName: job.queueName,
      action: job.action,
      organizationId: job.organizationId,
      exhaustedAt: new Date().toISOString(),
      payload: job.payload,
      lastError: errorMsg,
      errorLogs: [
        {
          timestamp: new Date().toISOString(),
          attempt: job.retryCount,
          error: errorMsg
        }
      ]
    };
    console.error(`[DLQ Manager] Saved diagnostic trace for job ${job.id}:`, JSON.stringify(dlqEntry, null, 2));
    persistToDurableDLQ(job, errorMsg);
  }

  registerWorker(queue: QueueName, processor: JobProcessor): void {
    let completedCount = 0;
    const workerId = `${queue}_inmemory_${Math.random().toString(36).substr(2, 9)}`;
    
    // Register heartbeat immediately
    TelemetryService.registerWorkerHeartbeat(workerId, queue, completedCount).catch(() => {});
    
    // Set 30s heartbeat loop
    const interval = setInterval(() => {
      TelemetryService.registerWorkerHeartbeat(workerId, queue, completedCount).catch(() => {});
    }, 30000);
    
    // Unref interval to allow process to exit cleanly if needed
    if (interval.unref) interval.unref();

    this.workers.set(queue, async (job) => {
      const res = await processor(job);
      if (res.success) {
        completedCount++;
      }
      return res;
    });
    console.log(`[Mock Queue] Registered background processor for queue: [${queue}] | Worker ID: ${workerId}`);
  }

  async checkHealth(): Promise<{ status: 'healthy'; activeJobs: number }> {
    return { status: 'healthy', activeJobs: this.activeJobsCount };
  }
}

// ==========================================
// 4.5 BullMQ Production-Ready Queue Service
// ==========================================

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export class BullMQQueueService implements IQueueService {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private redisConnection: IORedis | null = null;

  constructor() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      this.redisConnection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      });
      console.log(`[BullMQ Queue] Initialized with connection: ${redisUrl}`);
    } catch (err: any) {
      console.error('[BullMQ Queue] Connection initialization failed:', err.message);
    }
  }

  async addJob<TPayload>(
    queue: QueueName,
    action: QueueJobAction,
    payload: TPayload,
    options?: {
      delayMs?: number;
      maxRetries?: number;
      organizationId?: string;
      traceId?: string;
    }
  ): Promise<string> {
    if (!this.redisConnection) {
      throw new Error('[BullMQ Queue] Redis connection is unavailable.');
    }

    const jobId = `job_${Math.random().toString(36).substr(2, 9)}`;
    const traceId = options?.traceId || `trace_${Math.random().toString(36).substr(2, 9)}`;
    const organizationId = options?.organizationId || 'system';

    const jobData: QueueJob<TPayload> = {
      id: jobId,
      queueName: queue,
      action,
      payload,
      traceId,
      organizationId,
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 3,
      createdAt: new Date().toISOString(),
      scheduledFor: options?.delayMs ? new Date(Date.now() + options.delayMs).toISOString() : undefined
    };

    let targetQueue = this.queues.get(queue);
    if (!targetQueue) {
      targetQueue = new Queue(queue, {
        connection: this.redisConnection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false
        }
      });
      this.queues.set(queue, targetQueue);
    }

    const delay = options?.delayMs || 0;
    const maxAttempts = (options?.maxRetries ?? 3) + 1;

    console.log(`[BullMQ Queue] Enqueued job ${jobId} under [${queue}] | Action: ${action} | Delay: ${delay}ms`);

    const bullJob = await targetQueue.add(action, jobData, {
      jobId,
      delay,
      attempts: maxAttempts,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return bullJob.id || jobId;
  }

  registerWorker(queue: QueueName, processor: JobProcessor): void {
    if (!this.redisConnection) {
      console.error('[BullMQ Worker] Cannot register worker. Redis connection is unavailable.');
      return;
    }

    if (this.workers.has(queue)) {
      console.warn(`[BullMQ Worker] Worker for queue: ${queue} already registered.`);
      return;
    }

    let concurrency = 5;
    if (queue === 'incoming_messages') {
      concurrency = Number(process.env.WORKER_CONCURRENCY_INCOMING || 5);
    } else if (queue === 'outbound_dispatches') {
      concurrency = Number(process.env.WORKER_CONCURRENCY_OUTBOUND || 5);
    } else if (queue === 'scheduled_campaigns') {
      concurrency = Number(process.env.WORKER_CONCURRENCY_CAMPAIGNS || 2);
    }

    let completedCount = 0;
    const workerId = `${queue}_bullmq_${Math.random().toString(36).substr(2, 9)}`;

    // Register heartbeat immediately
    TelemetryService.registerWorkerHeartbeat(workerId, queue, completedCount).catch(() => {});

    // Set 30s heartbeat loop
    const interval = setInterval(() => {
      TelemetryService.registerWorkerHeartbeat(workerId, queue, completedCount).catch(() => {});
    }, 30000);

    // Unref interval
    if (interval.unref) interval.unref();

    const worker = new Worker(
      queue,
      async (bullJob) => {
        const job: QueueJob = bullJob.data;
        job.retryCount = bullJob.attemptsMade || 0;

        console.log(`[BullMQ Worker] Starting processing of job ${bullJob.id} (${job.action}) [Attempt ${job.retryCount + 1}/${job.maxRetries}]`);
        const startTime = Date.now();

        try {
          // Record queue wait time when the job starts processing
          const waitTimeMs = Date.now() - new Date(job.createdAt).getTime();
          await TelemetryService.recordQueueWaitTime(job.queueName, waitTimeMs);

          const result = await processor(job);
          const duration = Date.now() - startTime;

          if (result.success) {
            console.log(`[BullMQ Worker] Successfully executed job ${bullJob.id} | Duration: ${duration}ms`);
            // Record throughput on success
            await TelemetryService.recordJobThroughput();
            completedCount++;
            return result;
          } else {
            throw new Error(result.error || 'Execution failure');
          }
        } catch (err: any) {
          await TelemetryService.incrementRetries();
          console.error(`[BullMQ Worker] Error processing job ${bullJob.id}: ${err.message}`);
          throw err;
        }
      },
      {
        connection: this.redisConnection,
        concurrency,
        stalledInterval: 15000,
        maxStalledCount: 3
      }
    );

    worker.on('failed', async (bullJob, err) => {
      if (!bullJob) return;
      const job: QueueJob = bullJob.data;
      const maxAttempts = (job.maxRetries ?? 3) + 1;

      if (bullJob.attemptsMade >= maxAttempts) {
        console.error(`[BullMQ Worker] Job ${bullJob.id} exhausted all attempts. ROUTING TO DEAD-LETTER QUEUE (DLQ) 🟥`);
        await TelemetryService.incrementDlq();
        this.routeToDLQ(job, err.message);
      } else {
        await TelemetryService.incrementFailedDispatches();
      }
    });

    this.workers.set(queue, worker);
    console.log(`[BullMQ Worker] Registered background processor for queue: [${queue}] | Concurrency: ${concurrency}`);
  }

  private routeToDLQ(job: QueueJob, errorMsg: string): void {
    const dlqEntry: DLQDiagnosticEntry = {
      id: `dlq_${Math.random().toString(36).substr(2, 9)}`,
      jobId: job.id,
      queueName: job.queueName,
      action: job.action,
      organizationId: job.organizationId,
      exhaustedAt: new Date().toISOString(),
      payload: job.payload,
      lastError: errorMsg,
      errorLogs: [
        {
          timestamp: new Date().toISOString(),
          attempt: job.retryCount,
          error: errorMsg
        }
      ]
    };
    console.error(`[DLQ Manager] Saved diagnostic trace for job ${job.id}:`, JSON.stringify(dlqEntry, null, 2));
    persistToDurableDLQ(job, errorMsg);
  }

  async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; activeJobs: number }> {
    if (!this.redisConnection) {
      return { status: 'unhealthy', activeJobs: 0 };
    }

    try {
      const pingResult = await this.redisConnection.ping();
      if (pingResult !== 'PONG') {
        return { status: 'unhealthy', activeJobs: 0 };
      }

      let activeJobsCount = 0;
      for (const queue of this.queues.values()) {
        const count = await queue.getActiveCount();
        activeJobsCount += count;
      }

      return { status: 'healthy', activeJobs: activeJobsCount };
    } catch {
      return { status: 'unhealthy', activeJobs: 0 };
    }
  }
}

// ==========================================
// 5. Active Queue Service Gateway (Singleton Router)
// ==========================================

class QueueServiceGateway {
  private activeService: IQueueService;

  constructor() {
    if (process.env.ENABLE_BULLMQ === 'true') {
      this.activeService = new BullMQQueueService();
      console.log('[Queue Service] Active driver: BullMQQueueService (Production Mode).');
    } else {
      this.activeService = new InMemoryQueueService();
      console.log('[Queue Service] Active driver: InMemoryQueueService (Staging / Fallback Mode).');
    }
  }

  public getService(): IQueueService {
    return this.activeService;
  }
}

export const QueueService = new QueueServiceGateway().getService();
