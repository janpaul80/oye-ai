import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const VALID_STATUSES = [
  'draft',
  'onboarding',
  'pending_approval',
  'pending_verification',
  'beta_approved',
  'active',
  'suspended',
  'archived'
];

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch profile to check platform admin status
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', authData.user.id)
      .single();

    if (profileErr || !profile || !profile.is_platform_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 3. Parse and validate body parameters
    const body = await request.json();
    const { orgId, status } = body;

    if (!orgId || !status) {
      return NextResponse.json({ error: 'orgId and status are required' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    // 4. Update status using admin client to bypass RLS
    const adminClient = await createAdminClient();

    const isApprovalState = status === 'active' || status === 'beta_approved';
    const updatePayload: any = { status };

    if (isApprovalState) {
      updatePayload.beta_approved_at = new Date().toISOString();
      updatePayload.beta_approved_by = authData.user.id;
    }

    const { data: orgData, error: updateErr } = await adminClient
      .from('organizations')
      .update(updatePayload)
      .eq('id', orgId)
      .select('id, name, status')
      .single();

    if (updateErr || !orgData) {
      console.error('[API Admin] Error updating organization status:', updateErr?.message);
      return NextResponse.json({ error: 'Failed to update organization status', details: updateErr?.message }, { status: 500 });
    }

    // 5. Write to the Security Audit Ledger
    const { error: auditErr } = await adminClient.from('audit_logs').insert({
      organization_id: orgId,
      actor_id: authData.user.id,
      action: 'organization.status_updated',
      resource_type: 'organization',
      resource_id: orgId,
      details: { 
        new_status: status, 
        approved_at: isApprovalState ? updatePayload.beta_approved_at : null 
      }
    });

    if (auditErr) {
      console.error('[API Admin] Warning: Audit log entry creation failed:', auditErr.message);
    }

    return NextResponse.json({ 
      message: `Organization status successfully updated to '${status}'`, 
      organization: orgData 
    }, { status: 200 });

  } catch (err: any) {
    console.error('[API Admin] Update status route critical failure:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
