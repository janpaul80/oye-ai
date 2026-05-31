import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isRateLimited } from '@/lib/services/rate-limiter';
import crypto from 'crypto';

/**
 * GET - WhatsApp Webhook Verification
 * Meta developer portal handshakes.
 */
export async function GET(request: NextRequest) {
  // Rate Limiting Protection (Max 30 requests, 1 refill/sec)
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await isRateLimited(ip, 'whatsapp-verify', 30, 1);
  if (limitResult.limited) {
    return new Response('Too Many Requests', { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const localVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'oye_ai_verify_token_default_123';

  if (mode === 'subscribe' && token === localVerifyToken) {
    console.log('[WhatsApp Webhook] Handshake verified successfully.');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[WhatsApp Webhook] Handshake validation failed. Tokens did not match.');
  return new Response('Forbidden', { status: 403 });
}

/**
 * POST - Inbound WhatsApp Webhook Ingestion
 * Parses incoming message payloads, handles metadata safely,
 * and persists entries into Supabase under multi-tenant scoping.
 */
export async function POST(request: NextRequest) {
  // Rate Limiting Protection (Max 120 requests capacity, 5 refills/sec for webhook spikes)
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await isRateLimited(ip, 'whatsapp-ingest', 120, 5);
  if (limitResult.limited) {
    try {
      const adminClient = await createAdminClient();
      await adminClient.from('audit_logs').insert({
        organization_id: '88888888-8888-8888-8888-888888888888',
        action: 'security.whatsapp_rate_limited',
        details: { ip, limit: 120 }
      });
    } catch {}
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Webhook Replay and Authenticity Protection via HMAC SHA256 check
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const enableLiveVerification = process.env.ENABLE_LIVE_WHATSAPP_WEBHOOKS === 'true';

    if (enableLiveVerification) {
      if (!appSecret || appSecret === 'abc123secret') {
        console.error('[WhatsApp Webhook] CRITICAL: Live validation enabled but WHATSAPP_APP_SECRET is unconfigured or insecure.');
        return NextResponse.json({ error: 'Insecure webhook configuration' }, { status: 401 });
      }

      if (!signature) {
        console.error('[WhatsApp Webhook] Missing x-hub-signature-256 header. Rejected.');
        try {
          const adminClient = await createAdminClient();
          await adminClient.from('audit_logs').insert({
            organization_id: '88888888-8888-8888-8888-888888888888',
            action: 'security.whatsapp_signature_missing',
            details: { signature }
          });
        } catch {}
        return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
      }

      const hmac = crypto.createHmac('sha256', appSecret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

      // Use timing-safe equal to prevent timing attacks safely
      let matched = false;
      try {
        const sigBuffer = Buffer.from(signature);
        const digestBuffer = Buffer.from(digest);
        if (sigBuffer.length === digestBuffer.length) {
          matched = crypto.timingSafeEqual(sigBuffer, digestBuffer);
        } else {
          // Burn equivalent comparison time on mismatch to avoid length timing side-channels
          crypto.timingSafeEqual(sigBuffer, sigBuffer);
        }
      } catch (err: any) {
        console.error('[WhatsApp Webhook] Timing safe signature comparison error:', err.message);
      }

      if (!matched) {
        console.error('[WhatsApp Webhook] HMAC SHA256 signature verification failed.');
        try {
          const adminClient = await createAdminClient();
          await adminClient.from('audit_logs').insert({
            organization_id: '88888888-8888-8888-8888-888888888888',
            action: 'security.whatsapp_signature_failure',
            details: { signature, expected: digest }
          });
        } catch {}
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    } else {
      // Mock/dev mode validation if a valid app secret is provided, otherwise warning bypass
      if (appSecret && appSecret !== 'abc123secret') {
        if (!signature) {
          console.warn('[WhatsApp Webhook] Non-live mode signature missing but secret exists. Bypassing validation.');
        } else {
          const hmac = crypto.createHmac('sha256', appSecret);
          const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
          let matched = false;
          try {
            const sigBuffer = Buffer.from(signature);
            const digestBuffer = Buffer.from(digest);
            if (sigBuffer.length === digestBuffer.length) {
              matched = crypto.timingSafeEqual(sigBuffer, digestBuffer);
            } else {
              crypto.timingSafeEqual(sigBuffer, sigBuffer);
            }
          } catch {}
          if (!matched) {
            console.warn('[WhatsApp Webhook] Non-live mode signature verification failed.');
          }
        }
      }
    }

    const payload = JSON.parse(rawBody);

    // Safe, non-sensitive event logger
    const isStatus = !!payload.entry?.[0]?.changes?.[0]?.value?.statuses;
    const isMessage = !!payload.entry?.[0]?.changes?.[0]?.value?.messages;
    console.log(
      `[WhatsApp Webhook] Verified Event Metadata | object: ${payload.object} | type: ${
        isStatus ? 'status_receipt' : isMessage ? 'incoming_message' : 'other'
      }`
    );

    // 1. Meta validation
    if (!payload.object || payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid object scope' }, { status: 400 });
    }

    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle incoming message receipts (Sent, Delivered, Read logs)
    if (value?.statuses?.[0]) {
      const statusObj = value.statuses[0];
      const providerMsgId = statusObj.id;
      const deliveryStatus = statusObj.status; // sent | delivered | read | failed
      const timestampSecStr = statusObj.timestamp;
      const eventTime = timestampSecStr ? new Date(parseInt(timestampSecStr) * 1000) : new Date();
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && !supabaseUrl.includes('missing-supabase-url')) {
        const adminClient = await createAdminClient();
        
        // 1. Update standard messages table
        const { error } = await adminClient
          .from('messages')
          .update({ delivery_status: deliveryStatus })
          .eq('provider_message_id', providerMsgId);
          
        if (error) {
          console.error('[WhatsApp Webhook] Error updating status receipt:', error.message);
        } else {
          console.log(`[WhatsApp Webhook] Status Sync: ${providerMsgId} -> ${deliveryStatus}`);
        }

        // 2. Fetch and update the trace in message_delivery_traces to calculate latencies
        try {
          const { data: trace } = await adminClient
            .from('message_delivery_traces')
            .select('*')
            .eq('message_id', providerMsgId)
            .limit(1)
            .single();

          if (trace) {
            const updates: any = {
              status: deliveryStatus,
            };

            const dispatchedTime = new Date(trace.dispatched_at).getTime();

            if (deliveryStatus === 'delivered') {
              updates.delivered_at = eventTime.toISOString();
              updates.latency_dispatch_to_delivered_ms = Math.max(0, eventTime.getTime() - dispatchedTime);
            } else if (deliveryStatus === 'read') {
              updates.read_at = eventTime.toISOString();
              const deliveredTime = trace.delivered_at ? new Date(trace.delivered_at).getTime() : dispatchedTime;
              updates.latency_delivered_to_read_ms = Math.max(0, eventTime.getTime() - deliveredTime);
            } else if (deliveryStatus === 'failed') {
              updates.error_message = statusObj.errors?.[0]?.message || 'Meta API delivery failure status';
            }

            await adminClient
              .from('message_delivery_traces')
              .update(updates)
              .eq('message_id', providerMsgId);

            console.log(`[WhatsApp Webhook] Outbound Trace Updated: ${providerMsgId} -> ${deliveryStatus} | Latency: ${
              deliveryStatus === 'delivered' ? updates.latency_dispatch_to_delivered_ms + 'ms' : 
              deliveryStatus === 'read' ? updates.latency_delivered_to_read_ms + 'ms' : 'N/A'
            }`);
          } else {
            // Create a trace record if not found (fallback)
            const updates: any = {
              message_id: providerMsgId,
              organization_id: '88888888-8888-8888-8888-888888888888',
              status: deliveryStatus,
              dispatched_at: new Date().toISOString(),
            };
            if (deliveryStatus === 'delivered') {
              updates.delivered_at = eventTime.toISOString();
            } else if (deliveryStatus === 'read') {
              updates.read_at = eventTime.toISOString();
            }
            await adminClient.from('message_delivery_traces').insert(updates);
          }
        } catch (traceErr: any) {
          console.warn('[WhatsApp Webhook] Failed to update delivery trace:', traceErr.message);
        }
      }
      return NextResponse.json({ success: true, event: 'status_synced' }, { status: 200 });
    }

    // Handle inbound messages
    if (value?.messages?.[0]) {
      const metadata = value.metadata;
      const phoneId = metadata?.phone_number_id; // Meta Phone ID
      
      const messageData = value.messages[0];
      const fromPhone = messageData.from; // Customer phone (E.164)
      const providerMsgId = messageData.id; // Unique Meta Message ID (used for Idempotency)
      
      const contactObj = value.contacts?.[0];
      const customerName = contactObj?.profile?.name || `WhatsApp Client ${fromPhone.slice(-4)}`;
      
      let messageBody = '';
      let messageType = messageData.type; // text | image | audio | document
      
      if (messageType === 'text') {
        messageBody = messageData.text?.body || '';
      } else if (messageType === 'audio') {
        messageBody = '[Voice Note / Audio Attachment]';
      } else {
        messageBody = `[Meta Media Attachment: ${messageType}]`;
      }

      console.log(`[WhatsApp Webhook] Inbound text: "${messageBody}" | from: ${fromPhone}`);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      // Graceful Fallback: Proceed with log outputs if Supabase keys are missing
      if (!supabaseUrl || supabaseUrl.includes('missing-supabase-url')) {
        console.warn(
          '[WhatsApp Webhook] Graceful Fallback Active: Real Supabase credentials missing. Webhook event discarded safely.'
        );
        return NextResponse.json(
          { success: true, processed: 'graceful_fallback_active' },
          { status: 200 }
        );
      }

      // Initialize elevated admin client bypassing RLS (safe for background webhook ingestion)
      const adminClient = await createAdminClient();

      // Step A: Find the active communications channel
      let { data: channel, error: channelErr } = await adminClient
        .from('channels')
        .select('*')
        .eq('provider_channel_id', phoneId)
        .limit(1)
        .single();

      if (channelErr || !channel) {
        console.warn('[WhatsApp Webhook] Matching channel not found in DB. Falling back to default channel search.');
        // Lookup the first WhatsApp channel on the platform as fallback
        const { data: fallbackChannel } = await adminClient
          .from('channels')
          .select('*')
          .eq('type', 'whatsapp')
          .limit(1)
          .single();
        
        channel = fallbackChannel;
      }

      if (!channel) {
        console.error('[WhatsApp Webhook] Critical: No WhatsApp channels are configured in the database.');
        return NextResponse.json({ error: 'Configured channel missing' }, { status: 200 });
      }

      const orgId = channel.organization_id;

      // Check organization status for controlled beta gate & billing status policy layer
      const { data: org, error: orgErr } = await adminClient
        .from('organizations')
        .select('status, billing_status')
        .eq('id', orgId)
        .single();
      
      if (orgErr || !org) {
        console.error('[WhatsApp Webhook] Organization lookup failed or organization not found for channel:', phoneId);
      }
      
      const isApproved = org && 
        (org.status === 'active' || org.status === 'beta_approved') &&
        (org.status !== 'suspended') &&
        (org.billing_status !== 'suspended' && org.billing_status !== 'canceled');

      // Step B: Upsert Customer Profile (Enforce multi-tenant unique E.164 phone numbers)
      const { data: customer, error: customerErr } = await adminClient
        .from('customers')
        .upsert(
          {
            organization_id: orgId,
            phone_number: fromPhone,
            name: customerName,
          },
          { onConflict: 'organization_id,phone_number' }
        )
        .select()
        .single();

      if (customerErr || !customer) {
        console.error('[WhatsApp Webhook] Customer upsert error:', customerErr?.message);
        return NextResponse.json({ error: 'Customer persistence failed' }, { status: 200 });
      }

      // Step C: Retrieve or open active Conversation thread
      let { data: conversation, error: conversationErr } = await adminClient
        .from('conversations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('customer_id', customer.id)
        .eq('status', 'open')
        .limit(1)
        .single();

      if (conversationErr || !conversation) {
        // Provision a fresh conversation thread
        const { data: newConv, error: newConvErr } = await adminClient
          .from('conversations')
          .insert({
            organization_id: orgId,
            customer_id: customer.id,
            channel_id: channel.id,
            status: 'open',
            mode: 'ai',
            language: 'es',
          })
          .select()
          .single();

        if (newConvErr || !newConv) {
          console.error('[WhatsApp Webhook] Conversation provisioning failed:', newConvErr?.message);
          return NextResponse.json({ error: 'Conversation creation failed' }, { status: 200 });
        }
        
        conversation = newConv;
      }

      // Step D: Insert the incoming Message (Enforces absolute transaction Idempotency)
      const { data: insertedMessage, error: messageErr } = await adminClient
        .from('messages')
        .insert({
          organization_id: orgId,
          conversation_id: conversation.id,
          direction: 'inbound',
          sender_type: 'customer',
          sender_id: customer.id,
          message_type: messageType === 'text' ? 'text' : messageType === 'audio' ? 'audio' : 'document',
          body: messageBody,
          provider_message_id: providerMsgId,
          delivery_status: 'read',
        })
        .select()
        .single();

      if (messageErr) {
        // If conflict code 23505 occurs (unique constraint violated), it is a duplicate webhook trigger.
        // We log and return 200 OK cleanly to stop retries.
        if (messageErr.code === '23505') {
          console.log(`[WhatsApp Webhook] Idempotency Check: Ignored duplicate message ID ${providerMsgId}`);
          return NextResponse.json({ success: true, processed: 'idempotent_duplicate_ignored' }, { status: 200 });
        }
        console.error('[WhatsApp Webhook] Message insertion error:', messageErr.message);
        return NextResponse.json({ error: 'Message persistence failed' }, { status: 200 });
      }

      console.log(`[WhatsApp Webhook] Saved Inbound Message: ${insertedMessage.id}`);

      // Step E: Trigger background queue AI reply pipeline if conversation is in AI auto mode
      if (conversation.mode === 'ai') {
        if (!isApproved) {
          console.warn(`[WhatsApp Webhook] Blocked AI replies and outbound dispatch jobs for non-approved organization ${orgId} (Status: ${org?.status}, Billing Status: ${org?.billing_status})`);
        } else {
          const traceId = request.headers.get('x-trace-id') || `trace_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`;

          // Working Hours Organization Check
          const { data: settings } = await adminClient
            .from('organization_settings')
            .select('*')
            .eq('organization_id', orgId)
            .single();

          let isOutOfHours = false;
          if (settings) {
             const now = new Date();
             const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
             const currentDayStr = dayMap[now.getDay()];

             if (settings.working_days && Array.isArray(settings.working_days) && !settings.working_days.includes(currentDayStr)) {
               isOutOfHours = true;
             } else if (settings.working_hours_start && settings.working_hours_end) {
               const currentHour = now.getHours();
               const currentMinutes = now.getMinutes();
               const currentTimeVal = currentHour + (currentMinutes / 60);

               const [startH, startM] = settings.working_hours_start.split(':').map(Number);
               const [endH, endM] = settings.working_hours_end.split(':').map(Number);
               const startTimeVal = startH + (startM / 60);
               const endTimeVal = endH + (endM / 60);

               if (currentTimeVal < startTimeVal || currentTimeVal >= endTimeVal) {
                 isOutOfHours = true;
               }
             }
          }

          if (isOutOfHours) {
            console.log(`[WhatsApp Webhook][Trace: ${traceId}] Out-of-Hours detected for Org ${orgId}. Sending fallback out-of-hours message.`);
            // Create Out of Hours outbound dispatch job directly without AI inference
            import('@/lib/services/queue').then(({ QueueService }) => {
              QueueService.addJob(
                'outbound_dispatches',
                'whatsapp.outbound_dispatch',
                {
                  orgId,
                  conversationId: conversation.id,
                  toPhone: fromPhone,
                  text: "Actualmente nos encontramos fuera del horario de atención. Un agente se pondrá en contacto contigo a la brevedad cuando regresemos. ¡Gracias por tu mensaje!"
                },
                { organizationId: orgId, traceId, maxRetries: 3 }
              ).catch(console.error);
            });
          } else {
            console.log(`[WhatsApp Webhook][Trace: ${traceId}] Enqueuing background AI responder job for conv ${conversation.id}`);
            import('@/lib/services/queue').then(({ QueueService }) => {
              QueueService.addJob(
                'incoming_messages',
                'ai.cascade_inference',
                {
                  orgId,
                  conversationId: conversation.id,
                  latestMessageBody: messageBody,
                  fromPhone
                },
                {
                  organizationId: orgId,
                  traceId,
                  maxRetries: 3
                }
              ).catch((err) => {
                console.error(`[WhatsApp Webhook][Trace: ${traceId}] Failed to enqueue background AI responder job:`, err);
              });
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, processed: 'queued' }, { status: 200 });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Ingestion error:', error);
    return NextResponse.json({ error: error.message || 'Critical failure' }, { status: 200 });
  }
}
