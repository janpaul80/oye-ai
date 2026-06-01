import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can view demo data' }, { status: 403 });
    }

    const conversations = await admin
      .from('conversations')
      .select('*, customers(*)')
      .eq('organization_id', orgId)
      .order('last_message_at', { ascending: false })
      .limit(20);

    const leads = await admin
      .from('leads')
      .select('*, customers(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20);

    const services = await admin
      .from('services')
      .select('*')
      .eq('organization_id', orgId);

    const faq = await admin
      .from('faq_knowledge')
      .select('*')
      .eq('organization_id', orgId);

    const policies = await admin
      .from('business_policies')
      .select('*')
      .eq('organization_id', orgId);

    return NextResponse.json({
      success: true,
      demo_data: {
        conversations: conversations.data || [],
        leads: leads.data || [],
        services: services.data || [],
        faq: faq.data || [],
        policies: policies.data || []
      },
      totals: {
        conversations: conversations.data?.length || 0,
        leads: leads.data?.length || 0,
        services: services.data?.length || 0,
        faq: faq.data?.length || 0,
        policies: policies.data?.length || 0
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}