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
    const { name, industry, support_email, timezone, default_language, operating_hours } = body;

    if (!name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    // 1. Insert Organization (This triggers auto_provision_trigger which adds owner role)
    const { data: orgData, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        status: 'pending_approval',
        onboarding_step: 2, 
        timezone: timezone || 'America/Guayaquil',
        default_language: default_language || 'es-LA'
      })
      .select('id')
      .single();

    if (orgErr) throw orgErr;

    // 2. Set Organization Settings
    if (operating_hours) {
      await supabase
        .from('organization_settings')
        .update({ 
          working_hours: operating_hours 
        })
        .eq('organization_id', orgData.id);
    }

    await supabase.from('audit_logs').insert({
      organization_id: orgData.id,
      user_id: authData.user.id,
      action: 'organization.created',
      details: { name, industry, support_email }
    });

    return NextResponse.json({ organization: orgData, message: 'Organization created successfully' }, { status: 201 });
  } catch (err: any) {
    console.error('[API] Organization creation failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
