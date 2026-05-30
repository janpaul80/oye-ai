import './setup-env';
/**
 * Oye AI: Standalone Background Job Worker Runtime
 * File Location: c:\Users\hartm\oye-ai\scripts\worker.ts
 */

import { QueueService, QueueJob, QueueJobResult } from '../src/lib/services/queue';
import { handleAiReply } from '../src/lib/services/ai';
import { sendWhatsAppMessage } from '../src/lib/services/whatsapp';

console.log('[Worker Runtime] Booting background job processor execution node...');

if (process.env.ENABLE_BULLMQ !== 'true') {
  console.warn('[Worker Runtime] Warning: ENABLE_BULLMQ is not set to true. Worker running in fallback in-memory mode.');
}

// ==========================================
// 1. Register Queue Worker Processors
// ==========================================

// Register incoming messages and AI inference worker
QueueService.registerWorker('incoming_messages', async (job: QueueJob): Promise<QueueJobResult> => {
  const startTime = Date.now();
  console.log(`[Worker Processor] Processing incoming message job ${job.id} | Action: ${job.action}`);

  try {
    if (job.action === 'ai.cascade_inference') {
      const { orgId, conversationId, latestMessageBody, fromPhone } = job.payload;
      await handleAiReply(orgId, conversationId, latestMessageBody, fromPhone, job.traceId);
      return { success: true, durationMs: Date.now() - startTime };
    }
    return { success: false, durationMs: Date.now() - startTime, error: `Unsupported job action: ${job.action}` };
  } catch (err: any) {
    return { success: false, durationMs: Date.now() - startTime, error: err.message };
  }
});

// Register outbound dispatches worker
QueueService.registerWorker('outbound_dispatches', async (job: QueueJob): Promise<QueueJobResult> => {
  const startTime = Date.now();
  console.log(`[Worker Processor] Processing outbound WhatsApp dispatch job ${job.id} | Action: ${job.action}`);

  try {
    if (job.action === 'whatsapp.outbound_dispatch') {
      const orgId = job.organizationId;
      const { createAdminClient } = await import('../src/lib/supabase/server');
      const adminClient = await createAdminClient();
      const { data: org } = await adminClient
        .from('organizations')
        .select('status')
        .eq('id', orgId)
        .single();

      const isApproved = org && (org.status === 'active' || org.status === 'beta_approved');
      if (!isApproved) {
        console.warn(`[Worker Processor] Blocked outbound dispatch for non-approved organization ${orgId} (Status: ${org?.status})`);
        return { success: false, durationMs: Date.now() - startTime, error: `Organization not approved (Status: ${org?.status})` };
      }

      const { toPhone } = job.payload;
      const body = job.payload.body || job.payload.text;
      const res = await sendWhatsAppMessage(
        toPhone,
        body,
        undefined,
        undefined,
        job.organizationId,
        job.payload.conversationId
      );
      if (res.success) {
        return { success: true, durationMs: Date.now() - startTime, messageId: res.messageId };
      } else {
        return { success: false, durationMs: Date.now() - startTime, error: res.error || 'WhatsApp gateway failure' };
      }
    }
    return { success: false, durationMs: Date.now() - startTime, error: `Unsupported job action: ${job.action}` };
  } catch (err: any) {
    return { success: false, durationMs: Date.now() - startTime, error: err.message };
  }
});

// Keep process active and print heartbeats
setInterval(async () => {
  const health = await QueueService.checkHealth();
  console.log(`[Worker Heartbeat] Queue Health: ${health.status.toUpperCase()} | Active jobs: ${health.activeJobs}`);
}, 30000);

console.log('[Worker Runtime] Background workers successfully initialized.');
