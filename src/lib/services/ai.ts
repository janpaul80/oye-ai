import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage, sendWhatsAppTypingIndicator } from './whatsapp';
import crypto from 'crypto';
import { TelemetryService } from './observability';

/**
 * AI Provider Registry interfaces & types
 */
export interface AIServiceResponse {
  text: string;
  tokensUsed: number;
}

export interface AIServiceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  name: string;
  generateCompletion(
    messages: AIServiceMessage[],
    modelName: string,
    temperature: number,
    timeoutMs?: number
  ): Promise<AIServiceResponse>;
}

/**
 * UTILITY: fetchWithRetryAndTimeout
 * Resilient wrapper handling timeouts, exponential backoff retries (429/5xx), and abort signaling.
 */
async function fetchWithRetryAndTimeout(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeoutMs = 10000
): Promise<Response> {
  let attempt = 0;
  let delay = 1000; // start with 1s delay

  while (attempt < maxRetries) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);

      // Retry on HTTP 429 (Rate Limit) or HTTP 5xx (Server Gateways)
      if (response.status === 429 || response.status >= 500) {
        attempt++;
        if (attempt >= maxRetries) return response;
        console.warn(`[AI Engine] Attempt ${attempt} returned HTTP ${response.status}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential scaling
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(id);
      attempt++;
      if (attempt >= maxRetries) throw err;
      const isTimeout = err.name === 'AbortError';
      console.warn(`[AI Engine] Attempt ${attempt} failed due to ${isTimeout ? 'Timeout' : err.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error('AI Engine fetch failed after maximum retry attempts.');
}

/**
 * 1. LANGDOCK PROVIDER ADAPTER
 * Primary SaaS runner routing OpenAI, Anthropic, or Gemini models via Langdock API keys.
 */
const langdockProvider: AIProvider = {
  name: 'langdock',
  async generateCompletion(messages, modelName, temperature, timeoutMs) {
    const apiKey = process.env.LANGDOCK_API_KEY;
    if (!apiKey) {
      throw new Error('Langdock API key is missing.');
    }

    const region = process.env.LANGDOCK_REGION || 'us';
    const url = process.env.LANGDOCK_OPENAI_BASE_URL || `https://api.langdock.com/openai/${region}/v1/chat/completions`;

    const response = await fetchWithRetryAndTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName || 'gpt-4o',
        messages: messages,
        temperature: temperature,
      }),
    }, 3, timeoutMs);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Langdock responded with HTTP status ${response.status}`);
    }

    const text = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    return { text, tokensUsed };
  }
};

/**
 * 2. OPENAI PROVIDER ADAPTER (Direct fallback)
 */
const openaiProvider: AIProvider = {
  name: 'openai',
  async generateCompletion(messages, modelName, temperature, timeoutMs) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Direct OpenAI API key is missing.');
    }

    const model = modelName || process.env.LANGDOCK_OPENAI_MODEL || 'gpt-5-mini';

    const response = await fetchWithRetryAndTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    }, 3, timeoutMs);

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'OpenAI API returned error');

    return {
      text: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
    };
  }
};

/**
 * 3. ANTHROPIC PROVIDER ADAPTER (Direct fallback)
 */
const anthropicProvider: AIProvider = {
  name: 'anthropic',
  async generateCompletion(messages, modelName, temperature, timeoutMs) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Direct Anthropic API key is missing.');
    }

    const model = modelName || process.env.LANGDOCK_ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    // Restructure messages to Anthropic's expected standard
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content
    }));

    const response = await fetchWithRetryAndTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemMessage,
        messages: chatMessages,
        temperature,
        max_tokens: 1024
      }),
    }, 3, timeoutMs);

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Anthropic API returned error');

    return {
      text: data.content?.[0]?.text || '',
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };
  }
};

/**
 * 4. GEMINI PROVIDER ADAPTER (Direct fallback)
 */
const geminiProvider: AIProvider = {
  name: 'gemini',
  async generateCompletion(messages, modelName, temperature, timeoutMs) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Direct Gemini API key is missing.');
    }

    const model = modelName || process.env.LANGDOCK_GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = messages.map(m => {
      let role = 'user';
      if (m.role === 'assistant') role = 'model';
      return {
        role,
        parts: [{ text: m.content }]
      };
    });

    const response = await fetchWithRetryAndTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }, 3, timeoutMs);

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API returned error');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      text,
      tokensUsed: 150 // Standard token estimation for fallback mapping
    };
  }
};

/**
 * DECOUPLED PROVIDER REGISTRY
 */
const providerRegistry: Record<string, AIProvider> = {
  langdock: langdockProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

/**
 * Helper to assess active provider key configurations
 */
function checkProviderHealth(provider: string): boolean {
  switch (provider) {
    case 'langdock':
      return !!process.env.LANGDOCK_API_KEY;
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'gemini':
      return !!process.env.GEMINI_API_KEY;
    default:
      return false;
  }
}

/**
 * Master dispatcher handling model routing policies and automatic cascades
 */
export async function generateAICompletionWithFailover(
  messages: AIServiceMessage[],
  preferredProvider: string,
  modelName: string,
  temperature: number,
  traceId: string,
  orgId?: string
): Promise<{ text: string; tokensUsed: number; usedProvider: string }> {
  // SLA Route Balancer integration: dynamically adjust the preferred provider based on historical SLA metrics.
  let activeProvider = preferredProvider;
  try {
    const { GovernanceService } = await import('./autonomous-governance');
    const balancedProvider = await GovernanceService.rebalanceSlaRouting(traceId);
    if (balancedProvider && balancedProvider !== preferredProvider) {
      console.log(`[AI Engine] [Trace: ${traceId}] SLA route balancer adjusted preferred provider: ${preferredProvider} -> ${balancedProvider}`);
      activeProvider = balancedProvider;
    }
  } catch (err: any) {
    console.error(`[AI Engine] SLA Route Balancer failed to evaluate:`, err.message);
  }

  // Cascading priority order
  const fallbackOrder = ['langdock', 'openai', 'anthropic', 'gemini'];
  
  // Reorder list to execute active provider first
  const providersToTry = [
    activeProvider,
    ...fallbackOrder.filter(p => p !== activeProvider)
  ];

  const startTime = Date.now();

  for (const providerKey of providersToTry) {
    const provider = providerRegistry[providerKey];
    if (!provider) continue;

    const isHealthy = checkProviderHealth(providerKey);
    if (!isHealthy) {
      console.warn(`[AI Engine] [Trace: ${traceId}] Skip unconfigured/unhealthy provider: ${providerKey}`);
      continue;
    }

    try {
      console.log(`[AI Engine] [Trace: ${traceId}] Attempting completion via ${providerKey}...`);
      const response = await provider.generateCompletion(messages, modelName, temperature, 10000);
      
      const duration = Date.now() - startTime;
      const tokens = response.tokensUsed || 150;
      const estimatedCost = tokens * (0.30 / 1000000); // average blended rate of $0.30 per 1M tokens
      const failoverEngaged = providerKey !== preferredProvider;
      
      // Structured live provider SLA logging
      await TelemetryService.logAICompletion({
        organization_id: orgId,
        provider: providerKey,
        model: modelName || 'unknown',
        latency_ms: duration,
        success: true,
        tokens,
        estimated_cost: estimatedCost,
        trace_id: traceId,
        timeout_occurred: false,
        failover_engaged: failoverEngaged
      });

      // Structured JSON logging format for observability
      console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        trace_id: traceId,
        event: 'ai_completion_success',
        provider: providerKey,
        model: modelName,
        duration_ms: duration,
        tokens_used: response.tokensUsed,
        prompt_message_count: messages.length
      }));

      return {
        text: response.text,
        tokensUsed: response.tokensUsed,
        usedProvider: providerKey
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const isTimeout = err.message?.toLowerCase().includes('timeout') || err.message?.toLowerCase().includes('abort') || false;
      const failoverEngaged = providerKey !== preferredProvider;

      await TelemetryService.logAICompletion({
        organization_id: orgId,
        provider: providerKey,
        model: modelName || 'unknown',
        latency_ms: duration,
        success: false,
        error_message: err.message,
        tokens: 0,
        estimated_cost: 0.00000,
        trace_id: traceId,
        timeout_occurred: isTimeout,
        failover_engaged: failoverEngaged
      });

      console.error(`[AI Engine] [Trace: ${traceId}] Provider ${providerKey} failed: ${err.message}. Routing failover...`);
    }
  }

  // Final emergency degradation fallback
  const duration = Date.now() - startTime;
  console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    trace_id: traceId,
    event: 'ai_completion_total_failure',
    duration_ms: duration
  }));

  return {
    text: '[AI Warning: Todo el sistema de respaldo de IA falló temporalmente.]\n\nDisculpas, nuestro canal inteligente está experimentando congestión. Te atenderemos de inmediato.',
    tokensUsed: 0,
    usedProvider: 'none_degraded'
  };
}

/**
 * Main AI reply logic handler
 * Flow: Fetch prompt configs -> Verify Subscription limits -> Compile CRM memory context 
 *       -> Call provider completion with failover -> Log usage credits -> Fire outbound delivery
 */
export async function handleAiReply(
  orgId: string,
  conversationId: string,
  latestMessageBody: string,
  fromPhone: string,
  passedTraceId?: string
): Promise<void> {
  const traceId = passedTraceId || crypto.randomUUID();
  console.log(`[AI Responder] [Trace: ${traceId}] Triggered processor for conversation: ${conversationId}`);

  const adminClient = await createAdminClient();

  // Step A.0: Fallback Organization Approval check & billing status policy layer
  const { data: org, error: orgErr } = await adminClient
    .from('organizations')
    .select('status, billing_status')
    .eq('id', orgId)
    .single();

  if (orgErr || !org) {
    console.error(`[AI Responder] [Trace: ${traceId}] Organization status lookup failed or org not found for Org ID ${orgId}`);
    return;
  }

  // 1. Lifecycle Status check (organization.status = 'suspended' blocks AI and outbound)
  if (org.status === 'suspended') {
    console.warn(`[AI Responder] [Trace: ${traceId}] Blocked AI replies for suspended organization ${orgId} (Admin Suspension)`);
    
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'security.org_suspended_block',
      payload: { status: org.status }
    });

    await adminClient.from('messages').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      direction: 'outbound',
      sender_type: 'ai',
      message_type: 'text',
      body: '[AI Suspension Block]: Lo sentimos, el canal ha sido suspendido por administración.',
      delivery_status: 'failed',
      error_message: 'AI Responder block: Organization status is suspended'
    });
    return;
  }

  // 2. Controlled Onboarding approval gates
  if (org.status !== 'active' && org.status !== 'beta_approved') {
    console.warn(`[AI Responder] [Trace: ${traceId}] Blocked AI replies for non-approved organization ${orgId} (Status: ${org.status})`);
    
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'security.org_unapproved_block',
      payload: { status: org.status }
    });

    await adminClient.from('messages').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      direction: 'outbound',
      sender_type: 'ai',
      message_type: 'text',
      body: '[AI Approval Block]: Lo sentimos, las funciones de IA están suspendidas o pendientes de aprobación para esta organización.',
      delivery_status: 'failed',
      error_message: `AI Responder block: Organization status is ${org.status}`
    });
    return;
  }

  // 3. Billing Status Policy Layer Check
  // Valid billing statuses: 'trial', 'beta', 'active', 'past_due', 'canceled', 'suspended'
  if (org.billing_status === 'suspended' || org.billing_status === 'canceled') {
    console.warn(`[AI Responder] [Trace: ${traceId}] Blocked AI replies for organization ${orgId} due to billing status: ${org.billing_status}`);
    
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'billing.suspended_block',
      payload: { billing_status: org.billing_status }
    });

    await adminClient.from('messages').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      direction: 'outbound',
      sender_type: 'ai',
      message_type: 'text',
      body: '[AI Billing Block]: Lo sentimos, el canal está suspendido debido a un inconveniente con su pago. Por favor, regularice su suscripción.',
      delivery_status: 'failed',
      error_message: `AI Responder block: Organization billing status is ${org.billing_status}`
    });
    return;
  }

  if (org.billing_status === 'past_due') {
    console.warn(`[AI Responder] [Trace: ${traceId}] Warning: Organization ${orgId} billing is PAST_DUE. Allowing generation but logging warning.`);
    // Insert Audit/Conversation warning event without blocking
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'billing.past_due_warning',
      payload: { billing_status: org.billing_status }
    });
  }

  // Step A: Subscription Quota Enforcement
  const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
  
  // 1. Fetch Subscription level
  const { data: subscription } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .limit(1)
    .single();

  const plan = subscription?.plan_name || 'free';

  // 2. Fetch Usage ledger
  const { data: usage } = await adminClient
    .from('usage_ledger')
    .select('*')
    .eq('organization_id', orgId)
    .eq('month_year', currentMonth)
    .limit(1)
    .single();

  const tokensUsedThisMonth = usage?.tokens_used || 0;

  // Plan limits: free accounts limited to 5,000 monthly tokens
  if (plan === 'free' && tokensUsedThisMonth > 5000) {
    console.error(`[AI Responder] [Trace: ${traceId}] Org ${orgId} exceeded monthly tokens quota (${tokensUsedThisMonth}/5000). Blocking response.`);
    
    // Insert Audit log and Conversation event
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'billing.quota_violated',
      payload: { plan, tokens_used: tokensUsedThisMonth }
    });

    // Save failure notification message
    await adminClient.from('messages').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      direction: 'outbound',
      sender_type: 'ai',
      message_type: 'text',
      body: '[AI Quota Block]: Lo sentimos, el canal ha agotado su cuota mensual de créditos de servicio. Por favor, actualiza tu plan.',
      delivery_status: 'failed',
      error_message: 'Monthly tokens quota exceeded on Free tier.'
    });
    return;
  }

  // Step B: Build CRM Context Memory
  // 1. Fetch active AI Agent details
  const { data: agent, error: agentErr } = await adminClient
    .from('ai_agents')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (agentErr || !agent) {
    console.warn(`[AI Responder] [Trace: ${traceId}] Config missing. Using defaults.`);
  }

  const modelProvider = agent?.model_provider || 'langdock';
  const modelName = agent?.model_name || process.env.LANGDOCK_DEFAULT_MODEL || 'gpt-4o';
  const systemInstruction = agent?.system_prompt || 
    'Eres Oye AI, un asistente conversacional inteligente. Responde siempre con amabilidad en español y ayuda al cliente.';
  const temperature = agent ? Number(agent.temperature) : 0.7;

  // 2. Fetch Customer CRM tags/notes
  const { data: conversation } = await adminClient
    .from('conversations')
    .select('*, customers(*)')
    .eq('id', conversationId)
    .single();

  if (conversation && conversation.mode !== 'ai') {
    console.log(`[AI Responder] [Trace: ${traceId}] Conversation ${conversationId} is in mode [${conversation.mode}]. Skipping automated AI response to avoid operator race condition.`);
    return;
  }

  const customer = conversation?.customers;
  const customerName = customer?.name || 'Cliente';
  const crmAttributes = customer?.custom_attributes || {};

  let customAttributesContext = `Información Adicional del Cliente (${customerName}):\n`;
  if (crmAttributes && typeof crmAttributes === 'object') {
    Object.entries(crmAttributes).forEach(([key, val]) => {
      customAttributesContext += `- ${key}: ${JSON.stringify(val)}\n`;
    });
  }

  // 3. Compile Message Thread history (Max 12 messages for memory slot)
  const { data: messageLogs } = await adminClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(12);

  const llmMessages: AIServiceMessage[] = [];

  // Inject system prompt with customized CRM indicators
  const fullSystemPrompt = `${systemInstruction}\n\n${customAttributesContext}`;
  llmMessages.push({ role: 'system', content: fullSystemPrompt });

  if (messageLogs && messageLogs.length > 0) {
    messageLogs.forEach(msg => {
      const role = msg.direction === 'inbound' 
        ? 'user' 
        : 'assistant';
      llmMessages.push({ role, content: msg.body || '' });
    });
  } else {
    llmMessages.push({ role: 'user', content: latestMessageBody });
  }

  // Step B.5: Bounded WhatsApp Typing Simulation (2s - 8s)
  const typingDuration = Math.min(8000, Math.max(2000, latestMessageBody.length * 50));
  console.log(`[AI Responder] [Trace: ${traceId}] Starting typing simulation for ${typingDuration}ms`);
  
  // Verify conversation is still in AI mode before starting typing
  const { data: initialConvCheck } = await adminClient
    .from('conversations')
    .select('mode')
    .eq('id', conversationId)
    .single();

  if (initialConvCheck && initialConvCheck.mode === 'ai') {
    try {
      // Execute without awaiting to keep it completely non-blocking for response dispatch
      sendWhatsAppTypingIndicator(fromPhone, 'typing_on').catch(err => {
        console.error(`[AI Responder] [Trace: ${traceId}] Non-fatal typing_on error:`, err.message);
      });
    } catch (err: any) {
      console.error(`[AI Responder] [Trace: ${traceId}] Non-fatal typing_on sync exception:`, err.message);
    }
  }

  // Wait for typingDuration, checking for human takeover periodically
  const checkIntervalMs = 500;
  let elapsedMs = 0;
  let humanTakeoverEngaged = false;
  
  while (elapsedMs < typingDuration) {
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    elapsedMs += checkIntervalMs;
    
    // Check conversation mode
    const { data: convCheck } = await adminClient
      .from('conversations')
      .select('mode')
      .eq('id', conversationId)
      .single();
      
    if (convCheck && convCheck.mode !== 'ai') {
      console.log(`[AI Responder] [Trace: ${traceId}] Human takeover detected during typing simulation (mode: ${convCheck.mode}). Aborting instantly.`);
      humanTakeoverEngaged = true;
      break;
    }
  }
  
  // Turn typing off safely
  try {
    sendWhatsAppTypingIndicator(fromPhone, 'typing_off').catch(err => {
      console.error(`[AI Responder] [Trace: ${traceId}] Non-fatal typing_off error:`, err.message);
    });
  } catch (err: any) {
    console.error(`[AI Responder] [Trace: ${traceId}] Non-fatal typing_off sync exception:`, err.message);
  }
  
  if (humanTakeoverEngaged) {
    // Save system trace to conversation_events
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'operator.takeover_intercept',
      payload: { reason: 'Operator took over conversation during AI typing simulation' }
    });
    return;
  }

  // Step C: Execute completions with resilient failover cascade routing
  const completionResult = await generateAICompletionWithFailover(
    llmMessages,
    modelProvider,
    modelName,
    temperature,
    traceId,
    orgId
  );

  const aiReplyText = completionResult.text;
  const tokensGenerated = completionResult.tokensUsed;

  // Step D: Outbound queue state persistence
  // Save message as 'processing' state first
  const { data: insertedMsg, error: insertErr } = await adminClient
    .from('messages')
    .insert({
      organization_id: orgId,
      conversation_id: conversationId,
      direction: 'outbound',
      sender_type: 'ai',
      sender_id: agent?.id || null,
      message_type: 'text',
      body: aiReplyText,
      delivery_status: 'processing',
    })
    .select()
    .single();

  if (insertErr || !insertedMsg) {
    console.error('[AI Responder] Message insertion failed:', insertErr?.message);
    return;
  }

  // Log telemetry token recording
  await TelemetryService.recordTokenConsumption(orgId, tokensGenerated, 0, modelProvider);

  // Log usage credits ledger update
  const { error: ledgerErr } = await adminClient.rpc('increment_usage_ledger', {
    p_org_id: orgId,
    p_month: currentMonth,
    p_tokens: tokensGenerated,
    p_messages: 1
  });

  if (ledgerErr) {
    // Upsert standard logic fallback
    const { data: existingLedger } = await adminClient
      .from('usage_ledger')
      .select('*')
      .eq('organization_id', orgId)
      .eq('month_year', currentMonth)
      .limit(1)
      .single();

    if (existingLedger) {
      await adminClient
        .from('usage_ledger')
        .update({
          tokens_used: existingLedger.tokens_used + tokensGenerated,
          messages_processed: existingLedger.messages_processed + 1
        })
        .eq('id', existingLedger.id);
    } else {
      await adminClient
        .from('usage_ledger')
        .insert({
          organization_id: orgId,
          tokens_used: tokensGenerated,
          messages_processed: 1,
          month_year: currentMonth
        });
    }
  }

  // Step E: Outbound dispatch delivery
  const whatsappResponse = await sendWhatsAppMessage(
    fromPhone,
    aiReplyText,
    undefined,
    undefined,
    orgId,
    conversationId
  );

  if (whatsappResponse.success && whatsappResponse.messageId) {
    // Complete successfully: update message delivery_status to 'sent' (or 'delivered')
    await adminClient
      .from('messages')
      .update({ 
        provider_message_id: whatsappResponse.messageId, 
        delivery_status: 'sent' 
      })
      .eq('id', insertedMsg.id);

    console.log(`[AI Responder] [Trace: ${traceId}] Dispatch complete: msg ID ${insertedMsg.id} linked to Meta ID ${whatsappResponse.messageId}`);
  } else {
    // Outbound failure: update message to 'failed' state and register in DLQ outbound tracking
    await adminClient
      .from('messages')
      .update({ 
        delivery_status: 'failed',
        error_message: 'Outbound dispatch failed or ran in log-only sandbox mode.'
      })
      .eq('id', insertedMsg.id);

    // Persist failure logs inside outbound_message_delivery table (DLQ / retry queues logs)
    await adminClient
      .from('outbound_message_delivery')
      .insert({
        message_id: insertedMsg.id,
        organization_id: orgId,
        retry_count: 0,
        max_retries: 3,
        status: 'dead_letter',
        last_attempt_at: new Date().toISOString(),
        error_logs: [{
          timestamp: new Date().toISOString(),
          error: 'Outbound WhatsApp API failed to deliver or returned false successes.'
        }]
      });

    // Save failure trace to conversation_events
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'messaging.delivery_failed',
      payload: { message_id: insertedMsg.id, details: 'Outbound sandbox limitations or credentials missing' }
    });

    console.warn(`[AI Responder] [Trace: ${traceId}] Meta delivery failed. Outbound DLQ record stored.`);
  }
}
