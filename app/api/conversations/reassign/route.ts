/**
 * Oye AI: Conversation Operator Reassignment API
 * File Location: c:\Users\hartm\oye-ai\src\app\api\conversations\reassign\route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, orgId, assignedAgentId, priorityLevel } = body;

    if (!conversationId || !orgId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // 1. Fetch current conversation to check prior state and get priority
    const { data: currentConv, error: fetchErr } = await adminClient
      .from('conversations')
      .select('assigned_agent_id, priority_level, mode')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single();

    if (fetchErr || !currentConv) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const activePriority = priorityLevel || currentConv.priority_level || 'medium';
    
    // 2. Compute dynamic SLA deadline based on priority
    const now = new Date();
    if (activePriority === 'critical') now.setMinutes(now.getMinutes() + 15);
    else if (activePriority === 'high') now.setHours(now.getHours() + 1);
    else if (activePriority === 'medium') now.setHours(now.getHours() + 4);
    else if (activePriority === 'low') now.setHours(now.getHours() + 24);
    const computedDeadline = now.toISOString();

    // 3. Update conversation record state transaction-safely
    const updatePayload: any = {
      assigned_agent_id: assignedAgentId || null,
      last_operator_action_at: new Date().toISOString()
    };

    if (priorityLevel) {
      updatePayload.priority_level = priorityLevel;
    }
    
    // Update SLA deadline dynamically
    updatePayload.sla_deadline = computedDeadline;

    const { data: conversation, error: updateErr } = await adminClient
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateErr || !conversation) {
      console.error('[Reassign API] Database state update failed:', updateErr?.message);
      return NextResponse.json({ error: updateErr?.message || 'Conversation update failed' }, { status: 500 });
    }

    // 4. Fetch agent profile name for audit log comment
    let agentName = 'Sin Asignar';
    if (assignedAgentId) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', assignedAgentId)
        .single();
      if (profile && profile.full_name) {
        agentName = profile.full_name;
      } else {
        agentName = assignedAgentId;
      }
    }

    // 5. Insert Timeline Event Trace (System ledger updates)
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'operator_reassigned',
      payload: {
        previous_agent_id: currentConv.assigned_agent_id,
        new_agent_id: assignedAgentId || null,
        new_agent_name: agentName,
        priority_level: activePriority,
        sla_deadline: computedDeadline,
        trigger: 'operator_reassign'
      }
    });

    // 6. Log reassignment audit comments inside the timeline comments table (conversation_notes)
    const auditComment = `Conversación reasignada al agente [${agentName}] por el administrador.`;
    await adminClient.from('conversation_notes').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      author_id: assignedAgentId || null,
      body: auditComment
    });

    console.log(`[Reassign API] Reassigned conversation ${conversationId} to Agent ${agentName} (${assignedAgentId || 'None'}) | SLA: ${activePriority}`);

    return NextResponse.json({ success: true, conversation });
  } catch (err: any) {
    console.error('[Reassign API] Internal failure:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
