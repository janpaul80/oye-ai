import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      .from('organizations')
      .select('status, onboarding_step, onboarding_completed_at, beta_approved_at, meta_business_id, billing_status')
      .eq('id', orgId)
      .single();

    if (error) throw error;

    return NextResponse.json({ status: data }, { status: 200 });
  } catch (err: any) {
    console.error('[API] Fetching onboarding status failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, step } = body;

    if (!orgId || typeof step !== 'number') {
      return NextResponse.json({ error: 'orgId and step are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('organizations')
      .update({ onboarding_step: step })
      .eq('id', orgId)
      .select('status, onboarding_step, onboarding_completed_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ status: data }, { status: 200 });
  } catch (err: any) {
    console.error('[API] Updating onboarding step failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
