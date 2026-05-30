/**
 * Oye AI: Dead-Letter Queue (DLQ) Search & Administrative API
 * File Location: c:\Users\hartm\oye-ai\src\app\api\queues\dlq\route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * GET /api/queues/dlq
 * Query, search, page, and scope dead letter queue failed items.
 */
export async function GET(request: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Operator session not found' }, { status: 401 });
    }

    const adminClient = await createAdminClient();

    // 1. Fetch user's memberships and admin status to enforce tenant boundaries or platform-wide admin privileges
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    const isPlatformAdmin = profile?.is_platform_admin || false;

    let allowedOrgIds: string[] = [];
    if (!isPlatformAdmin) {
      const { data: memberships, error: membershipErr } = await adminClient
        .from('memberships')
        .select('organization_id, role')
        .eq('user_id', user.id);

      if (membershipErr || !memberships || memberships.length === 0) {
        return NextResponse.json({ error: 'Forbidden: User has no active organization memberships' }, { status: 403 });
      }
      allowedOrgIds = memberships.map((m) => m.organization_id);
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'pending' | 'replayed' | 'ignored'
    const orgId = searchParams.get('organization_id');
    const search = searchParams.get('search');
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.max(1, Number(searchParams.get('limit') || 20));

    // 3. Apply tenant boundaries
    let targetOrgId = orgId;
    if (targetOrgId && !isPlatformAdmin) {
      if (!allowedOrgIds.includes(targetOrgId)) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
      }
    }

    // 4. Construct DB query
    let query = adminClient
      .from('dead_letter_queue')
      .select('*', { count: 'exact' });

    if (targetOrgId) {
      query = query.eq('organization_id', targetOrgId);
    } else if (!isPlatformAdmin) {
      query = query.in('organization_id', allowedOrgIds);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`error_message.ilike.%${search}%,action.ilike.%${search}%,queue_name.ilike.%${search}%`);
    }

    // Apply pagination range
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('exhausted_at', { ascending: false });

    const { data: dlqItems, error: queryErr, count } = await query;
    if (queryErr) {
      console.error('[DLQ Search API] Query error:', queryErr.message);
      return NextResponse.json({ error: queryErr.message }, { status: 500 });
    }

    return NextResponse.json({
      data: dlqItems || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err: any) {
    console.error('[DLQ Search API] Execution failure:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/queues/dlq
 * Administrative "ignore/archive" controls for DLQ jobs.
 */
export async function PATCH(request: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Operator session not found' }, { status: 401 });
    }

    const body = await request.json();
    const { dlqId, status, notes = '' } = body;

    if (!dlqId || !status) {
      return NextResponse.json({ error: 'Missing required parameters: dlqId and status' }, { status: 400 });
    }

    if (!['ignored', 'pending', 'replayed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status type. Must be pending, replayed, or ignored' }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // 1. Fetch DLQ record to extract organization_id
    const { data: dlqRecord, error: dlqError } = await adminClient
      .from('dead_letter_queue')
      .select('*')
      .eq('id', dlqId)
      .single();

    if (dlqError || !dlqRecord) {
      console.error('[DLQ Patch API] Failed to fetch record:', dlqError?.message);
      return NextResponse.json({ error: 'DLQ record not found' }, { status: 404 });
    }

    // 2. Validate membership & roles or platform admin status
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
        console.warn(`[DLQ Patch API] Forbidden: User ${user.id} lacks admin privileges for Org ${dlqRecord.organization_id}`);
        return NextResponse.json({ error: 'Forbidden: Insufficient privileges to modify DLQ statuses' }, { status: 403 });
      }
    }

    // 3. Perform database status update
    const { error: updateErr } = await adminClient
      .from('dead_letter_queue')
      .update({
        status,
        notes: notes || `Marked as ${status} by operator via API`
      })
      .eq('id', dlqId);

    if (updateErr) {
      console.error('[DLQ Patch API] Failed to update status:', updateErr.message);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 4. Centralized audit ledger record
    const { error: auditErr } = await adminClient.from('audit_logs').insert({
      organization_id: dlqRecord.organization_id,
      user_id: user.id,
      action: `dlq_job_${status}`,
      details: {
        dlq_id: dlqId,
        queue_name: dlqRecord.queue_name,
        action: dlqRecord.action,
        notes
      }
    });

    if (auditErr) {
      console.error('[DLQ Patch API] Failed to write audit log:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `DLQ record successfully updated to status: ${status}`
    });
  } catch (err: any) {
    console.error('[DLQ Patch API] Execution failure:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
