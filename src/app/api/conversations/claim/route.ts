/**
 * Oye AI: Conversation Operator Claim API
 * File Location: c:\Users\hartm\oye-ai\src\app\api\conversations\claim\route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, orgId } = body;

    if (!conversationId || !orgId) {
      return NextResponse.json({ error: 'Missing required parameters: conversationId and orgId' }, { status: 400 });
    }

    // 1. Fetch current logged-in user
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      console.warn('[Claim API] Unauthorized access attempt: no user session');
      return NextResponse.json({ error: 'Unauthorized: Operator session not found' }, { status: 401 });
    }

    const adminClient = await createAdminClient();

    // 2. Validate membership & roles
    const { data: membership, error: membershipErr } = await adminClient
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (membershipErr || !membership) {
      console.warn(`[Claim API] Forbidden: User ${user.id} does not belong to Org ${orgId}`);
      return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
    }

    // 3. Fetch operator profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    const operatorName = profile?.full_name || user.email || 'Operador';

    // 4. Update SLA deadline based on manual claim priority (default high SLA limit: 4 hours)
    const now = new Date();
    now.setHours(now.getHours() + 4);
    const computedDeadline = now.toISOString();

    // 5. Update conversation state to manual mode and assign operator
    const { data: conversation, error: updateErr } = await adminClient
      .from('conversations')
      .update({
        mode: 'manual',
        assigned_agent_id: user.id,
        last_operator_action_at: new Date().toISOString(),
        sla_deadline: computedDeadline
      })
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateErr || !conversation) {
      console.error('[Claim API] Database state update failed:', updateErr?.message);
      return NextResponse.json({ error: updateErr?.message || 'Conversation not found' }, { status: 500 });
    }

    // 6. Record timeline event trace
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'operator_claimed',
      payload: {
        operator_id: user.id,
        operator_name: operatorName,
        trigger: 'operator_claim',
        sla_deadline: computedDeadline
      }
    });

    // 7. Insert audit/timeline log inside conversation notes
    const claimComment = `Conversación reclamada por el operador [${operatorName}].`;
    await adminClient.from('conversation_notes').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      author_id: user.id,
      body: claimComment
    });

    console.log(`[Claim API] Conversation ${conversationId} claimed by operator ${operatorName} (${user.id})`);

    return NextResponse.json({ success: true, conversation });
  } catch (err: any) {
    console.error('[Claim API] Internal execution failure:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
