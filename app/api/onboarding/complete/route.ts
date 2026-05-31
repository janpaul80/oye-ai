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
    const { orgId, ai_mode, ai_tone, terms_accepted } = body;

    if (!orgId || !terms_accepted) {
      return NextResponse.json({ error: 'orgId and terms acceptance are required to complete onboarding' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('organizations')
      .update({
        status: 'pending_verification',
        onboarding_step: 6,
        ai_mode: ai_mode || 'support',
        ai_tone: ai_tone || 'professional',
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('id', orgId)
      .select('id, status, onboarding_completed_at, created_at')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      actor_id: authData.user.id,
      action: 'onboarding.completed',
      resource_type: 'organization',
      resource_id: orgId,
      details: { status: 'pending_verification' }
    });

    // Perform autonomous governance onboarding risk evaluation
    let riskEvaluation = null;
    try {
      const regionCode = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || 'US';
      const signupDurationSec = data.created_at
        ? Math.max(1, Math.round((Date.now() - new Date(data.created_at).getTime()) / 1000))
        : 5;
      const traceId = request.headers.get('x-trace-id') || 'trace_' + Math.random().toString(36).substring(2, 11);
      
      const { GovernanceService } = await import('@/lib/services/autonomous-governance');
      riskEvaluation = await GovernanceService.evaluateOnboardingRisk(
        orgId,
        authData.user.email || '',
        regionCode,
        signupDurationSec,
        traceId
      );

      // Fetch the updated status so we return it to the frontend
      const { data: updatedOrg } = await supabase
        .from('organizations')
        .select('id, status, onboarding_completed_at')
        .eq('id', orgId)
        .single();
      
      if (updatedOrg) {
        data.status = updatedOrg.status;
      }
    } catch (govErr: any) {
      console.error('[API] Autonomous Onboarding Evaluation failed, falling back to pending_verification:', govErr.message);
    }

    return NextResponse.json({ 
      success: true, 
      organization: {
        id: data.id,
        status: data.status,
        onboarding_completed_at: data.onboarding_completed_at
      },
      riskEvaluation 
    }, { status: 200 });
  } catch (err: any) {
    console.error('[API] Onboarding completion failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
