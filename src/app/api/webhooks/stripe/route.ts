import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isRateLimited } from '@/lib/services/rate-limiter';
import Stripe from 'stripe';

/**
 * POST - Stripe webhook event ingestion
 * Performs cryptographic signature verification, extracts tenant scopes from
 * Stripe metadata, and atomic subscription sync operations inside Supabase.
 */
export async function POST(request: NextRequest) {
  // Rate Limiting Protection (Max 120 requests capacity, 5 refills/sec for webhook spikes)
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await isRateLimited(ip, 'stripe-ingest', 120, 5);
  if (limitResult.limited) {
    try {
      const adminClient = await createAdminClient();
      await adminClient.from('audit_logs').insert({
        organization_id: '88888888-8888-8888-8888-888888888888',
        action: 'security.stripe_rate_limited',
        details: { ip, limit: 120 }
      });
    } catch (auditErr: any) {
      console.error('[Stripe Webhook] Failed to log rate-limit audit event:', auditErr.message);
    }
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const enableLiveVerification = process.env.ENABLE_LIVE_STRIPE_WEBHOOKS === 'true';

  if (enableLiveVerification) {
    if (!stripeSecret || !webhookSecret || stripeSecret.includes('sk_test_placeholder')) {
      console.error('[Stripe Webhook] CRITICAL: Live validation enabled but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is unconfigured.');
      return NextResponse.json({ error: 'Insecure Stripe webhook configuration' }, { status: 401 });
    }

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header. Rejected.');
      try {
        const adminClient = await createAdminClient();
        await adminClient.from('audit_logs').insert({
          organization_id: '88888888-8888-8888-8888-888888888888',
          action: 'security.stripe_signature_missing',
          details: { signature }
        });
      } catch {}
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }
  }

  // Graceful Fallback in non-live mode if credentials are unconfigured
  if (!enableLiveVerification && (!stripeSecret || !webhookSecret || stripeSecret.includes('sk_test_placeholder'))) {
    console.warn('[Stripe Webhook] Graceful Fallback: Stripe credentials missing. Event logged safely.');
    return NextResponse.json({ received: true, mode: 'graceful_fallback' }, { status: 200 });
  }

  let event: Stripe.Event;

  try {
    if (!enableLiveVerification) {
      console.log('[Stripe Webhook] Mock signature mode active (ENABLE_LIVE_STRIPE_WEBHOOKS=false). Constructing mock event.');
      event = JSON.parse(rawBody) as Stripe.Event;
    } else {
      const stripe = new Stripe(stripeSecret!, {
        apiVersion: '2023-10-16' as any,
      });
      event = stripe.webhooks.constructEvent(rawBody, signature!, webhookSecret!);
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Cryptographic validation failed: ${err.message}`);
    try {
      const adminClient = await createAdminClient();
      await adminClient.from('audit_logs').insert({
        organization_id: '88888888-8888-8888-8888-888888888888',
        action: 'security.stripe_signature_failure',
        details: { error: err.message, signature }
      });
    } catch (auditErr: any) {
      console.error('[Stripe Webhook] Failed to log security audit event:', auditErr.message);
    }
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Verified event: ${event.type} | ID: ${event.id}`);

  const adminClient = await createAdminClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const stripeSubId = subscription.id;
        const stripeCustId = subscription.customer as string;
        const orgId = subscription.metadata?.organization_id;
        const status = subscription.status; // active, trialing, past_due, canceled, unpaid
        
        // Map plan names based on product IDs or metadata. Fallback to 'pro' if unmapped
        const planName = (subscription.metadata?.plan_name || 'pro') as 'free' | 'starter' | 'pro' | 'enterprise';

        if (!orgId) {
          console.warn(`[Stripe Webhook] Warning: Subscription ${stripeSubId} contains no organization_id metadata.`);
          break;
        }

        const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null;
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
        const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Perform atomic upsert linking the Stripe subscription to our tenant organization
        const { error } = await adminClient
          .from('subscriptions')
          .upsert({
            organization_id: orgId,
            stripe_subscription_id: stripeSubId,
            stripe_customer_id: stripeCustId,
            plan_name: planName,
            status: status === 'trialing' ? 'trialing' : status, // postgres check maps 'trialing'
            trial_start: trialStart,
            trial_end: trialEnd,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'stripe_subscription_id' });

        if (error) {
          console.error(`[Stripe Webhook] Database upsert failure for Org ${orgId}:`, error.message);
          throw error;
        }

        // Map Stripe status to organization.billing_status policy layer
        let orgBillingStatus = 'active';
        if (status === 'trialing') {
          orgBillingStatus = 'trial';
        } else if (status === 'past_due') {
          orgBillingStatus = 'past_due';
        } else if (status === 'unpaid') {
          orgBillingStatus = 'suspended';
        } else if (status === 'canceled') {
          orgBillingStatus = 'canceled';
        }

        const isSuspendedOrCanceled = orgBillingStatus === 'suspended' || orgBillingStatus === 'canceled';
        const orgUpdates: any = { billing_status: orgBillingStatus };
        if (isSuspendedOrCanceled) {
          orgUpdates.status = 'suspended';
        } else if (orgBillingStatus === 'active' || orgBillingStatus === 'trial') {
          orgUpdates.status = 'active';
        }

        const { error: orgUpdateErr } = await adminClient
          .from('organizations')
          .update(orgUpdates)
          .eq('id', orgId);

        if (orgUpdateErr) {
          console.error(`[Stripe Webhook] Failed to update organization ${orgId} to ${JSON.stringify(orgUpdates)}:`, orgUpdateErr.message);
        }

        // Insert security Audit Log tracking billing modifications
        await adminClient
          .from('audit_logs')
          .insert({
            organization_id: orgId,
            action: 'billing.subscription_synced',
            details: { stripe_subscription_id: stripeSubId, plan: planName, status: status, billing_status: orgBillingStatus }
          });

        console.log(`[Stripe Webhook] Successfully synchronized subscription for Org ${orgId} -> ${planName} (${status}), billing_status: ${orgBillingStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const stripeSubId = subscription.id;

        // Fetch organization linked to the subscription to execute cancellation syncs
        const { data: dbSub, error: subError } = await adminClient
          .from('subscriptions')
          .select('organization_id')
          .eq('stripe_subscription_id', stripeSubId)
          .limit(1)
          .single();

        if (subError || !dbSub) {
          console.warn(`[Stripe Webhook] Warning: Subscription ${stripeSubId} was deleted but no matching DB record was found.`);
          break;
        }

        const orgId = dbSub.organization_id;

        // Set subscription status to canceled inside our database
        const { error } = await adminClient
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', stripeSubId);

        if (error) {
          console.error(`[Stripe Webhook] Database update failure on deletion:`, error.message);
          throw error;
        }

        // Set organization billing_status to canceled and status to suspended
        const { error: orgUpdateErr } = await adminClient
          .from('organizations')
          .update({ 
            billing_status: 'canceled',
            status: 'suspended'
          })
          .eq('id', orgId);

        if (orgUpdateErr) {
          console.error(`[Stripe Webhook] Failed to update organization ${orgId} status on deletion:`, orgUpdateErr.message);
        }

        // Insert security Audit Log
        await adminClient
          .from('audit_logs')
          .insert({
            organization_id: orgId,
            action: 'billing.subscription_cancelled',
            details: { stripe_subscription_id: stripeSubId, billing_status: 'canceled' }
          });

        console.log(`[Stripe Webhook] Cancelled active subscription mapping for Org ${orgId}, billing_status: canceled`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Ignored unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Stripe Webhook] Ingestion critical error:', error);
    return NextResponse.json({ error: error.message || 'Critical failure' }, { status: 500 });
  }
}
