import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { orgId, demoType } = await request.json();

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can seed demo data' }, { status: 403 });
    }

    const results: Record<string, any> = { created: [], errors: [] };

    // Create demo conversations
    const demoConversations = [
      { name: 'Carlos Mendoza', phone: '+593 98 123 4567', stage: 'new', intent: 'consulta', sentiment: 'positive', score: 75, mode: 'ai' },
      { name: 'Ana García', phone: '+593 99 987 6543', stage: 'contacted', intent: 'compra', sentiment: 'positive', score: 90, mode: 'manual' },
      { name: 'Luis Rodriguez', phone: '+55 11 99999 1111', stage: 'qualified', intent: 'reserva', sentiment: 'positive', score: 95, mode: 'manual' },
      { name: 'Pedro Sánchez', phone: '+593 97 555 2222', stage: 'new', intent: 'soporte', sentiment: 'negative', score: 30, mode: 'ai' },
      { name: 'María López', phone: '+593 96 444 3333', stage: 'appointment_scheduled', intent: 'reserva', sentiment: 'positive', score: 85, mode: 'manual' },
      { name: 'Jorge Torres', phone: '+593 95 666 7777', stage: 'customer', intent: 'compra', sentiment: 'neutral', score: 100, mode: 'manual' }
    ];

    for (const dc of demoConversations) {
      let customerId: string;
      const { data: existingCust } = await admin
        .from('customers')
        .select('id')
        .eq('organization_id', orgId)
        .eq('phone_number', dc.phone)
        .single();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const { data: newCust } = await admin
          .from('customers')
          .insert({
            organization_id: orgId,
            name: dc.name,
            phone_number: dc.phone,
            custom_attributes: { source: 'demo', tags: ['Demo'] }
          })
          .select('id')
          .single();
        customerId = newCust?.id;
      }

      if (customerId) {
        const { data: channel } = await admin
          .from('channels')
          .select('id')
          .eq('organization_id', orgId)
          .limit(1)
          .single();

        const { data: conv } = await admin
          .from('conversations')
          .insert({
            organization_id: orgId,
            customer_id: customerId,
            channel_id: channel?.id || 'demo-channel',
            mode: dc.mode as 'ai' | 'manual',
            last_message_at: new Date().toISOString(),
            status: 'open',
            sentiment: dc.sentiment,
            lead_score: dc.score,
            customer_intent: dc.intent,
            appointment_likelihood: dc.score >= 70 ? 'high' : dc.score >= 40 ? 'medium' : 'low',
            ai_summary: `Demo conversation with ${dc.name} - Intent: ${dc.intent}`,
            suggested_next_action: dc.score >= 70 ? 'Follow up immediately' : 'Add to nurture queue'
          })
          .select()
          .single();

        if (conv) {
          results.created.push(`Conversation with ${dc.name}`);

          await admin.from('lead_notes').insert({
            organization_id: orgId,
            lead_id: conv.id,
            author_id: user.id,
            body: `Demo note: ${dc.stage} stage lead - ${dc.intent}`
          });
        }
      }
    }

    // Create demo services
    const demoServices = [
      { name: 'Consulta Profesional', description: 'Sesión de consulta de 30 minutos', price: 49, duration: 30 },
      { name: 'Paquete Premium', description: '5 sesiones + seguimiento', price: 199, duration: 150 },
      { name: 'Certificación', description: 'Programa de certificación completo', price: 499, duration: 300 }
    ];

    for (const svc of demoServices) {
      await admin.from('services').insert({
        organization_id: orgId,
        name: svc.name,
        description: svc.description,
        price: svc.price,
        currency: 'USD',
        duration_minutes: svc.duration,
        category: 'Demo'
      });
      results.created.push(`Service: ${svc.name}`);
    }

    // Create demo FAQ
    const demoFaq = [
      { q: '¿Cómo agendo una cita?', a: 'Puedes agendar directamente desde WhatsApp escribiendo " quiero reservar".' },
      { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos todas las tarjetas de crédito, débito y transferencias.' },
      { q: '¿Tienen warranty?', a: 'Sí, garantizamos reembolso en los primeros 30 días si no queda satisfecho.' }
    ];

    for (const faq of demoFaq) {
      await admin.from('faq_knowledge').insert({
        organization_id: orgId,
        question: faq.q,
        answer: faq.a,
        category: 'general'
      });
      results.created.push(`FAQ: ${faq.q.substring(0, 20)}...`);
    }

    // Create demo policies
    await admin.from('business_policies').insert([
      { organization_id: orgId, policy_type: 'refund', title: 'Política de Reembolso', content: 'Reembolso completo en 30 días.' },
      { organization_id: orgId, policy_type: 'cancellation', title: 'Política de Cancelación', content: 'Sin cargo hasta 24h antes.' }
    ]);
    results.created.push('Policies: refund, cancellation');

    return NextResponse.json({
      success: true,
      message: `Demo data seeded successfully. Created ${results.created.length} items.`,
      details: results.created
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}