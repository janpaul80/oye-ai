import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role, organization_id } = await request.json();

    if (!email || !organization_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate secure invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id,
        email,
        role: role || 'operator',
        token,
        invited_by: authData.user.id,
        expires_at: expiresAt.toISOString()
      })
      .select('id, email, role, expires_at, token')
      .single();

    if (error) throw error;

    // Log the event
    await supabase.from('audit_logs').insert({
      organization_id,
      actor_id: authData.user.id,
      action: 'invite.created',
      resource_type: 'invite',
      resource_id: data.id,
      details: { email, role }
    });

    return NextResponse.json({ invite: data, message: 'Invite created' }, { status: 201 });
  } catch (err: any) {
    console.error('[API] Invite creation failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
       return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('organization_invites')
      .select('id, email, role, created_at, expires_at, accepted_at, revoked_at')
      .eq('organization_id', orgId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ invites: data }, { status: 200 });
  } catch (err: any) {
    console.error('[API] Fetching invites failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
