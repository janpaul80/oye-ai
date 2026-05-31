/**
 * Oye AI: Security Audit Ledger API
 * File Location: c:\Users\hartm\oye-ai\src\app\api\security\audit\route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Operator session not found' }, { status: 401 });
    }

    const adminClient = await createAdminClient();

    // 1. Fetch user's memberships to ensure robust tenant isolation
    const { data: memberships, error: membershipErr } = await adminClient
      .from('memberships')
      .select('organization_id, role')
      .eq('user_id', user.id);

    if (membershipErr || !memberships || memberships.length === 0) {
      return NextResponse.json({ error: 'Forbidden: User has no active organization memberships' }, { status: 403 });
    }

    const allowedOrgIds = memberships.map((m) => m.organization_id);

    // 2. Parse Query Parameters
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const actionFilter = searchParams.get('action');
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.max(1, Number(searchParams.get('limit') || 20));

    // 3. Apply cryptographic tenant boundaries
    let targetOrgId = orgId;
    if (targetOrgId) {
      if (!allowedOrgIds.includes(targetOrgId)) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
      }
    }

    // 4. Construct central audit queries
    let query = adminClient
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (targetOrgId) {
      query = query.eq('organization_id', targetOrgId);
    } else {
      query = query.in('organization_id', allowedOrgIds);
    }

    if (actionFilter) {
      query = query.ilike('action', `%${actionFilter}%`);
    }

    // 5. Pagination and sorting
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: logs, error: queryErr, count } = await query;

    if (queryErr) {
      console.error('[Security Audit API] Query error:', queryErr.message);
      return NextResponse.json({ error: queryErr.message }, { status: 500 });
    }

    return NextResponse.json({
      data: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err: any) {
    console.error('[Security Audit API] Execution failure:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
