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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    const stage = url.searchParams.get('stage') as Stage | null;
    const limit = Number(url.searchParams.get('limit') || '50');

    if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });

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

    let query = admin
      .from('leads')
      .select('*, customers(*), conversations:conversations(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 200));

    if (stage && VALID_STAGES.includes(stage)) {
      query = query.eq('stage', stage);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, leads: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
