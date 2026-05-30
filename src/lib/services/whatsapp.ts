/**
 * Oye AI - Official WhatsApp Cloud API Messenger
 * Scope: Handles outbound messaging payloads to Meta endpoints or graceful local console logging.
 */

interface SendWhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

import { createAdminClient } from '@/lib/supabase/server';

export async function sendWhatsAppMessage(
  toPhone: string,
  messageBody: string,
  phoneIdOverride?: string,
  tokenOverride?: string,
  organizationId?: string,
  conversationId?: string
): Promise<SendWhatsAppResponse> {
  const disableOutbound = process.env.DISABLE_OUTBOUND_WHATSAPP === 'true';
  if (disableOutbound) {
    console.warn('[WhatsApp Outbound] CRITICAL: Outbound WhatsApp messaging blocked via DISABLE_OUTBOUND_WHATSAPP kill switch.');
    return { success: false, error: 'Outbound WhatsApp is globally disabled via DISABLE_OUTBOUND_WHATSAPP kill switch.' };
  }

  const phoneId = phoneIdOverride || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiToken = tokenOverride || process.env.WHATSAPP_API_TOKEN;
  const enableRealReplies = process.env.ENABLE_REAL_WHATSAPP_REPLIES === 'true';

  // Normalize target phone number (remove any leading + for Meta API format if needed, but Meta usually accepts E.164 without '+' or with '+')
  const cleanPhone = toPhone.replace('+', '').trim();

  console.log(`[WhatsApp Outbound] Preparing delivery to +${cleanPhone} | Mode: ${enableRealReplies ? 'REAL' : 'LOG_ONLY'}`);

  if (!enableRealReplies) {
    console.log(`[WhatsApp Mock Reply] -----------------------------`);
    console.log(`[TO]: +${cleanPhone}`);
    console.log(`[BODY]:\n${messageBody}`);
    console.log(`-------------------------------------------------`);
    const mockId = `mock-msg-${Date.now()}`;

    if (organizationId) {
      try {
        const adminClient = await createAdminClient();
        await adminClient.from('message_delivery_traces').insert({
          message_id: mockId,
          organization_id: organizationId,
          conversation_id: conversationId || null,
          status: 'sent',
          dispatched_at: new Date().toISOString(),
        });
        console.log(`[WhatsApp Outbound] Logged mock message trace to message_delivery_traces: ${mockId}`);
      } catch (err: any) {
        console.warn('[WhatsApp Outbound] Failed to log mock message trace to DB:', err.message);
      }
    }

    return { success: true, messageId: mockId };
  }

  if (!phoneId || !apiToken) {
    const missing = !phoneId ? 'WHATSAPP_PHONE_NUMBER_ID' : 'WHATSAPP_API_TOKEN';
    console.error(`[WhatsApp Outbound] Critical Error: Outbound messaging is enabled but ${missing} is missing.`);
    return { success: false, error: `${missing} is unconfigured` };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: true,
          body: messageBody,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Meta API] Response error:', result);
      return {
        success: false,
        error: result.error?.message || `Meta API returned HTTP status ${response.status}`,
      };
    }

    const providerMsgId = result.messages?.[0]?.id;
    console.log(`[WhatsApp Outbound] Delivery succeeded. Meta Message ID: ${providerMsgId}`);

    if (organizationId && providerMsgId) {
      try {
        const adminClient = await createAdminClient();
        await adminClient.from('message_delivery_traces').insert({
          message_id: providerMsgId,
          organization_id: organizationId,
          conversation_id: conversationId || null,
          status: 'sent',
          dispatched_at: new Date().toISOString(),
        });
        console.log(`[WhatsApp Outbound] Logged message trace to message_delivery_traces: ${providerMsgId}`);
      } catch (err: any) {
        console.warn('[WhatsApp Outbound] Failed to log message trace to DB:', err.message);
      }
    }

    return { success: true, messageId: providerMsgId };
  } catch (error: any) {
    console.error('[WhatsApp Outbound] Network/Request exception:', error);
    return { success: false, error: error.message || 'Meta API network request failed' };
  }
}

export async function sendWhatsAppTypingIndicator(
  toPhone: string,
  state: 'typing_on' | 'typing_off',
  phoneIdOverride?: string,
  tokenOverride?: string
): Promise<boolean> {
  const disableOutbound = process.env.DISABLE_OUTBOUND_WHATSAPP === 'true';
  if (disableOutbound) {
    console.warn('[WhatsApp Outbound] Typing indicator blocked via DISABLE_OUTBOUND_WHATSAPP kill switch.');
    return false;
  }

  const phoneId = phoneIdOverride || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiToken = tokenOverride || process.env.WHATSAPP_API_TOKEN;
  const enableRealReplies = process.env.ENABLE_REAL_WHATSAPP_REPLIES === 'true';

  // Normalize target phone number
  const cleanPhone = toPhone.replace('+', '').trim();

  console.log(`[WhatsApp Outbound] Sending typing indicator [${state}] to +${cleanPhone} | Mode: ${enableRealReplies ? 'REAL' : 'LOG_ONLY'}`);

  if (!enableRealReplies) {
    console.log(`[WhatsApp Mock Typing] Sending typing indicator: [${state}] to +${cleanPhone}`);
    return true;
  }

  if (!phoneId || !apiToken) {
    const missing = !phoneId ? 'WHATSAPP_PHONE_NUMBER_ID' : 'WHATSAPP_API_TOKEN';
    console.error(`[WhatsApp Outbound] Typing indicator error: Outbound messaging is enabled but ${missing} is missing.`);
    return false;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        sender_action: state
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Meta API] Typing indicator response error:', result);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[WhatsApp Outbound] Typing indicator exception:', error);
    return false;
  }
}

