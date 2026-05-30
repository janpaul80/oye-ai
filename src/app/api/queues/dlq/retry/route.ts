/**
 * Oye AI: Dead-Letter Queue (DLQ) Replay Routing API
 * File Location: c:\Users\hartm\oye-ai\src\app\api\queues\dlq\retry\route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { QueueService, QueueName, QueueJobAction } from '@/lib/services/queue';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dlqId, payloadOverrides = {}, notes = '' } = body;

    if (!dlqId) {
      return NextResponse.json({ error: 'Missing required parameter: dlqId' }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // 1. Retrieve the dead-letter-queue record by id
    const { data: dlqRecord, error: dlqError } = await adminClient
      .from('dead_letter_queue')
      .select('*')
      .eq('id', dlqId)
      .single();

    if (dlqError || !dlqRecord) {
      console.error('[DLQ Replay API] Failed to fetch DLQ record:', dlqError?.message);
      return NextResponse.json({ error: 'DLQ record not found' }, { status: 404 });
    }

    if (dlqRecord.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot replay a DLQ record that is already in '${dlqRecord.status}' state.` },
        { status: 400 }
      );
    }

    // 2. Perform operator security validation
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      console.warn('[DLQ Replay API] Unauthorized access attempt: no user session');
      return NextResponse.json({ error: 'Unauthorized: Operator session not found' }, { status: 401 });
    }

    // Check platform admin status or verify user has admin/owner permissions in the target organization
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    const isPlatformAdmin = profile?.is_platform_admin || false;

    if (!isPlatformAdmin) {
      const { data: membership, error: membershipErr } = await adminClient
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', dlqRecord.organization_id)
        .single();

      if (membershipErr || !membership || !['owner', 'admin'].includes(membership.role)) {
        console.warn(`[DLQ Replay API] Forbidden: User ${user.id} lacks admin privileges for Org ${dlqRecord.organization_id}`);
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions to replay DLQ jobs' },
          { status: 403 }
        );
      }
    }

    // 3. Prepare final merged payload
    const mergedPayload = {
      ...dlqRecord.payload,
      ...payloadOverrides
    };

    console.log(`[DLQ Replay API] Replaying DLQ record ${dlqId} | Action: ${dlqRecord.action}`);

    // 4. Re-enqueue the job using the unified QueueService
    const traceId = `replay_${user.id.substring(0, 8)}_${Math.random().toString(36).substring(2, 7)}`;
    const newJobId = await QueueService.addJob(
      dlqRecord.queue_name as QueueName,
      dlqRecord.action as QueueJobAction,
      mergedPayload,
      {
        organizationId: dlqRecord.organization_id,
        traceId,
        maxRetries: 3
      }
    );

    // 5. Update DLQ status to 'replayed'
    const { error: updateDlqErr } = await adminClient
      .from('dead_letter_queue')
      .update({
        status: 'replayed',
        replayed_at: new Date().toISOString(),
        replayed_by: user.id,
        notes: notes || 'Replayed by administrator via retry API'
      })
      .eq('id', dlqId);

    if (updateDlqErr) {
      console.error('[DLQ Replay API] Failed to update DLQ record status:', updateDlqErr.message);
      // Non-blocking for the queue replay itself but log it as an error
    }

    // 6. Write timeline event in conversation_events if conversation is referenced
    if (dlqRecord.conversation_id) {
      const { error: eventErr } = await adminClient.from('conversation_events').insert({
        conversation_id: dlqRecord.conversation_id,
        organization_id: dlqRecord.organization_id,
        event_type: 'dlq.replayed',
        payload: {
          dlq_id: dlqId,
          new_job_id: newJobId,
          queue_name: dlqRecord.queue_name,
          action: dlqRecord.action,
          replayed_by: user.id,
          notes: notes || 'Replayed by administrator'
        }
      });
      if (eventErr) {
        console.error('[DLQ Replay API] Failed to write timeline event:', eventErr.message);
      }
    }

    // 7. Write centralized security/operator audit log
    const { error: auditErr } = await adminClient.from('audit_logs').insert({
      organization_id: dlqRecord.organization_id,
      user_id: user.id,
      action: 'dlq_job_replay',
      details: {
        dlq_id: dlqId,
        new_job_id: newJobId,
        queue_name: dlqRecord.queue_name,
        action: dlqRecord.action,
        trace_id: traceId,
        notes
      }
    });
    if (auditErr) {
      console.error('[DLQ Replay API] Failed to write audit log:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Job replayed successfully',
      jobId: newJobId,
      traceId
    });
  } catch (err: any) {
    console.error('[DLQ Replay API] Execution failure:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
