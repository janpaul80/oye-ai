/**
 * Oye AI: Conversation Operator Resolution API
 * File Location: c:\Users\hartm\oye-ai\src\app\api\conversations\resolve\route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, orgId, resolutionReason, notes = '' } = body;

    if (!conversationId || !orgId || !resolutionReason) {
      return NextResponse.json({ error: 'Missing required parameters: conversationId, orgId, and resolutionReason' }, { status: 400 });
    }

    // 1. Fetch current logged-in user
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      console.warn('[Resolve API] Unauthorized access attempt: no user session');
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
      console.warn(`[Resolve API] Forbidden: User ${user.id} does not belong to Org ${orgId}`);
      return NextResponse.json({ error: 'Forbidden: You do not have access to this organization' }, { status: 403 });
    }

    // 3. Fetch operator profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    const operatorName = profile?.full_name || user.email || 'Operador';

    // 4. Generate the mock AI resolution summary
    const aiSummary = `RESUMEN DE RESOLUCIÓN AI (Autogenerado):
- Categoría: ${resolutionReason}
- Operador: ${operatorName}
- Notas de Cierre: ${notes || 'Ninguna proporcionada.'}
- Síntesis: El operador asistió exitosamente al cliente cerrando el flujo bajo la tipificación de [${resolutionReason}]. Se archivó el caso y se desactivó la atención en tiempo real hasta un nuevo mensaje entrante, asegurando un cierre conforme a SLA.`;

    // 5. Update conversation state in DB
    const { data: conversation, error: updateErr } = await adminClient
      .from('conversations')
      .update({
        status: 'closed',
        summary: aiSummary,
        last_operator_action_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateErr || !conversation) {
      console.error('[Resolve API] Database state update failed:', updateErr?.message);
      return NextResponse.json({ error: updateErr?.message || 'Conversation not found' }, { status: 500 });
    }

    // 6. Record timeline event trace
    await adminClient.from('conversation_events').insert({
      conversation_id: conversationId,
      organization_id: orgId,
      event_type: 'operator_resolved',
      payload: {
        operator_id: user.id,
        operator_name: operatorName,
        resolution_reason: resolutionReason,
        notes,
        trigger: 'operator_resolve'
      }
    });

    // 7. Insert audit/timeline log inside conversation notes
    const resolveComment = `Conversación resuelta y archivada bajo el motivo [${resolutionReason}]. Notas del operador: "${notes || 'Sin observaciones'}".`;
    await adminClient.from('conversation_notes').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      author_id: user.id,
      body: resolveComment
    });

    console.log(`[Resolve API] Conversation ${conversationId} resolved by operator ${operatorName} | Reason: ${resolutionReason}`);

    return NextResponse.json({ success: true, conversation });
  } catch (err: any) {
    console.error('[Resolve API] Internal execution failure:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
