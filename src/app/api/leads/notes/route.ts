import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, leadId, note } = body || {};
    if (!orgId || !leadId || !note) return NextResponse.json({ error: 'Missing orgId, leadId or note' }, { status: 400 });

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
      .from('lead_notes')
      .insert({
        organization_id: orgId,
        lead_id: leadId,
        author_id: user.id,
        body: note
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.from('lead_events').insert({
      organization_id: orgId,
      lead_id: leadId,
      event_type: 'note_added',
      payload: { user_id: user.id }
    });

    return NextResponse.json({ success: true, note: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
