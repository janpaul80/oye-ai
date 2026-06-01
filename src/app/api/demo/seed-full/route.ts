import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

interface DemoTemplate {
  name: string;
  tagline: string;
  description?: string;
  industry: string;
  hours: Record<string, { open: string | null; close: string | null }>;
  services: Array<{ name: string; description: string; price: number; duration: number }>;
  faq: Array<{ q: string; a: string }>;
  policies: Array<{ type: string; title: string; content: string }>;
  conversations: Array<{
    name: string; phone: string; stage: string;
    messages: Array<{ direction: string; sender: string; body: string }>;
    intent: string; sentiment: string; score: number;
  }>;
  leads: Array<{ name: string; phone: string; stage: string; source: string }>;
}

const DEMO_TEMPLATES: Record<string, DemoTemplate> = {
  restaurant: {
    name: 'Sabores Restaurante',
    tagline: 'Sabores auténticos de Ecuador',
    industry: 'restaurant',
    hours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '23:00' },
      saturday: { open: '09:00', close: '23:00' },
      sunday: { open: '09:00', close: '21:00' }
    },
    services: [
      { name: 'Almuerzo Ejecutivo', description: 'Menú del día con entrada, plato principal y bebida', price: 12, duration: 60 },
      { name: 'Cena Romántica', description: 'Cena para dos con vino espumante', price: 89, duration: 120 },
      { name: 'Cumpleaños', description: 'Paquete completo con pastel y decoración', price: 150, duration: 180 },
      { name: 'Evento Privado', description: 'Reservación de salón para eventos', price: 350, duration: 240 }
    ],
    faq: [
      { q: '¿Tienen estacionamiento?', a: 'Sí, tenemos parking gratis para clientes.' },
      { q: '¿Aceptan tarjetas?', a: 'Aceptamos todas las tarjetas de crédito y débito.' },
      { q: '¿Necesito reservación?', a: 'Recomendamos reservar, especialmente fines de semana.' },
      { q: '¿Tienen opciones vegetarianas?', a: 'Sí, nuestro menú incluye opciones vegetarianas.' }
    ],
    policies: [
      { type: 'cancellation', title: 'Política de Cancelación', content: 'Cancelaciones con 24h de anticipación sin cargo.' },
      { type: 'refund', title: 'Política de Reembolso', content: 'Reembolso completo si cancela 48h antes. 50% entre 24-48h.' }
    ],
    conversations: [
      { name: 'Carlos M.', phone: '+593 99 111 2222', stage: 'new', intent: 'reserva', sentiment: 'positive', score: 85,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Hola, quiero reservar una mesa para mañana' }, { direction: 'outbound', sender: 'ai', body: '¡Hola Carlos! Con gusto. ¿Para cuántas personas y a qué hora?' }] },
      { name: 'Ana L.', phone: '+593 98 333 4444', stage: 'qualified', intent: 'compra', sentiment: 'positive', score: 90,
        messages: [{ direction: 'inbound', sender: 'customer', body: '¿Tienen opciones veganas?' }, { direction: 'outbound', sender: 'ai', body: 'Sí, tenemos un menú vegano completo. Te lo envío.' }] },
      { name: 'Miguel R.', phone: '+593 97 555 6666', stage: 'appointment_scheduled', intent: 'reserva', sentiment: 'positive', score: 95,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Quiero celebrar mi cumpleaños' }, { direction: 'outbound', sender: 'ai', body: '¡Felicidades! Te recomiendo nuestro paquete cumpleaños.' }] },
      { name: 'Laura K.', phone: '+593 96 777 8888', stage: 'new', intent: 'consulta', sentiment: 'neutral', score: 50,
        messages: [{ direction: 'inbound', sender: 'customer', body: '¿A qué hora abren?' }, { direction: 'outbound', sender: 'ai', body: 'Abrimos de lunes a domingo de 8am a 10pm.' }] },
      { name: 'Pedro S.', phone: '+593 95 999 0000', stage: 'customer', intent: 'compra', sentiment: 'positive', score: 100,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'El mejor restaurant de la ciudad!' }, { direction: 'outbound', sender: 'agent', body: '¡Gracias Pedro! Te esperamos pronto.' }] },
      { name: 'Rosa H.', phone: '+593 94 888 7777', stage: 'contacted', intent: 'soporte', sentiment: 'negative', score: 30,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'La cuenta estaba mal' }, { direction: 'outbound', sender: 'agent', body: 'Disculpe el error. Ya está corregido.' }] }
    ],
    leads: [
      { name: 'Carlos M.', phone: '+593 99 111 2222', stage: 'new', source: 'whatsapp' },
      { name: 'Ana L.', phone: '+593 98 333 4444', stage: 'qualified', source: 'whatsapp' },
      { name: 'Miguel R.', phone: '+593 97 555 6666', stage: 'appointment_scheduled', source: 'instagram' },
      { name: 'Laura K.', phone: '+593 96 777 8888', stage: 'new', source: 'whatsapp' }
    ]
  },
  dentist: {
    name: 'Sonrisa Dental',
    tagline: 'Tu sonrisa美丽的笑容',
    industry: 'healthcare',
    hours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '16:00' },
      saturday: { open: '09:00', close: '12:00' },
      sunday: { open: null, close: null }
    },
    services: [
      { name: 'Limpieza Dental', description: 'Profilaxis profesional', price: 45, duration: 30 },
      { name: 'Evaluación', description: 'Chequeo completo + radiografías', price: 60, duration: 45 },
      { name: 'Ortodoncia', description: 'Frenillos tradicionales', price: 2500, duration: 60 },
      { name: 'Blanqueamiento', description: 'Tratamiento profesional', price: 200, duration: 60 },
      { name: 'Implante', description: 'Implante dental completo', price: 1200, duration: 90 }
    ],
    faq: [
      { q: '¿Duele el tratamiento?', a: 'Usamos anestesia local para minimizar molestia.' },
      { q: '¿Cuánto dura el blanqueamiento?', a: 'Los resultados duran 2-3 años con cuidado adecuado.' },
      { q: '¿Aceptan seguros?', a: 'Trabajamos con las principales aseguradoras.' },
      { q: '¿Tienen financiamiento?', a: 'Sí, ofrecen planes de pago sin interés.' }
    ],
    policies: [
      { type: 'cancellation', title: 'Política de Citas', content: '24h de anticipación para cancelar sin cargo.' },
      { type: 'privacy', title: 'Privacidad', content: 'Todos los datos de pacientes son confidenciales y protegidos.' }
    ],
    conversations: [
      { name: 'María G.', phone: '+593 99 222 3333', stage: 'new', intent: 'consulta', sentiment: 'positive', score: 75,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Hola, quiero arreglar mis dientes' }, { direction: 'outbound', sender: 'ai', body: '¡Hola María! Te ofrezco una evaluación gratuita. ¿Cuándo te viene bien?' }] },
      { name: 'Jorge L.', phone: '+593 98 444 5555', stage: 'qualified', intent: 'compra', sentiment: 'positive', score: 90,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Quiero blanquear mis dientes' }, { direction: 'outbound', sender: 'ai', body: 'Perfecto. Te explico el procedimiento y te muestro casos reales.' }] },
      { name: 'Carmen R.', phone: '+593 97 666 7777', stage: 'appointment_scheduled', intent: 'reserva', sentiment: 'positive', score: 95,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Tengo dolor de muelas' }, { direction: 'outbound', sender: 'agent', body: 'Te agendamos una cita de urgencia mañana a las 10am.' }] }
    ],
    leads: [
      { name: 'María G.', phone: '+593 99 222 3333', stage: 'new', source: 'whatsapp' },
      { name: 'Jorge L.', phone: '+593 98 444 5555', stage: 'qualified', source: 'facebook' },
      { name: 'Carmen R.', phone: '+593 97 666 7777', stage: 'appointment_scheduled', source: 'whatsapp' }
    ]
  },
  gym: {
    name: 'FitZone Gimnasio',
    tagline: 'Transforma tu cuerpo, transforma tu vida',
    industry: 'fitness',
    hours: {
      monday: { open: '05:00', close: '23:00' },
      tuesday: { open: '05:00', close: '23:00' },
      wednesday: { open: '05:00', close: '23:00' },
      thursday: { open: '05:00', close: '23:00' },
      friday: { open: '05:00', close: '22:00' },
      saturday: { open: '07:00', close: '20:00' },
      sunday: { open: '07:00', close: '18:00' }
    },
    services: [
      { name: 'Membresía Mensual', description: 'Acceso completo a equipos y clases', price: 49, duration: 30 },
      { name: 'Entrenamiento Personal', description: '10 sesiones con profesor', price: 250, duration: 60 },
      { name: 'Plan Nutricional', description: 'Plan de alimentación personalizado', price: 80, duration: 30 },
      { name: 'Evaluación Física', description: 'Test completo + recomendaciones', price: 35, duration: 45 },
      { name: 'Boxeo', description: 'Clases de boxeo grupales', price: 35, duration: 60 }
    ],
    faq: [
      { q: '¿Tienen estacionamiento?', a: 'Sí, parking gratuito para miembros.' },
      { q: '¿Puedo ir un día de prueba?', a: '¡Sí, primera clase gratis!' },
      { q: '¿Las clases tienen costo extra?', a: 'Algunas clases especiales tienen costo adicional.' },
      { q: '¿Hay儿科?', a: 'Tenemos guardería para niños de 3-8 años.' }
    ],
    policies: [
      { type: 'cancellation', title: 'Cancelación', content: 'Cancelación de membresía con 30 días de anticipación.' },
      { type: 'terms', title: 'Términos', content: 'Los niños menores de 16 años deben estar acompañados.' }
    ],
    conversations: [
      { name: 'Daniel M.', phone: '+593 99 555 6666', stage: 'new', intent: 'consulta', sentiment: 'positive', score: 70,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Hola, quiero empezar a entrenar' }, { direction: 'outbound', sender: 'ai', body: '¡Excelente decisión! Te ofrezco una clase gratis.' }] },
      { name: 'Sofia A.', phone: '+593 98 777 8888', stage: 'qualified', intent: 'compra', sentiment: 'positive', score: 85,
        messages: [{ direction: 'inbound', sender: 'customer', body: '¿Cuánto cuesta la membresía?' }, { direction: 'outbound', sender: 'ai', body: 'La membresía mensual es $49 con acceso completo.' }] },
      { name: 'Marco T.', phone: '+593 97 999 1111', stage: 'customer', intent: 'compra', sentiment: 'positive', score: 100,
        messages: [{ direction: 'inbound', sender: 'customer', body: '¡Llevo 3 meses y ya bajé 5 kilos!' }] }
    ],
    leads: [
      { name: 'Daniel M.', phone: '+593 99 555 6666', stage: 'new', source: 'instagram' },
      { name: 'Sofia A.', phone: '+593 98 777 8888', stage: 'qualified', source: 'whatsapp' },
      { name: 'Marco T.', phone: '+593 97 999 1111', stage: 'customer', source: 'referral' }
    ]
  },
  salon: {
    name: 'Estilo Peluquería',
    tagline: 'Tu estilo, tu personalidad',
    industry: 'beauty',
    hours: {
      monday: { open: '09:00', close: '19:00' },
      tuesday: { open: '09:00', close: '19:00' },
      wednesday: { open: '09:00', close: '19:00' },
      thursday: { open: '09:00', close: '19:00' },
      friday: { open: '09:00', close: '20:00' },
      saturday: { open: '09:00', close: '18:00' },
      sunday: { open: null, close: null }
    },
    services: [
      { name: 'Corte de Cabello', description: 'Corte y styling', price: 25, duration: 45 },
      { name: 'Tintura', description: 'Coloración completa', price: 65, duration: 120 },
      { name: 'Tratamiento', description: 'Tratamiento capilar', price: 45, duration: 60 },
      { name: 'Manicure', description: 'Manos y uñas', price: 20, duration: 30 },
      { name: 'Pedilcure', description: 'Pies y uñas', price: 25, duration: 45 },
      { name: 'Maquillaje', description: 'Maquillaje profesional', price: 50, duration: 60 }
    ],
    faq: [
      { q: '¿Necesito cita?', a: 'Sí, te recomiendo reservar antes.' },
      { q: '¿Cuánto dura el color?', a: 'Depende, general 4-6 semanas.' },
      { q: '¿Tienen productos naturales?', a: 'Sí, usamos productos orgánicos.' },
      { q: '¿Aceptan mascotas?', a: 'No, lo lamentamos.' }
    ],
    policies: [
      { type: 'cancellation', title: 'Cancelación', content: '12h antes para cancelar sin cargo.' },
      { type: 'terms', title: 'Términos', content: 'Llegar 5 min antes para evitar retrasos.' }
    ],
    conversations: [
      { name: 'Andrea B.', phone: '+593 99 123 4567', stage: 'new', intent: 'consulta', sentiment: 'positive', score: 75,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Hola, quiero un cambio de look' }, { direction: 'outbound', sender: 'ai', body: '¡Genial! ¿Qué estilo tienes en mente?' }] },
      { name: 'Paula C.', phone: '+593 98 234 5678', stage: 'qualified', intent: 'reserva', sentiment: 'positive', score: 90,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Quiero teñirme el cabello de rubio' }, { direction: 'outbound', sender: 'ai', body: 'El rubio requiere varias sesiones. Te agendo.' }] },
      { name: 'Teresa D.', phone: '+593 97 345 6789', stage: 'customer', intent: 'compra', sentiment: 'positive', score: 100,
        messages: [{ direction: 'inbound', sender: 'customer', body: 'Me encantó mi nuevo look!' }] }
    ],
    leads: [
      { name: 'Andrea B.', phone: '+593 99 123 4567', stage: 'new', source: 'instagram' },
      { name: 'Paula C.', phone: '+593 98 234 5678', stage: 'qualified', source: 'whatsapp' },
      { name: 'Teresa D.', phone: '+593 97 345 6789', stage: 'customer', source: 'referral' },
      { name: 'Isabel F.', phone: '+593 96 456 7890', stage: 'contacted', source: 'facebook' }
    ]
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, demoType } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const templateName = demoType || 'restaurant';
    const template = DEMO_TEMPLATES[templateName];

    if (!template) {
      return NextResponse.json({ error: `Invalid demo type. Options: ${Object.keys(DEMO_TEMPLATES).join(', ')}` }, { status: 400 });
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

    const results: string[] = [];

    // 1. Business Info
    await admin.from('business_info').upsert({
      organization_id: orgId,
      business_name: template.name,
      description: template.description,
      tagline: template.tagline,
      working_hours: template.hours,
      updated_at: new Date().toISOString()
    }, { onConflict: 'organization_id' });
    results.push(`Business: ${template.name}`);

    // 2. Services
    for (const svc of template.services) {
      await admin.from('services').insert({
        organization_id: orgId,
        name: svc.name,
        description: svc.description,
        price: svc.price,
        duration_minutes: svc.duration,
        category: template.industry
      });
    }
    results.push(`Services: ${template.services.length}`);

    // 3. FAQ
    for (const faqItem of template.faq) {
      await admin.from('faq_knowledge').insert({
        organization_id: orgId,
        question: faqItem.q,
        answer: faqItem.a,
        category: 'general'
      });
    }
    results.push(`FAQ: ${template.faq.length}`);

    // 4. Policies
    for (const pol of template.policies) {
      await admin.from('business_policies').insert({
        organization_id: orgId,
        policy_type: pol.type,
        title: pol.title,
        content: pol.content
      });
    }
    results.push(`Policies: ${template.policies.length}`);

    // 5. Customers & Conversations
    for (const dc of template.conversations) {
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
            channel_id: channel?.id || 'demo',
            mode: 'ai',
            status: 'open',
            language: 'es',
            last_message_at: new Date().toISOString(),
            sentiment: dc.sentiment,
            lead_score: dc.score,
            customer_intent: dc.intent,
            appointment_likelihood: dc.score >= 70 ? 'high' : dc.score >= 40 ? 'medium' : 'low',
            ai_summary: `Demo: Intent ${dc.intent}`,
            suggested_next_action: dc.score >= 70 ? 'Follow up' : 'Wait'
          })
          .select()
          .single();

        if (conv) {
          results.push(`Conversation: ${dc.name}`);

          for (const msg of dc.messages) {
            await admin.from('messages').insert({
              organization_id: orgId,
              conversation_id: conv.id,
              direction: msg.direction as 'inbound' | 'outbound',
              sender_type: msg.sender as 'customer' | 'ai' | 'agent',
              message_type: 'text',
              body: msg.body,
              delivery_status: 'delivered'
            });
          }
        }
      }
    }
    results.push(`Messages: ${template.conversations.reduce((sum, c) => sum + c.messages.length, 0)}`);

    // 6. Leads
    for (const dl of template.leads) {
      let customerId: string;
      const { data: existingCust } = await admin
        .from('customers')
        .select('id')
        .eq('organization_id', orgId)
        .eq('phone_number', dl.phone)
        .single();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const { data: newCust } = await admin
          .from('customers')
          .insert({
            organization_id: orgId,
            name: dl.name,
            phone_number: dl.phone,
            custom_attributes: { source: 'demo' }
          })
          .select('id')
          .single();
        customerId = newCust?.id;
      }

      if (customerId) {
        await admin.from('leads').insert({
          organization_id: orgId,
          customer_id: customerId,
          stage: dl.stage as any,
          source: dl.source
        });
      }
    }
    results.push(`Leads: ${template.leads.length}`);

    return NextResponse.json({
      success: true,
      demo_type: templateName,
      message: `Demo environment created: ${template.name}`,
      created: results
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}