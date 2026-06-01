import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const VALID_STAGES = [
  'new',
  'contacted',
  'qualified',
  'appointment_scheduled',
  'customer',
  'closed_won',
  'closed_lost'
] as const;

type Stage = typeof VALID_STAGES[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, leadId, stage } = body || {};
    if (!orgId || !leadId || !stage){
      return NextResponse.json({ error: 'Missing orgId, leadId or stage' }, { status: 400 });
    }
    if (!VALID_STAGES.includes(stage)){
      return NextResponse.json({ error: 'Invalid stage value' }, { status: 400 });
    }
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await admin
      .from('leads')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.from('lead_events').insert({
      organization_id: orgId,
      lead_id: leadId,
      event_type: 'stage_updated',
      payload: { user_id: user.id, new_stage: stage }
    });

    return NextResponse.json({ success: true, lead: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
