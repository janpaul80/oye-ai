/**
 * Oye AI: Conversation Operator Takeover API
 * File Location: c:\Users\hartm\oye-ai\src\app\api\conversations\takeover\route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, orgId, mode, assignedAgentId, internalNote } = body;

    if (!conversationId || !orgId || !mode) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // 1. Update the conversation record state (Pause AI, assign operator, reset action dates)
    const { data: conversation, error: updateErr } = await adminClient
      .from('conversations')
      .update({
        mode,
        assigned_agent_id: assignedAgentId || null,
        last_operator_action_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateErr || !conversation) {
      console.error('[Takeover API] Database state update failed:', updateErr?.message);
      return NextResponse.json({ error: updateErr?.message || 'Conversation not found' }, { status: 500 });
    }

    // 2. Insert Timeline Event Trace (System ledger updates)
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'mode_change',
      payload: {
        previous_mode: 'ai',
        new_mode: mode,
        assigned_agent_id: assignedAgentId || null,
        trigger: 'operator_takeover'
      }
    });

    // 3. Insert Optional Timeline note (Human operators comments ledger)
    if (internalNote) {
      await adminClient.from('conversation_notes').insert({
        organization_id: orgId,
        conversation_id: conversationId,
        author_id: assignedAgentId || null,
        body: internalNote
      });
    }

    console.log(`[Takeover API] Switched conversation ${conversationId} to mode [${mode}] by Operator ${assignedAgentId || 'System'}`);

    return NextResponse.json({ success: true, conversation });
  } catch (err: any) {
    console.error('[Takeover API] Internal failure:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
