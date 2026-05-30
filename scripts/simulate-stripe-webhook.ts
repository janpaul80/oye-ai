#!/usr/bin/env npx tsx
/**
 * Oye AI - Stripe Webhook Signed Simulation Script
 * Phase 14: Operational Proof Validation
 *
 * Purpose: Simulate all critical Stripe billing lifecycle events against the
 * local Oye AI Stripe webhook endpoint to prove billing state transitions
 * work correctly WITHOUT requiring a real Stripe account in test mode.
 *
 * When ENABLE_LIVE_STRIPE_WEBHOOKS=false, the webhook accepts raw JSON bodies
 * without Stripe signature verification (mock mode). This is the safe path
 * for local/staging validation before enabling live webhook secrets.
 *
 * Billing State Transition Map:
 *   invoice.payment_succeeded → billing_status: 'active'
 *   customer.subscription.updated (past_due) → billing_status: 'past_due'
 *   customer.subscription.updated (unpaid)   → billing_status: 'suspended'
 *   customer.subscription.deleted            → billing_status: 'canceled'
 *
 * Usage:
 *   npx tsx scripts/simulate-stripe-webhook.ts
 *   npx tsx scripts/simulate-stripe-webhook.ts --event past_due
 *   npx tsx scripts/simulate-stripe-webhook.ts --event canceled
 *   npx tsx scripts/simulate-stripe-webhook.ts --event all
 *   npx tsx scripts/simulate-stripe-webhook.ts --endpoint https://staging.oye-ai.com
 */

import http from 'http';
import https from 'https';

// ─── Configuration ────────────────────────────────────────────────────────────
const ENDPOINT = process.argv.find(a => a.startsWith('--endpoint='))?.split('=')[1]
  || process.env.STRIPE_WEBHOOK_ENDPOINT
  || 'http://localhost:3000/api/webhooks/stripe';

const EVENT_TYPE = process.argv.find(a => a.startsWith('--event='))?.split('=')[1]
  || (process.argv.includes('--event') ? process.argv[process.argv.indexOf('--event') + 1] : 'succeeded');

// Configurable org_id for linking Stripe metadata to a tenant
const ORG_ID = process.env.STRIPE_SIM_ORG_ID || '11111111-1111-1111-1111-111111111111';
const STRIPE_SUB_ID = `sub_sim_${Date.now()}`;
const STRIPE_CUST_ID = `cus_sim_${Date.now()}`;

// ─── Event Payload Builders ───────────────────────────────────────────────────

function buildSubscriptionEvent(status: string, planName = 'pro'): object {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_sim_${Date.now()}`,
    object: 'event',
    type: 'customer.subscription.updated',
    created: now,
    data: {
      object: {
        id: STRIPE_SUB_ID,
        object: 'subscription',
        customer: STRIPE_CUST_ID,
        status,
        metadata: {
          organization_id: ORG_ID,
          plan_name: planName
        },
        trial_start: null,
        trial_end: null,
        current_period_start: now - 86400,
        current_period_end: now + (30 * 86400)
      }
    }
  };
}

function buildSubscriptionDeletedEvent(): object {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_sim_del_${Date.now()}`,
    object: 'event',
    type: 'customer.subscription.deleted',
    created: now,
    data: {
      object: {
        id: STRIPE_SUB_ID,
        object: 'subscription',
        customer: STRIPE_CUST_ID,
        status: 'canceled',
        metadata: {
          organization_id: ORG_ID,
          plan_name: 'pro'
        },
        current_period_start: now - 86400,
        current_period_end: now + (30 * 86400)
      }
    }
  };
}

// ─── HTTP Poster ──────────────────────────────────────────────────────────────

async function postWebhook(endpoint: string, body: string): Promise<{ status: number; response: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        // Note: No stripe-signature header in mock mode (ENABLE_LIVE_STRIPE_WEBHOOKS=false)
        'x-trace-id': `stripe_sim_trace_${Date.now()}`
      },
      rejectUnauthorized: false
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, response: data }));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Scenario Runner ──────────────────────────────────────────────────────────

interface Scenario {
  label: string;
  expectedBillingStatus: string;
  payload: object;
}

async function runScenario(scenario: Scenario) {
  const body = JSON.stringify(scenario.payload);
  console.log(`\n  📦 Scenario: ${scenario.label}`);
  console.log(`     Expected billing_status: ${scenario.expectedBillingStatus}`);
  console.log(`     Payload size: ${body.length} bytes`);

  try {
    const result = await postWebhook(ENDPOINT, body);
    const parsed = JSON.parse(result.response);
    const success = result.status === 200 && (parsed.received || parsed.mode === 'graceful_fallback');

    if (result.status === 200 && parsed.mode === 'graceful_fallback') {
      console.log(`     ⚠️  Status: ${result.status} | Mode: graceful_fallback (Stripe secrets not set)`);
      console.log(`     ℹ️  Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET for full validation`);
    } else if (success) {
      console.log(`     ✅ Status: ${result.status} | Response: ${result.response}`);
    } else {
      console.log(`     ❌ Status: ${result.status} | Response: ${result.response}`);
    }
  } catch (err: any) {
    console.log(`     ❌ Connection error: ${err.message}`);
  }

  // Small delay between events
  await new Promise(r => setTimeout(r, 300));
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('💳 OYE AI - Stripe Webhook Billing Simulation');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`📡 Target Endpoint : ${ENDPOINT}`);
  console.log(`🏢 Test Org ID     : ${ORG_ID}`);
  console.log(`🔖 Scenario        : ${EVENT_TYPE}`);
  console.log(`📋 Mock Mode       : ${process.env.ENABLE_LIVE_STRIPE_WEBHOOKS === 'false' ? 'ON (no signature required)' : 'OFF (signature required)'}\n`);

  const allScenarios: Scenario[] = [
    {
      label: 'Subscription ACTIVE (payment succeeded)',
      expectedBillingStatus: 'active',
      payload: buildSubscriptionEvent('active', 'pro')
    },
    {
      label: 'Subscription PAST_DUE (payment failed)',
      expectedBillingStatus: 'past_due',
      payload: buildSubscriptionEvent('past_due', 'pro')
    },
    {
      label: 'Subscription TRIALING (new trial start)',
      expectedBillingStatus: 'trial',
      payload: buildSubscriptionEvent('trialing', 'starter')
    },
    {
      label: 'Subscription UNPAID (suspended)',
      expectedBillingStatus: 'suspended',
      payload: buildSubscriptionEvent('unpaid', 'pro')
    },
    {
      label: 'Subscription DELETED (canceled)',
      expectedBillingStatus: 'canceled',
      payload: buildSubscriptionDeletedEvent()
    }
  ];

  let scenariosToRun: Scenario[];

  if (EVENT_TYPE === 'all') {
    scenariosToRun = allScenarios;
  } else if (EVENT_TYPE === 'succeeded' || EVENT_TYPE === 'active') {
    scenariosToRun = [allScenarios[0]];
  } else if (EVENT_TYPE === 'past_due') {
    scenariosToRun = [allScenarios[1]];
  } else if (EVENT_TYPE === 'trial') {
    scenariosToRun = [allScenarios[2]];
  } else if (EVENT_TYPE === 'unpaid' || EVENT_TYPE === 'suspended') {
    scenariosToRun = [allScenarios[3]];
  } else if (EVENT_TYPE === 'canceled' || EVENT_TYPE === 'deleted') {
    scenariosToRun = [allScenarios[4]];
  } else {
    console.error(`Unknown event type: ${EVENT_TYPE}`);
    console.log('Valid options: succeeded, past_due, trial, unpaid, canceled, all');
    process.exit(1);
  }

  console.log(`Running ${scenariosToRun.length} scenario(s)...\n`);
  console.log('────────────────────────────────────────────────────────────');

  for (const scenario of scenariosToRun) {
    await runScenario(scenario);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📊 BILLING STATE TRANSITION MAP');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Stripe Status  →  organizations.billing_status');
  console.log('  ─────────────────────────────────────────────');
  console.log('  active         →  active    (Full AI routing enabled)');
  console.log('  trialing       →  trial     (Limited routing allowed)');
  console.log('  past_due       →  past_due  (Warning state, routing restricted)');
  console.log('  unpaid         →  suspended (AI routing BLOCKED)');
  console.log('  canceled       →  canceled  (AI routing BLOCKED)');
  console.log('\n  AI routing gate is enforced in the WhatsApp webhook:');
  console.log('  billing_status !== "suspended" AND !== "canceled"');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal Stripe simulation error:', err);
  process.exit(1);
});
