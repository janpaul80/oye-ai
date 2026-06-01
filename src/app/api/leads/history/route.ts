import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    const leadId = url.searchParams.get('leadId');
    if (!orgId || !leadId) return NextResponse.json({ error: 'Missing orgId or leadId' }, { status: 400 });

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

    const { data: events, error: evErr } = await admin
      .from('lead_events')
      .select('*')
      .eq('organization_id', orgId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

    return NextResponse.json({ success: true, events: events || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
