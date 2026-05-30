import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from './whatsapp';

/**
 * Service to process queued and retrying messages in outbound_message_delivery.
 * Can be run as a cron job, a serverless API function, or inside an isolated background worker.
 */
export async function processOutboundRetries(): Promise<{
  processed: number;
  successes: number;
  failures: number;
  deadLetters: number;
}> {
  console.log('[Delivery Worker] Starting outbound retry execution loop...');
  const adminClient = await createAdminClient();

  // Fetch pending messages that need a retry
  // Conditions: status is 'queued' or 'retrying', and retry_count < max_retries
  const { data: records, error: fetchErr } = await adminClient
    .from('outbound_message_delivery')
    .select(`
      id,
      message_id,
      organization_id,
      retry_count,
      max_retries,
      status,
      error_logs,
      messages (
        id,
        body,
        direction,
        conversations (
          id,
          customer_id,
          customers (
            phone_number
          )
        )
      )
    `)
    .in('status', ['queued', 'retrying'])
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('[Delivery Worker] Failed to fetch retrying messages:', fetchErr.message);
    return { processed: 0, successes: 0, failures: 0, deadLetters: 0 };
  }

  if (!records || records.length === 0) {
    console.log('[Delivery Worker] No outbound messages pending retry.');
    return { processed: 0, successes: 0, failures: 0, deadLetters: 0 };
  }

  console.log(`[Delivery Worker] Found ${records.length} pending deliveries to process.`);

  let successes = 0;
  let failures = 0;
  let deadLetters = 0;

  for (const record of records) {
    const msg = record.messages as any;
    if (!msg || !msg.conversations?.customers?.phone_number) {
      console.warn(`[Delivery Worker] Record ${record.id} contains invalid message mapping. Moving to Dead Letter.`);
      
      await adminClient
        .from('outbound_message_delivery')
        .update({
          status: 'dead_letter',
          last_attempt_at: new Date().toISOString(),
          error_logs: [
            ...(record.error_logs || []),
            {
              timestamp: new Date().toISOString(),
              error: 'Invalid message or customer phone mapping'
            }
          ]
        })
        .eq('id', record.id);
      
      deadLetters++;
      continue;
    }

    const toPhone = msg.conversations.customers.phone_number;
    const body = msg.body;
    const currentAttempt = record.retry_count + 1;

    console.log(`[Delivery Worker] Processing record ${record.id} | Attempt ${currentAttempt}/${record.max_retries} to +${toPhone}`);

    // Update status to 'processing' to lock the record
    await adminClient
      .from('outbound_message_delivery')
      .update({ status: 'processing', last_attempt_at: new Date().toISOString() })
      .eq('id', record.id);

    try {
      const whatsappResponse = await sendWhatsAppMessage(
        toPhone,
        body,
        undefined,
        undefined,
        record.organization_id,
        msg.conversations.id
      );

      if (whatsappResponse.success && whatsappResponse.messageId) {
        // Success! Update both the delivery record and the message status
        await adminClient
          .from('outbound_message_delivery')
          .update({
            status: 'sent',
            retry_count: currentAttempt,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        await adminClient
          .from('messages')
          .update({
            provider_message_id: whatsappResponse.messageId,
            delivery_status: 'sent',
            error_message: null
          })
          .eq('id', msg.id);

        // Audit Log and Event
        await adminClient.from('conversation_events').insert({
          conversation_id: msg.conversations.id,
          organization_id: record.organization_id,
          event_type: 'messaging.retry_success',
          payload: { message_id: msg.id, attempt: currentAttempt }
        });

        console.log(`[Delivery Worker] Successful dispatch for record ${record.id}`);
        successes++;
      } else {
        throw new Error(whatsappResponse.error || 'Unknown dispatch failure');
      }
    } catch (err: any) {
      const isDeadLetter = currentAttempt >= record.max_retries;
      const nextStatus = isDeadLetter ? 'dead_letter' : 'retrying';
      const errorMessage = err.message || 'WhatsApp Cloud API rejection';

      console.warn(`[Delivery Worker] Attempt ${currentAttempt} failed for record ${record.id}: ${errorMessage}`);

      const newLogs = [
        ...(record.error_logs || []),
        {
          timestamp: new Date().toISOString(),
          attempt: currentAttempt,
          error: errorMessage
        }
      ];

      await adminClient
        .from('outbound_message_delivery')
        .update({
          status: nextStatus,
          retry_count: currentAttempt,
          last_attempt_at: new Date().toISOString(),
          error_logs: newLogs
        })
        .eq('id', record.id);

      if (isDeadLetter) {
        // Permanent failure -> Update message status to failed
        await adminClient
          .from('messages')
          .update({
            delivery_status: 'failed',
            error_message: `Outbound retry failed after ${record.max_retries} attempts. Last error: ${errorMessage}`
          })
          .eq('id', msg.id);

        // Audit Log and Event
        await adminClient.from('conversation_events').insert({
          conversation_id: msg.conversations.id,
          organization_id: record.organization_id,
          event_type: 'messaging.dead_letter',
          payload: { message_id: msg.id, attempts: currentAttempt, last_error: errorMessage }
        });

        console.error(`[Delivery Worker] Record ${record.id} exhausted all retries. Moved to DEAD_LETTER.`);
        deadLetters++;
      } else {
        failures++;
      }
    }
  }

  return {
    processed: records.length,
    successes,
    failures,
    deadLetters
  };
}
