import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function GET(request: NextRequest) {
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
    const { data: org } = await admin
      .from('organizations')
      .select('stripe_customer_id, stripe_subscription_id, billing_plan, trial_end_date')
      .eq('id', orgId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check trial status
    let plan = org.billing_plan || 'trial';
    let status = 'active';
    let currentPeriodEnd = null;

    if (org.trial_end_date) {
      const trialEnd = new Date(org.trial_end_date);
      if (trialEnd > new Date()) {
        const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        status = 'trial';
        plan = `trial (${daysLeft} days left)`;
      }
    }

    if (org.stripe_subscription_id) {
      try {
        const sub: any = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        status = sub.status;
        currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
      } catch (e) {
        status = 'error';
      }
    }

    return NextResponse.json({
      success: true,
      plan: plan,
      status: status,
      current_period_end: currentPeriodEnd,
      has_subscription: !!org.stripe_subscription_id,
      in_trial: !!org.trial_end_date && new Date(org.trial_end_date) > new Date()
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId, returnUrl } = await request.json();
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
      return NextResponse.json({ error: 'Only owner can access portal' }, { status: 403 });
    }

    const { data: org } = await admin
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'No stripe customer' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}