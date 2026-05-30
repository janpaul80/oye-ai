import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // 3. Admin authorized: use admin client to bypass RLS and fetch all organizations
    const adminClient = await createAdminClient();
    const { data: organizations, error: orgsErr } = await adminClient
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        status,
        billing_status,
        created_at,
        onboarding_step,
        onboarding_completed_at,
        beta_approved_at
      `)
      .order('created_at', { ascending: false });

    if (orgsErr) {
      console.error('[API Admin] Error fetching organizations:', orgsErr.message);
      return NextResponse.json({ error: 'Failed to fetch organizations', details: orgsErr.message }, { status: 500 });
    }

    return NextResponse.json({ organizations }, { status: 200 });
  } catch (err: any) {
    console.error('[API Admin] Organizations route critical failure:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
