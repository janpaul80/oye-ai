import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const PLANS = {
  basic: { priceId: 'price_basic', amount: 2500 },
  pro: { priceId: 'price_pro', amount: 4999 }
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, plan, paymentMethodId } = await request.json();

    if (!orgId || !plan) {
      return NextResponse.json({ error: 'orgId and plan are required' }, { status: 400 });
    }

    if (!PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({ error: 'Invalid plan. Use basic or pro' }, { status: 400 });
    }

    const admin = await createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can subscribe' }, { status: 403 });
    }

    // Get or create Stripe customer
    let { data: org } = await admin
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', orgId)
      .single();

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { orgId, supabase_user_id: user.id },
        name: org?.name || 'Customer Business'
      });
      customerId = customer.id;

      await admin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', orgId);
    }

    // Create or update subscription
    const planConfig = PLANS[plan as keyof typeof PLANS];
    
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: planConfig.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { orgId, plan }
    });

    // Update org with subscription info
    await admin
      .from('organizations')
      .update({
        stripe_subscription_id: subscription.id,
        billing_plan: plan,
        billing_status: 'active'
      })
      .eq('id', orgId);

    // Log audit
    await admin.from('audit_logs').insert({
      organization_id: orgId,
      actor_id: user.id,
      action: 'billing.subscribe',
      resource_type: 'organization',
      resource_id: orgId,
      details: { plan, subscription_id: subscription.id }
    });

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      status: subscription.status,
      plan
    });
  } catch (e: any) {
    console.error('[Billing Subscribe] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    const admin = await createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can cancel' }, { status: 403 });
    }

    // Get subscription
    const { data: org } = await admin
      .from('organizations')
      .select('stripe_subscription_id')
      .eq('id', orgId)
      .single();

    if (org?.stripe_subscription_id) {
      await stripe.subscriptions.cancel(org.stripe_subscription_id);
    }

    // Update org
    await admin
      .from('organizations')
      .update({
        stripe_subscription_id: null,
        billing_plan: 'trial',
        billing_status: 'canceled'
      })
      .eq('id', orgId);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}