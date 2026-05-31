/**
 * Oye AI: Organization Settings API
 * File Location: c:\Users\hartm\oye-ai\src\app\api\organizations\settings\route.ts
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId query parameter' }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const adminClient = await createAdminClient();

    // Verify membership to ensure tenant isolation
    const { data: membership } = await adminClient
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: User does not belong to the requested organization' }, { status: 403 });
    }

    // Fetch settings
    const { data: settings } = await adminClient
      .from('organization_settings')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (!settings) {
      // Return defaults if not configured yet
      return NextResponse.json({
        data: {
          organization_id: orgId,
          working_hours_start: '09:00',
          working_hours_end: '18:00',
          working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          default_provider: 'langdock',
          sla_hours: 4
        }
      });
    }

    return NextResponse.json({ data: settings });
  } catch (err: any) {
    console.error('[Organization Settings API] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, working_hours_start, working_hours_end, working_days, default_provider, sla_hours } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId in payload' }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const adminClient = await createAdminClient();

    const { data: membership } = await adminClient
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required to update settings' }, { status: 403 });
    }

    // Upsert settings configuration
    const { data: settings, error: upsertErr } = await adminClient
      .from('organization_settings')
      .upsert({
        organization_id: orgId,
        working_hours_start,
        working_hours_end,
        working_days,
        default_provider,
        sla_hours,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })
      .select()
      .single();

    if (upsertErr) {
      console.error('[Organization Settings API] Upsert failed:', upsertErr.message);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    // Centralized Audit Log
    await adminClient.from('audit_logs').insert({
      organization_id: orgId,
      user_id: user.id,
      action: 'organization_settings_updated',
      details: { settings }
    });

    console.log(`[Organization Settings API] Settings updated for Org ${orgId}`);

    return NextResponse.json({ success: true, data: settings });
  } catch (err: any) {
    console.error('[Organization Settings API] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
