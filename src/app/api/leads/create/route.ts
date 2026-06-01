import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const VALID_STAGES = [
  'new',
  'contacted',
  'qualified',
  'appointment_scheduled',
  'customer',
  'closed_won',
  'closed_lost'
] as const;

type Stage = typeof VALID_STAGES[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, customerId, conversationId, name, phone, email, source, attributes } = body || {};

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

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let resolvedCustomerId = customerId as string | undefined;

    if (!resolvedCustomerId && (phone || email)) {
      const { data: existing } = await admin
        .from('customers')
        .select('id')
        .eq('organization_id', orgId)
        .or([
          phone ? `phone_number.eq.${phone}` : '',
          email ? `email.eq.${email}` : ''
        ].filter(Boolean).join(','))
        .limit(1)
        .single();

      if (existing) {
        resolvedCustomerId = existing.id;
      } else {
        const { data: created } = await admin
          .from('customers')
          .insert({
            organization_id: orgId,
            name: name || null,
            phone_number: phone || null,
            email: email || null,
            custom_attributes: {}
          })
          .select('id')
          .single();
        resolvedCustomerId = created?.id;
      }
    }

    const { data: lead, error: leadErr } = await admin
      .from('leads')
      .insert({
        organization_id: orgId,
        customer_id: resolvedCustomerId || null,
        conversation_id: conversationId || null,
        stage: 'new' as Stage,
        source: source || null,
        attributes: attributes || {},
        created_by: user.id
      })
      .select('*')
      .single();

    if (leadErr) {
      return NextResponse.json({ error: leadErr.message }, { status: 500 });
    }

    await admin.from('lead_events').insert({
      organization_id: orgId,
      lead_id: lead.id,
      event_type: 'lead_created',
      payload: { user_id: user.id, conversation_id: conversationId || null }
    });

    return NextResponse.json({ success: true, lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
