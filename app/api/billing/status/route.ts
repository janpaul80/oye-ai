import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, action } = body;

    if (!orgId || !action) {
      return NextResponse.json({ error: 'orgId and action are required' }, { status: 400 });
    }

    if (action === 'activate_beta') {
      // Mocking Stripe integration for the Beta onboarding
      const { data, error } = await supabase
        .from('organizations')
        .update({
          billing_status: 'beta',
          onboarding_step: 5 // Move past billing step
        })
        .eq('id', orgId)
        .select('id, billing_status, onboarding_step')
        .single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        actor_id: authData.user.id,
        action: 'billing.beta_activated',
        resource_type: 'organization',
        resource_id: orgId,
        details: { mode: 'beta_override' }
      });

      return NextResponse.json({ success: true, organization: data }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[API] Billing status update failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
