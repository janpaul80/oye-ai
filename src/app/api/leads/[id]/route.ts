import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
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

    const { data, error } = await admin
      .from('leads')
      .select('*, customers(*), conversations(*), lead_notes(*), lead_events(*)')
      .eq('organization_id', orgId)
      .eq('id', leadId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, lead: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}