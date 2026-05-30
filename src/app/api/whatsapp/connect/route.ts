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

    const body = await request.json();
    const { orgId, meta_business_id, whatsapp_business_account_id, phone_number_id } = body;

    if (!orgId || !meta_business_id || !whatsapp_business_account_id || !phone_number_id) {
      return NextResponse.json({ error: 'Missing required connection identifiers' }, { status: 400 });
    }

    // A real implementation would call Meta's Graph API to verify these credentials
    // Mocking the verification for Beta onboarding flow
    const verificationSuccess = true;

    if (!verificationSuccess) {
      return NextResponse.json({ error: 'Meta API verification failed' }, { status: 400 });
    }

    // Store in DB
    const { data, error } = await supabase
      .from('organizations')
      .update({
        meta_business_id,
        whatsapp_business_account_id,
        phone_number_id,
        onboarding_step: 3 // Move to next step
      })
      .eq('id', orgId)
      .select('id, meta_business_id, onboarding_step')
      .single();

    if (error) throw error;

    // Generate unique inbound webhook verification token for this tenant
    const webhookVerifyToken = crypto.randomBytes(16).toString('hex');
    
    // We would securely store the webhookVerifyToken in tenant settings for future webhook inbound verifications
    await supabase.from('organization_settings').upsert({
      organization_id: orgId,
      webhook_verify_token: webhookVerifyToken
    }, { onConflict: 'organization_id' });

    // Log audit
    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      actor_id: authData.user.id,
      action: 'whatsapp.connected',
      resource_type: 'organization',
      resource_id: orgId,
      details: { meta_business_id }
    });

    return NextResponse.json({ 
      success: true, 
      organization: data,
      webhookVerifyToken 
    }, { status: 200 });
  } catch (err: any) {
    console.error('[API] WhatsApp connection failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
