'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/components/LanguageContext';
import { Locale } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// In-file high-fidelity localized dictionary to ensure robust translations and 0ms load times.
const LANDING_DICT = {
  es: {
    hero: {
      badge: "✦ Capa de Fuerza Laboral Operativa Autónoma",
      title_part1: "El empleado de operaciones",
      title_accent: "autónomo para WhatsApp",
      title_part2: "que tu negocio necesita",
      subtitle: "No vuelvas a perder una venta ni un ticket de soporte. Oye AI actúa como un empleado de operaciones autónomo en tu WhatsApp: califica leads, agenda reuniones en tu calendario y procesa pagos seguros de Stripe 24/7. Y cuando la conversación es compleja, cede el control a tu equipo humano al instante.",
      cta_primary: "Ver Demo Interactiva",
      cta_secondary: "Ver Consola de Operador",
      trust: "Uptime operativo verificado de 99.9% • Cifrado seguro de extremo a extremo"
    },
    use_cases: {
      title: "Soluciones a la medida de tu sector",
      subtitle: "Diseñado para los negocios que mueven el mundo real y necesitan flujos de trabajo ininterrumpidos.",
      restaurant: "Restaurantes",
      restaurant_desc: "Toma pedidos a domicilio, comparte el menú digital y reserva mesas en segundos sin llamadas perdidas.",
      clinic: "Clínicas y Médicos",
      clinic_desc: "Agenda citas médicas, envía recordatorios de consultas y responde dudas frecuentes sobre especialidades.",
      salon: "Salones y Barberías",
      salon_desc: "Permite a tus clientes reservar turnos con su estilista preferido y confirma el agendamiento automáticamente.",
      real_estate: "Bienes Raíces",
      real_estate_desc: "Califica leads interesados en propiedades, comparte fichas técnicas y agenda visitas guiadas.",
      local_store: "Tiendas y Retail",
      local_store_desc: "Responde stock de productos, comparte fotos de catálogo y envía enlaces de pago seguros de Stripe.",
      agency: "Agencias",
      agency_desc: "Califica prospectos de marketing, agenda llamadas de consultoría y atiende clientes de forma fluida.",
      service: "Servicios del Hogar",
      service_desc: "Agenda visitas de cotización para plomería, limpieza, carpintería o reparaciones rápidamente."
    },
    features: {
      title: "Automatización de nivel operativo sin perder el control",
      subtitle: "Respuestas eficientes al instante para tus clientes, control absoluto para tu equipo de trabajo.",
      ai_title: "Respuestas Estructuradas",
      ai_desc: "Califica prospectos y resuelve dudas operativas complejas de forma profesional en base a tus catálogos, interpretando audios y texto.",
      booking_title: "Agendamiento Autónomo",
      booking_desc: "Integrado con Google Calendar. Tus clientes agendan su cita directamente en el chat en segundos.",
      payment_title: "Cobros en el Chat",
      payment_desc: "Envía links de pago seguros de Stripe y valida las transacciones en tiempo real de forma autónoma.",
      handoff_title: "Traspaso Híbrido",
      handoff_desc: "El sistema alerta a tu equipo y les cede el control del chat inmediatamente cuando se requiere atención personalizada."
    },
    trust_security: {
      title: "Infraestructura diseñada para inspirar confianza",
      subtitle: "Combinamos la agilidad de los agentes autónomos con el control operativo de tu negocio.",
      secure_title: "Seguridad y Cifrado",
      secure_desc: "Tus datos están protegidos con cifrado SSL de extremo a extremo y resguardo estricto de privacidad.",
      audit_title: "Ledger de Auditoría",
      audit_desc: "Accede a registros completos de auditoría. Monitorea cada respuesta, agendamiento y pago realizado.",
      hand_title: "Bypass de Operador",
      hand_desc: "Intervén en cualquier conversación en tiempo real con un solo clic desde tu panel principal.",
      business_title: "Límites Failsafe",
      business_desc: "Define reglas de presupuesto de tokens y límites diarios de mensajes para un control absoluto."
    },
    pricing: {
      title: "Planes transparentes para cada etapa",
      subtitle: "Sin tarifas ocultas. Elige el plan perfecto para escalar la atención de tu negocio.",
      starter_name: "Starter",
      starter_price: "$29",
      starter_desc: "Para profesionales independientes y pequeños locales locales.",
      growth_name: "Growth",
      growth_price: "$59",
      growth_desc: "Para negocios medianos listos para automatizar flujos completos.",
      pro_name: "Professional",
      pro_price: "$89",
      pro_desc: "Nuestra solución ideal con soporte avanzado e integraciones completas.",
      enterprise_name: "Enterprise",
      enterprise_price: "Custom",
      enterprise_desc: "Solución a gran escala para marcas con alto volumen de transacciones.",
      billed_monthly: "/ mes",
      cta: "Comenzar Ahora",
      limit_msgs: "mensajes de WhatsApp al mes",
      limit_ai: "respuestas autónomas incluidas",
      limit_seats: "operador humano",
      limit_seats_plural: "operadores humanos",
      support_basic: "Soporte básico por correo",
      support_priority: "Soporte prioritario 24/7",
      support_dedicated: "Gerente de cuenta dedicado"
    }
  },
  en: {
    hero: {
      badge: "✦ Autonomous Operational Workforce Layer",
      title_part1: "The autonomous",
      title_accent: "operational employee",
      title_part2: "for WhatsApp businesses",
      subtitle: "Never lose a lead or support ticket again. Oye AI acts as an autonomous operational employee for your WhatsApp: qualifying prospects, booking calendar appointments, and collecting Stripe checkouts 24/7—with seamless handoff to human operators when needed.",
      cta_primary: "Launch Interactive Demo",
      cta_secondary: "View Operator Console",
      trust: "Enterprise reliability • End-to-end encryption • 99.9% verified uptime"
    },
    use_cases: {
      title: "Solutions tailored to your industry",
      subtitle: "Designed for businesses driving the real world that need uninterrupted flows.",
      restaurant: "Restaurants",
      restaurant_desc: "Take delivery orders, share digital menus, and book tables in seconds with zero missed calls.",
      clinic: "Clinics & Doctors",
      clinic_desc: "Schedule patient visits, send automated reminders, and answer common medical service questions.",
      salon: "Salons & Barbers",
      salon_desc: "Let clients book appointments with their favorite stylists and receive instant text confirmations.",
      real_estate: "Real Estate",
      real_estate_desc: "Qualify prospective buyers, share property spec sheets, and book guided house tours.",
      local_store: "Shops & Local Retail",
      local_store_desc: "Confirm product stock, share catalogue photos, and send secure Stripe checkout links.",
      agency: "Agencies & Consultants",
      agency_desc: "Qualify inbound marketing leads, book calendar discovery calls, and manage customer chats.",
      service: "Home Services",
      service_desc: "Book inspection visits for plumbing, cleaning, electrical, or repairs quickly."
    },
    features: {
      title: "Human-grade automation, absolute control",
      subtitle: "Instant answers for your customers, total workspace oversight for your team.",
      ai_title: "Structured Engagement",
      ai_desc: "Instantly qualifies prospects and answers operational queries professionally based on your documents. Processes text and voice notes.",
      booking_title: "Booked Calendars",
      booking_desc: "Synced with Google Calendar. Clients reserve their slots directly inside the WhatsApp chat.",
      payment_title: "Stripe Billing",
      payment_desc: "Generate and send secure Stripe payment links. Validate successful completions autonomously.",
      handoff_title: "Hybrid Handoff",
      handoff_desc: "The assistant alerts your team and hands over chat control immediately whenever personal care is needed."
    },
    trust_security: {
      title: "A platform built to inspire confidence",
      subtitle: "We combine the speed of automation with the operational safety your business demands.",
      secure_title: "Enterprise Protection",
      secure_desc: "Your customer data is protected with secure end-to-end SSL encryption and strict privacy protocols.",
      audit_title: "Operational Ledgers",
      audit_desc: "Access robust audit logs. Monitor every response, calendar booking, and transaction in real time.",
      hand_title: "Operator Override",
      hand_desc: "Take over any automated conversation instantly with a single click from your core dashboard.",
      business_title: "Failsafe Limits",
      business_desc: "Define custom token budgets, message caps, and operational limits for complete safety."
    },
    pricing: {
      title: "Transparent pricing for every scale",
      subtitle: "No hidden fees. Choose the perfect plan to automate your client interactions.",
      starter_name: "Starter",
      starter_price: "$29",
      starter_desc: "For independent professionals and small local shops.",
      growth_name: "Growth",
      growth_price: "$59",
      growth_desc: "For growing businesses ready to fully automate client flows.",
      pro_name: "Professional",
      pro_price: "$89",
      pro_desc: "Our ideal solution featuring advanced integrations and priorities.",
      enterprise_name: "Enterprise",
      enterprise_price: "Custom",
      enterprise_desc: "Scalable enterprise solution for high-volume transactions.",
      billed_monthly: "/ mo",
      cta: "Get Started Now",
      limit_msgs: "WhatsApp messages / mo",
      limit_ai: "autonomous replies included",
      limit_seats: "human operator seat",
      limit_seats_plural: "human operator seats",
      support_basic: "Basic email support",
      support_priority: "24/7 priority support",
      support_dedicated: "Dedicated account manager"
    }
  },
  pt: {
    hero: {
      badge: "✦ Camada de Força de Trabalho Operacional Autónoma",
      title_part1: "O funcionário operacional",
      title_accent: "autónomo para WhatsApp",
      title_part2: "que sua empresa precisa",
      subtitle: "Nunca mais perca um cliente. O Oye AI funciona como um funcionário operacional autónomo no seu WhatsApp: qualifica contactos, agenda reuniões no seu calendário e processa pagamentos Stripe 24/7. E quando a conversa exige empatia, transfere o controle para sua equipe instantaneamente.",
      cta_primary: "Ver Demo Interativa",
      cta_secondary: "Ver Painel Operacional",
      trust: "Uptime operacional verificado de 99.9% • Conexão criptografada e segura"
    },
    use_cases: {
      title: "Soluções sob medida para o seu setor",
      subtitle: "Desenvolvido para negócios que movimentam o mundo real e precisam de fluxos contínuos.",
      restaurant: "Restaurantes",
      restaurant_desc: "Receba pedidos, compartilhe o cardápio digital e reserve mesas em segundos sem chamadas perdidas.",
      clinic: "Clínicas e Médicos",
      clinic_desc: "Agende consultas médicas, envie lembretes automáticos e responda dúvidas frequentes sobre serviços.",
      salon: "Salões e Barbearias",
      salon_desc: "Permita que seus clientes reservem horários com seu profissional favorito de forma automática.",
      real_estate: "Imobiliárias",
      real_estate_desc: "Qualifique interessados em imóveis, envie fichas técnicas e agende visitas guiadas.",
      local_store: "Lojas e Varejo",
      local_store_desc: "Responda sobre disponibilidade de estoque, envie fotos e links de pagamentos Stripe seguros.",
      agency: "Agências",
      agency_desc: "Qualifique leads de marketing, agende reuniões de consultoria e atenda clientes de forma rápida.",
      service: "Serviços Residenciais",
      service_desc: "Agende visitas de orçamento para encanamento, limpeza ou reparos rapidamente."
    },
    features: {
      title: "Automatização de nível operacional com controle total",
      subtitle: "Respostas eficientes para clientes, supervisão completa para sua equipe.",
      ai_title: "Respostas Estruturadas",
      ai_desc: "Qualifica leads e responde a dúvidas operacionais de forma profissional baseando-se em seus catálogos. Processa texto e mensagens de voz.",
      booking_title: "Agenda Sincronizada",
      booking_desc: "Integrado ao Google Calendar. Seus clientes reservam horários diretamente no WhatsApp em segundos.",
      payment_title: "Cobranças no Chat",
      payment_desc: "Gere e envie links de pagamento seguros da Stripe. Confirme as transações de forma autónoma em tempo real.",
      handoff_title: "Transição Híbrida",
      handoff_desc: "O assistente avisa sua equipe e transfere o controle do chat imediatamente quando atenção personalizada é exigida."
    },
    trust_security: {
      title: "Uma plataforma desenvolvida para inspirar confiança",
      subtitle: "Combinamos a agilidade da automatização com a segurança operacional que sua empresa exige.",
      secure_title: "Segurança e Criptografia",
      secure_desc: "Seus dados estão protegidos com criptografia SSL de ponta a ponta e normas de privacidade rígidas.",
      audit_title: "Registros de Auditoria",
      audit_desc: "Acesse históricos completos de logs. Monitore cada resposta, agendamiento e transação efetuada.",
      hand_title: "Substituição pelo Operador",
      hand_desc: "Intervenha em qualquer conversa automatizada em tempo real com um único clique do seu painel principal.",
      business_title: "Limites Failsafe",
      business_desc: "Defina orçamentos de consumo de tokens e limites de mensagens para uma gestão segura."
    },
    pricing: {
      title: "Planos transparentes para cada etapa",
      subtitle: "Sem taxas ocultas. Escolha o plano ideal para escalar as interações da sua empresa.",
      starter_name: "Starter",
      starter_price: "$29",
      starter_desc: "Para profissionais autônomos e pequenos comércios locais.",
      growth_name: "Growth",
      growth_price: "$59",
      growth_desc: "Para empresas prontas para automatizar fluxos completos de clientes.",
      pro_name: "Professional",
      pro_price: "$89",
      pro_desc: "Nossa solução ideal com integrações robustas e suporte prioritário.",
      enterprise_name: "Enterprise",
      enterprise_price: "Custom",
      enterprise_desc: "Solução sob medida para corporações com alto volume de transações.",
      billed_monthly: "/ mês",
      cta: "Começar Agora",
      limit_msgs: "mensagens de WhatsApp / mês",
      limit_ai: "respostas autónomas incluídas",
      limit_seats: "assento de operador",
      limit_seats_plural: "assentos de operadores",
      support_basic: "Suporte básico por e-mail",
      support_priority: "Suporte prioritário 24/7",
      support_dedicated: "Gerente de conta dedicado"
    }
  }
};

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function LandingPage() {
  const { locale, setLocale } = useTranslation();
  
  // Safe localization selector fallback
  const currentLang = LANDING_DICT[locale] ? locale : 'en';
  const copy = LANDING_DICT[currentLang];

  // Interactive mock chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: currentLang === 'es' 
        ? 'Hola, buenas tardes. Le escribe Elena, gestora de operaciones para este canal comercial. ¿En qué le puedo asistir hoy?\n\n• Agendar una cita de servicio (escribe "agendar")\n• Consultar saldo o pagar orden (escribe "pagar")\n• Transferir a un asesor humano (escribe "humano")'
        : currentLang === 'pt'
        ? 'Olá, boa tarde. Aqui é a Elena, gestora operacional deste canal de atendimento. Como posso ajudar você hoje?\n\n• Agendar um horário de serviço (digite "agendar")\n• Consultar saldo ou pagar pedido (digite "pagar")\n• Falar com um atendente humano (digite "humano")'
        : 'Hello, thank you for writing. This is Elena, operations manager for this business channel. How may I assist you today?\n\n• Schedule a service appointment (type "schedule")\n• Check balance or make a payment (type "pay")\n• Escalate to a human operator (type "human")',
      timestamp: '10:00 AM'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsAiTyping(true);

    // Simulated warm, lifelike conversational delay
    setTimeout(() => {
      let aiText = '';
      const lowerInput = inputText.toLowerCase();

      if (currentLang === 'es') {
        if (lowerInput.includes('cita') || lowerInput.includes('agendar') || lowerInput.includes('calendario') || lowerInput.includes('reserva')) {
          aiText = '📅 Perfecto. He consultado nuestra agenda en tiempo real y contamos con los siguientes horarios disponibles para mañana:\n\n• 10:30 AM\n• 2:00 PM\n• 4:30 PM\n\nPor favor, confírmeme cuál de estas opciones se adapta mejor a su agenda para registrar su espacio de inmediato.';
        } else if (lowerInput.includes('pagar') || lowerInput.includes('cobro') || lowerInput.includes('comprar') || lowerInput.includes('precio') || lowerInput.includes('saldo')) {
          aiText = '💳 Entendido. He generado el enlace de cobro seguro para su pedido a través de nuestra integración certificada con Stripe:\n\n🔗 [Proceder al Pago Seguro (Demo)](https://stripe.com)\n\nUna vez realizado el pago, el sistema validará la transacción de manera autónoma y se iniciará el despacho de su pedido.';
        } else if (lowerInput.includes('10') || lowerInput.includes('2:') || lowerInput.includes('4:')) {
          aiText = 'Muchas gracias. He confirmado su cita de forma exitosa y reservado el bloque en nuestro calendario. Le llegará un recordatorio por WhatsApp 2 horas antes de iniciar. En caso de requerir algún cambio posterior, un operador de nuestro equipo estará disponible para asistirle.';
        } else if (lowerInput.includes('humano') || lowerInput.includes('asesor') || lowerInput.includes('soporte') || lowerInput.includes('operador') || lowerInput.includes('hablar')) {
          aiText = '🛎️ Comprendo. He puesto esta conversación en espera e iniciado la transferencia a nuestro equipo operativo humano. Alejandro de nuestro personal de guardia ha recibido una alerta de prioridad y tomará el control del chat en unos instantes para continuar atendiéndole. (Puede ver cómo el panel del operador registra este traspaso haciendo clic en \'Dashboard\' arriba a la derecha).';
        } else {
          aiText = 'Entendido. Como asistente operacional de este canal, estoy capacitada para gestionar agendamientos de citas, procesar enlaces de cobro con Stripe y calificar consultas iniciales de soporte. ¿Cómo prefiere que procedamos?\n\n• Agendar una cita ("agendar")\n• Realizar un pago seguro ("pagar")\n• Hablar con un especialista humano ("humano")';
        }
      } else if (currentLang === 'pt') {
        if (lowerInput.includes('cita') || lowerInput.includes('agendar') || lowerInput.includes('calendario') || lowerInput.includes('reserva')) {
          aiText = '📅 Com certeza. Verifiquei nossa agenda em tempo real. Temos os seguintes horários disponíveis para amanhã:\n\n• 10:30 AM\n• 2:00 PM\n• 4:30 PM\n\nPor favor, confirme qual desses horários funciona melhor para que eu possa realizar a reserva imediatamente.';
        } else if (lowerInput.includes('pagar') || lowerInput.includes('cobro') || lowerInput.includes('comprar') || lowerInput.includes('precio') || lowerInput.includes('saldo')) {
          aiText = '💳 Compreendido. Gere o link de pagamento seguro para seu pedido usando nossa integração com a Stripe:\n\n🔗 [Proceder ao Pagamento Seguro (Demo)](https://stripe.com)\n\nAssim que o pagamento for processado, o sistema validará a transação de forma autónoma.';
        } else if (lowerInput.includes('10') || lowerInput.includes('2:') || lowerInput.includes('4:')) {
          aiText = 'Muito obrigada. Confirmei seu agendamento com sucesso em nosso calendário. Você receberá um lembrete automático por WhatsApp 2 horas antes do horário. Se precisar ajustar os dados, nossa equipe humana estará à disposição.';
        } else if (lowerInput.includes('humano') || lowerInput.includes('asesor') || lowerInput.includes('soporte') || lowerInput.includes('operador') || lowerInput.includes('hablar')) {
          aiText = '🛎️ Compreendo. Pausei o atendimento automático e iniciei a transferência para nossa equipe humana. Alejandro, nosso operador de plantão, foi notificado e assumirá o controle em instantes. (Você pode ver essa transição em tempo real clicando no \'Dashboard\' no menu superior).';
        } else {
          aiText = 'Entendido. Como assistente operacional deste canal, posso gerenciar agendamentos, processar cobranças Stripe e responder a dúvidas iniciais. Como prefere continuar?\n\n• Agendar horário ("agendar")\n• Realizar pagamento ("pagar")\n• Falar com um atendente ("humano")';
        }
      } else {
        if (lowerInput.includes('book') || lowerInput.includes('appointment') || lowerInput.includes('schedule') || lowerInput.includes('date')) {
          aiText = '📅 Certainly. I have checked our operational calendar in real time. We have the following blocks available for tomorrow:\n\n• 10:30 AM\n• 2:00 PM\n• 4:30 PM\n\nPlease let me know which block works best for you so I can secure your booking immediately.';
        } else if (lowerInput.includes('pay') || lowerInput.includes('buy') || lowerInput.includes('price') || lowerInput.includes('checkout') || lowerInput.includes('balance')) {
          aiText = '💳 Understood. I have generated a secure payment link for your order via our Stripe integration:\n\n🔗 [Proceed to Secure Payment (Demo)](https://stripe.com)\n\nOnce completed, our backend will autonomously validate the transaction and initiate your order dispatch.';
        } else if (lowerInput.includes('10') || lowerInput.includes('2:') || lowerInput.includes('4:')) {
          aiText = 'Thank you. Your appointment is now successfully confirmed and blocked in our calendar. You will receive an automated reminder via WhatsApp 2 hours prior to the slot. If you need to make any adjustments later, a member of our team is always on standby to assist.';
        } else if (lowerInput.includes('human') || lowerInput.includes('agent') || lowerInput.includes('support') || lowerInput.includes('operator') || lowerInput.includes('speak')) {
          aiText = '🛎️ I understand. I have paused automatic replies and initiated a handoff to our human operations team. Alejandro, our on-duty operator, has been notified with high priority and will take over this conversation in a few moments. (You can see how this handoff registers in real time by clicking \'Dashboard\' in the top-right header).';
        } else {
          aiText = 'Understood. As the operations assistant for this channel, I am qualified to manage service bookings, generate secure Stripe checkouts, and resolve general support inquiries. How would you like to proceed?\n\n• Book an appointment ("schedule")\n• Make a secure payment ("pay")\n• Speak with a human operator ("human")';
        }
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsAiTyping(false);
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-200 font-sans antialiased overflow-x-hidden">
      
      <Header />

      {/* Modern, High-Trust Centered Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center text-center space-y-8 relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800/60 rounded-full px-4 py-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" />
          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
            {copy.hero.badge}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12] max-w-3xl">
          {copy.hero.title_part1}{' '}
          <span className="text-[#00a884] block sm:inline">{copy.hero.title_accent}</span>{' '}
          {copy.hero.title_part2}
        </h1>

        {/* Subtitle */}
        <p className="text-zinc-400 text-lg md:text-xl font-normal leading-relaxed max-w-2xl mx-auto">
          {copy.hero.subtitle}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto justify-center">
          <button
            onClick={() => {
              const el = document.getElementById('chat-simulator-box');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-base transition-all hover:scale-[1.01] text-center shadow-md cursor-pointer"
          >
            {copy.hero.cta_primary}
          </button>
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-base text-center transition-all hover:scale-[1.01] shadow-md"
          >
            {copy.hero.cta_secondary}
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="flex justify-center items-center pt-2 text-zinc-500 font-semibold text-xs uppercase tracking-wider">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-[#00a884]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span>{copy.hero.trust}</span>
          </div>
        </div>

        {/* Centerpiece: Interactive WhatsApp Chat Simulator */}
        <div id="chat-simulator-box" className="w-full flex justify-center pt-8">
          <div className="w-full max-w-[420px] rounded-2xl overflow-hidden bg-[#111b21] shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-800/80 relative">
            
            {/* Customer Support Representative Header with Real Human Vibe */}
            <div className="bg-[#202c33] px-4 py-3.5 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center space-x-3.5">
                <div className="relative">
                  {/* Clean SVG Human Avatar Illustration */}
                  <svg className="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 text-gray-200 p-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00a884] border-2 border-[#111b21] absolute bottom-0 right-0" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-white flex items-center">
                    Elena • Oye AI
                    <span className="ml-2 px-2 py-0.5 rounded bg-emerald-950 text-[#00a884] text-[9px] uppercase tracking-wider font-extrabold">
                      {currentLang === 'es' ? 'Gestora de Operaciones' : currentLang === 'pt' ? 'Gestora Operacional' : 'Operations Rep'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-400 flex items-center">
                    Online & Active
                  </p>
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex space-x-3 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </div>
            </div>

            {/* Chat Conversation Body */}
            <div className="h-[340px] overflow-y-auto px-4 py-4 space-y-4 flex flex-col bg-[#0b141a] relative text-left">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div
                    className={`rounded-xl px-3.5 py-2.5 text-xs shadow-md leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-[#005c4b] text-white rounded-tr-none font-medium'
                        : 'bg-[#202c33] text-gray-200 rounded-tl-none border border-gray-800'
                    }`}
                  >
                    {/* Render Stripe Link directly inside chat */}
                    {msg.text.includes('Stripe') ? (
                      <div>
                        {msg.text.split('\n\n')[0]}
                        <div className="mt-2.5 p-3 rounded-lg bg-gray-900 border border-gray-800 flex flex-col">
                          <span className="text-[9px] text-[#00a884] uppercase tracking-widest font-bold">Stripe Checkout</span>
                          <span className="text-xs font-bold text-white mt-0.5">Order Activation Checkout</span>
                          <a 
                            href="https://stripe.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-2 py-2 px-3 rounded bg-[#00a884] hover:bg-[#009675] text-white text-xs font-bold text-center transition-all block shadow-sm"
                          >
                            Proceed to Pay
                          </a>
                        </div>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 px-1 font-mono">{msg.timestamp}</span>
                </div>
              ))}

              {/* AI Typing Indicator */}
              {isAiTyping && (
                <div className="self-start flex flex-col items-start max-w-[85%]">
                  <div className="bg-[#202c33] rounded-xl rounded-tl-none px-3.5 py-3 border border-gray-800 flex items-center space-x-1 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-[#00a884]/70 typing-dot" />
                    <span className="w-2 h-2 rounded-full bg-[#00a884]/70 typing-dot" />
                    <span className="w-2 h-2 rounded-full bg-[#00a884]/70 typing-dot" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#202c33] border-t border-gray-800 flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={currentLang === 'es' ? 'Pregúntale algo ("cita", "pagar")...' : 'Ask Elena ("book", "pay")...'}
                className="flex-grow bg-[#2a3942] border border-gray-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884]/70 transition-all font-sans text-left"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-9 h-9 rounded-lg bg-[#00a884] flex items-center justify-center text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Premium Video Demo Section (Highly Visual, Elegant Graphite Container) */}
      <section className="relative pt-16 pb-8 bg-gradient-to-b from-[#0a0a0c] to-[#0e0e11] overflow-hidden border-t border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,168,132,0.03),transparent_50%)]" />
        <div className="max-w-5xl mx-auto px-6 relative text-center flex flex-col items-center">
          
          <div className="inline-flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800/60 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" />
            <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
              {locale === 'es' ? '✦ Conoce Oye AI en Acción' : locale === 'pt' ? '✦ Conheça o Oye AI em Ação' : '✦ Watch Oye AI in Action'}
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight mb-8">
            {locale === 'es' ? 'Infraestructura operativa de ' : locale === 'pt' ? 'Infraestrutura operacional de ' : 'Operational infrastructure for '}
            <span className="text-[#00a884]">{locale === 'es' ? 'IA para WhatsApp' : locale === 'pt' ? 'IA para WhatsApp' : 'WhatsApp Automation'}</span>
          </h2>

          {/* Video Container with Premium Minimalist Borders */}
          <div className="w-full max-w-4xl rounded-2xl overflow-hidden bg-zinc-950/40 border border-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-2 hover:scale-[1.005] hover:border-zinc-800 transition-all duration-300">
            <video 
              className="w-full h-auto rounded-xl aspect-video object-cover"
              controls
              autoPlay
              muted
              loop
              playsInline
              src="/oye-ai-video.mp4"
            />
          </div>

        </div>
      </section>

      {/* Clean Use Cases Grid Section */}
      <section className="bg-[#0e0e11] py-20 md:py-28 border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">{copy.use_cases.title}</h2>
          <p className="text-zinc-400 mt-3 text-base md:text-lg max-w-xl mx-auto">{copy.use_cases.subtitle}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 text-left">
            
            {/* Restaurant */}
            <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">{copy.use_cases.restaurant}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.use_cases.restaurant_desc}</p>
            </div>

            {/* Clinic */}
            <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">{copy.use_cases.clinic}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.use_cases.clinic_desc}</p>
            </div>

            {/* Salon */}
            <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">{copy.use_cases.salon}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.use_cases.salon_desc}</p>
            </div>

            {/* Real Estate */}
            <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">{copy.use_cases.real_estate}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.use_cases.real_estate_desc}</p>
            </div>

            {/* Local Store */}
            <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">{copy.use_cases.local_store}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.use_cases.local_store_desc}</p>
            </div>

            {/* Agency */}
            <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">{copy.use_cases.agency}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.use_cases.agency_desc}</p>
            </div>

            {/* Service Business */}
            <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col space-y-4 hover:border-[#00a884]/30 transition-all duration-300 lg:col-span-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-white text-lg">{copy.use_cases.service}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.use_cases.service_desc}</p>
            </div>

          </div>
        </div>
      </section>

      {/* Human Features Highlights section */}
      <section className="max-w-7xl mx-auto px-6 py-24 md:py-32 text-center flex flex-col space-y-16">
        <div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">{copy.features.title}</h2>
          <p className="text-zinc-400 mt-3 text-base md:text-lg max-w-xl mx-auto">{copy.features.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Smart Answers */}
          <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col text-left space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg">{copy.features.ai_title}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">{copy.features.ai_desc}</p>
          </div>

          {/* Bookings */}
          <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col text-left space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg">{copy.features.booking_title}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">{copy.features.booking_desc}</p>
          </div>

          {/* Direct checkout */}
          <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col text-left space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg">{copy.features.payment_title}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">{copy.features.payment_desc}</p>
          </div>

          {/* Handoff */}
          <div className="p-6.5 rounded-xl bg-[#121215] border border-zinc-900 flex flex-col text-left space-y-4 hover:border-[#00a884]/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#00a884] border border-zinc-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg">{copy.features.handoff_title}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">{copy.features.handoff_desc}</p>
          </div>
        </div>
      </section>

      {/* Trust & Security Platform Controls (No scifi, secure positioning) */}
      <section className="bg-[#0e0e11] py-20 md:py-28 border-y border-zinc-900 text-left">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">{copy.trust_security.title}</h2>
            <p className="text-zinc-400 text-base leading-relaxed">{copy.trust_security.subtitle}</p>
            
            <div className="p-5.5 rounded-xl bg-[#121215] border border-zinc-900 flex items-center space-x-4 mt-6">
              <svg className="w-8 h-8 text-[#00a884] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <h4 className="text-white font-bold text-sm">WhatsApp Business Authorized Core</h4>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">Built on the official WhatsApp Cloud APIs for maximum speed and security compliance.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Secure data */}
            <div className="p-6 bg-[#121215] rounded-xl border border-zinc-900 flex flex-col space-y-2">
              <h4 className="font-bold text-white text-base">{copy.trust_security.secure_title}</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.trust_security.secure_desc}</p>
            </div>

            {/* Audit Logs */}
            <div className="p-6 bg-[#121215] rounded-xl border border-zinc-900 flex flex-col space-y-2">
              <h4 className="font-bold text-white text-base">{copy.trust_security.audit_title}</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.trust_security.audit_desc}</p>
            </div>

            {/* Live hand override */}
            <div className="p-6 bg-[#121215] rounded-xl border border-zinc-900 flex flex-col space-y-2">
              <h4 className="font-bold text-white text-base">{copy.trust_security.hand_title}</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.trust_security.hand_desc}</p>
            </div>

            {/* Business limits */}
            <div className="p-6 bg-[#121215] rounded-xl border border-zinc-900 flex flex-col space-y-2">
              <h4 className="font-bold text-white text-base">{copy.trust_security.business_title}</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">{copy.trust_security.business_desc}</p>
            </div>

          </div>

        </div>
      </section>

      {/* Pricing CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
        <div className="bg-[#121215] border border-zinc-900 rounded-2xl p-10 md:p-16 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00a884]/[0.02] rounded-full blur-3xl pointer-events-none" />
          
          <span className="text-[#00a884] text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 bg-[#0a0a0c] border border-zinc-800 rounded-full inline-block mb-6">
            {locale === 'es' ? 'Precios Flexibles' : locale === 'pt' ? 'Preços Flexíveis' : 'Flexible Pricing'}
          </span>
          
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            {locale === 'es' 
              ? 'Planes transparentes que escalan con tu negocio' 
              : locale === 'pt' 
                ? 'Planos transparentes que escalam com seu negocio' 
                : 'Transparent plans that scale with your business'}
          </h2>
          
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            {locale === 'es'
              ? 'Elige el plan ideal para tu negocio. Ofrecemos herramientas completas de agendamiento, cobro automatizado e IA humanizada con el control operativo que necesitas.'
              : locale === 'pt'
                ? 'Escolha o plano ideal para a sua empresa. Oferecemos ferramentas completas de agendamento, faturamento automatizado e IA de alto nível.'
                : 'Choose the ideal plan for your business. We offer complete tools for automated booking, direct checkouts, and humanized AI with the operational safety you need.'}
          </p>
          
          <Link
            href="/pricing"
            className="inline-block px-8 py-4 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl font-bold text-base shadow-sm transition-all hover:scale-[1.01]"
          >
            {locale === 'es' ? 'Ver Planes y Precios →' : locale === 'pt' ? 'Ver Planos e Preços →' : 'View Plans & Pricing →'}
          </Link>
        </div>
      </section>

      <Footer />

    </div>
  );
}
