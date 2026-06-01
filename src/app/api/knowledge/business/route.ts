import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    const type = url.searchParams.get('type');

    if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });

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

    const allowedTypes = ['business_info', 'services', 'pricing', 'faq', 'policies'];
    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const results: Record<string, any> = {};

    if (!type || type === 'business_info') {
      const { data: info } = await admin
        .from('business_info')
        .select('*')
        .eq('organization_id', orgId)
        .limit(1)
        .single();
      results.business_info = info;
    }

    if (!type || type === 'services') {
      const { data: services } = await admin
        .from('services')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name');
      results.services = services || [];
    }

    if (!type || type === 'pricing') {
      const { data: pricing } = await admin
        .from('pricing_packages')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('price');
      results.pricing = pricing || [];
    }

    if (!type || type === 'faq') {
      const { data: faq } = await admin
        .from('faq_knowledge')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      results.faq = faq || [];
    }

    if (!type || type === 'policies') {
      const { data: policies } = await admin
        .from('business_policies')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      results.policies = policies || [];
    }

    return NextResponse.json({ success: true, data: type ? results[type] || null : results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, type, data } = body;

    if (!orgId || !type) {
      return NextResponse.json({ error: 'Missing orgId or type' }, { status: 400 });
    }

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

    let result;
    switch (type) {
      case 'business_info':
        ({ data: result } = await admin
          .from('business_info')
          .upsert({ organization_id: orgId, ...data, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
          .select()
          .single());
        break;
      case 'services':
        ({ data: result } = await admin
          .from('services')
          .insert({ organization_id: orgId, ...data })
          .select()
          .single());
        break;
      case 'pricing':
        ({ data: result } = await admin
          .from('pricing_packages')
          .insert({ organization_id: orgId, ...data })
          .select()
          .single());
        break;
      case 'faq':
        ({ data: result } = await admin
          .from('faq_knowledge')
          .insert({ organization_id: orgId, ...data })
          .select()
          .single());
        break;
      case 'policies':
        ({ data: result } = await admin
          .from('business_policies')
          .insert({ organization_id: orgId, ...data })
          .select()
          .single());
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}