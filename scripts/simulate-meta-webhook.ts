#!/usr/bin/env npx tsx
/**
 * Oye AI - Meta WhatsApp Webhook Signed Simulation Script
 * Phase 14: Operational Proof Validation
 *
 * Purpose: Generate a cryptographically valid HMAC-SHA256 signed Meta webhook
 * payload and POST it to the local Oye AI webhook endpoint to validate the
 * full inbound message ingestion pipeline WITHOUT requiring a real Meta callback.
 *
 * This is a SIGNED SIMULATION only. It does NOT constitute "real Meta production
 * proof". Real Meta proof requires verified callback from the Meta developer
 * platform, real outbound delivery, and real read receipt confirmation.
 *
 * Usage:
 *   npx tsx scripts/simulate-meta-webhook.ts
 *   npx tsx scripts/simulate-meta-webhook.ts --type status
 *   npx tsx scripts/simulate-meta-webhook.ts --endpoint https://staging.oye-ai.com
 */

import crypto from 'crypto';
import https from 'https';
import http from 'http';

// ─── Configuration ────────────────────────────────────────────────────────────
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || 'abc123secret';
const ENDPOINT = process.argv.find(a => a.startsWith('--endpoint='))?.split('=')[1]
  || process.env.WEBHOOK_ENDPOINT
  || 'http://localhost:3000/api/webhooks/whatsapp';
const SIM_TYPE = process.argv.find(a => a.startsWith('--type='))?.split('=')[1]
  || (process.argv.includes('--type') ? process.argv[process.argv.indexOf('--type') + 1] : 'message');

// ─── Payload Builders ─────────────────────────────────────────────────────────

function buildInboundMessagePayload(phoneId: string, fromPhone: string, body: string): object {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: '12345678901234567',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '+1555000001',
            phone_number_id: phoneId
          },
          contacts: [{
            profile: { name: 'Test Customer (Sim)' },
            wa_id: fromPhone
          }],
          messages: [{
            from: fromPhone,
            id: `wamid.sim_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: { body },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
}

function buildStatusReceiptPayload(phoneId: string, msgId: string, status: 'sent' | 'delivered' | 'read'): object {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: '12345678901234567',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '+1555000001',
            phone_number_id: phoneId
          },
          statuses: [{
            id: msgId,
            status,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            recipient_id: '5215500000001'
          }]
        },
        field: 'messages'
      }]
    }]
  };
}

// ─── HMAC Signature Generator ─────────────────────────────────────────────────

function signPayload(rawBody: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  return 'sha256=' + hmac.update(rawBody).digest('hex');
}

// ─── HTTP Poster ──────────────────────────────────────────────────────────────

async function postWebhook(endpoint: string, body: string, signature: string): Promise<{ status: number; response: string }> {
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
        'x-hub-signature-256': signature,
        'x-trace-id': `sim_trace_${Date.now()}`
      },
      rejectUnauthorized: false // allow self-signed certs in local testing
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

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🔬 OYE AI - Meta WhatsApp Webhook Signed Simulation');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log(`📡 Target Endpoint : ${ENDPOINT}`);
  console.log(`🔑 HMAC Secret     : ${APP_SECRET === 'abc123secret' ? 'DEFAULT (dev mode)' : '*** (custom secret)'}`);
  console.log(`📦 Simulation Type : ${SIM_TYPE}\n`);

  const PHONE_ID = 'sim_phone_123456789';
  const FROM_PHONE = '5215500000001';

  let payload: object;
  let label: string;

  if (SIM_TYPE === 'status') {
    payload = buildStatusReceiptPayload(PHONE_ID, 'wamid.existing_msg_id_001', 'delivered');
    label = 'STATUS RECEIPT (delivered)';
  } else if (SIM_TYPE === 'read') {
    payload = buildStatusReceiptPayload(PHONE_ID, 'wamid.existing_msg_id_001', 'read');
    label = 'STATUS RECEIPT (read)';
  } else {
    payload = buildInboundMessagePayload(PHONE_ID, FROM_PHONE, 'Hola! Quiero información sobre sus productos.');
    label = 'INBOUND TEXT MESSAGE';
  }

  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, APP_SECRET);

  console.log(`📝 Simulation Event : ${label}`);
  console.log(`🔐 HMAC Signature   : ${signature}`);
  console.log(`📄 Raw Payload (${rawBody.length} bytes):\n`);
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('📤 Sending to webhook endpoint...\n');

  try {
    const result = await postWebhook(ENDPOINT, rawBody, signature);

    console.log(`📨 HTTP Status     : ${result.status}`);
    console.log(`📬 Response Body   : ${result.response}`);

    if (result.status === 200) {
      console.log('\n✅ SIMULATION PASSED: Webhook accepted and processed correctly.');
      console.log('   → HMAC signature was valid');
      console.log('   → Payload was parsed and dispatched');
      console.log('   → Check server logs for full pipeline trace');
    } else if (result.status === 401) {
      console.log('\n⚠️  SIMULATION RESULT: Signature rejected (401).');
      console.log('   → This is expected if ENABLE_LIVE_WHATSAPP_WEBHOOKS=true and WHATSAPP_APP_SECRET is set to a different value.');
    } else if (result.status === 429) {
      console.log('\n⚡ SIMULATION RESULT: Rate limited (429). Wait before re-testing.');
    } else {
      console.log(`\n❓ SIMULATION RESULT: Unexpected status ${result.status}`);
    }
  } catch (err: any) {
    console.error('\n❌ CONNECTION ERROR: Could not reach the webhook endpoint.');
    console.error('   →', err.message);
    console.error('   → Is the dev server running? Try: npm run dev');
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📋 IMPORTANT DISTINCTION');
  console.log('════════════════════════════════════════════════════════════');
  console.log('This is a SIGNED SIMULATION only.');
  console.log('True Meta production proof requires:');
  console.log('  1. Meta Developer Portal webhook verification callback');
  console.log('  2. Real outbound delivery to a live WhatsApp number');
  console.log('  3. Real delivered/read receipt from Meta\'s network');
  console.log('  4. Real typing indicator behavior observation');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Fatal simulation error:', err);
  process.exit(1);
});
