'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/components/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PRICING_DICT = {
  es: {
    hero: {
      badge: "✦ Planes y Tarifas",
      title: "Soluciones a tu medida,",
      title_accent: "sin sorpresas",
      subtitle: "Encuentra el plan perfecto para delegar la atención operativa y las ventas de tu negocio a un empleado de IA autónomo."
    },
    plans: {
      billed_monthly: "/ mes",
      cta: "Comenzar Ahora",
      limit_msgs: "mensajes de WhatsApp al mes",
      limit_ai: "respuestas de IA incluidas",
      limit_seats: "operador humano",
      limit_seats_plural: "operadores humanos",
      support_basic: "Soporte básico por correo",
      support_priority: "Soporte prioritario 24/7",
      support_dedicated: "Gerente de cuenta dedicado",
      popular: "POPULAR"
    },
    faq: {
      title: "Preguntas Frecuentes",
      q1: "¿Cómo se integra Oye AI con mi número de WhatsApp?",
      a1: "Nos conectamos de forma oficial a través de la API de WhatsApp Cloud. Puedes conservar tu número actual o te ayudamos a configurar uno totalmente nuevo para tu negocio.",
      q2: "¿Puedo cambiar de plan o cancelar en cualquier momento?",
      a2: "Sí, todos nuestros planes son mensuales y sin contratos de permanencia. Puedes subir, bajar o cancelar tu plan directamente desde tu panel de facturación con un clic.",
      q3: "¿Qué sucede si supero el límite de mensajes del mes?",
      a3: "Te notificaremos cuando estés cerca de tu límite. Podrás adquirir paquetes adicionales de mensajes o subir de plan para evitar interrupciones en el servicio.",
      q4: "¿El traspaso humano funciona de verdad?",
      a4: "Absolutamente. En cualquier momento de la conversación, si el cliente solicita un operador humano o si la IA detecta que es necesario, la automatización se pausa y tu equipo recibe una notificación sonora y visual en tiempo real en la bandeja de entrada para intervenir."
    }
  },
  en: {
    hero: {
      badge: "✦ Pricing & Plans",
      title: "Flexible solutions,",
      title_accent: "zero surprises",
      subtitle: "Choose the perfect plan to delegate client billing, automated booking, and 24/7 humanized support to your virtual AI employee."
    },
    plans: {
      billed_monthly: "/ mo",
      cta: "Get Started Now",
      limit_msgs: "WhatsApp messages / mo",
      limit_ai: "AI replies included",
      limit_seats: "human operator seat",
      limit_seats_plural: "human operator seats",
      support_basic: "Basic email support",
      support_priority: "24/7 priority support",
      support_dedicated: "Dedicated account manager",
      popular: "POPULAR"
    },
    faq: {
      title: "Frequently Asked Questions",
      q1: "How does Oye AI connect with my WhatsApp number?",
      a1: "We connect officially using the secure WhatsApp Cloud API. You can keep your existing number or we can help you register a completely new one for your business operations.",
      q2: "Can I upgrade, downgrade, or cancel at any time?",
      a2: "Yes! All plans are billed on a flexible monthly basis with zero commitments. You can modify or terminate your plan instantly from your billing portal.",
      q3: "What happens if I exceed my monthly message limits?",
      a3: "We will alert you when you reach 80% and 100% of your limits. You can easily purchase top-up bundles or switch to the next tier to keep operations smooth.",
      q4: "Does the human handoff really work?",
      a4: "Absolutely. At any stage of the conversation, if a client requests an operator or if the AI detects complex intents, the automation pauses. Your team gets sound alerts and visual highlights inside the unified inbox to take over immediately."
    }
  },
  pt: {
    hero: {
      badge: "✦ Planos e Tarifas",
      title: "Soluções flexíveis,",
      title_accent: "sem surpresas",
      subtitle: "Escolha o plano ideal para delegar faturamento, agendamento automatizado e atendimento 24/7 à sua IA inteligente no WhatsApp."
    },
    plans: {
      billed_monthly: "/ mês",
      cta: "Começar Agora",
      limit_msgs: "mensagens de WhatsApp / mês",
      limit_ai: "respostas de IA incluídas",
      limit_seats: "assento de operador",
      limit_seats_plural: "assentos de operadores",
      support_basic: "Suporte básico por e-mail",
      support_priority: "Suporte prioritário 24/7",
      support_dedicated: "Gerente de conta dedicado",
      popular: "POPULAR"
    },
    faq: {
      title: "Perguntas Frequentes",
      q1: "Como o Oye AI se conecta com o meu número de WhatsApp?",
      a1: "Nós nos conectamos oficialmente usando a API oficial da nuvem do WhatsApp. Você pode usar seu número atual ou nós ajudamos você a registrar um novo número dedicado.",
      q2: "Posso alterar ou cancelar meu plano a qualquer momento?",
      a2: "Sim! Nossos planos são mensais sem qualquer fidelidade ou taxas extras. Você pode gerenciar seu plano diretamente nas configurações de cobrança com um clique.",
      q3: "O que acontece se eu ultrapassar os limites do plano?",
      a3: "Enviaremos notificações automáticas quando estiver próximo do limite. Você poderá adquirir pacotes adicionais ou migrar de plano para evitar interrupções.",
      q4: "A transição para humanos realmente funciona?",
      a4: "Com certeza. Se um cliente solicitar atendimento humano ou a IA detectar intenções complexas, a automação é pausada e sua equipe recebe alertas sonoros e notificações em tempo real na caixa de entrada para assumir imediatamente."
    }
  }
};

export default function PricingPage() {
  const { locale } = useTranslation();
  const currentLang = PRICING_DICT[locale] ? locale : 'en';
  const copy = PRICING_DICT[currentLang];

  return (
    <div className="min-h-screen bg-[#0e1116] text-[#f3f4f6] font-sans antialiased overflow-x-hidden flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 border-b border-gray-800 bg-gradient-to-b from-[#0e1116] to-[#0b141a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,168,132,0.06),transparent_45%)]" />
        <div className="max-w-4xl mx-auto px-6 relative text-center">
          <div className="inline-flex items-center space-x-2 bg-emerald-950/40 border border-emerald-800/40 rounded-full px-3.5 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse" />
            <span className="text-xs font-bold text-[#00a884] tracking-wide uppercase">
              {copy.hero.badge}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12] mb-6">
            {copy.hero.title}{' '}
            <span className="text-[#00a884] block sm:inline">{copy.hero.title_accent}</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl font-normal leading-relaxed max-w-2xl mx-auto">
            {copy.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Main Pricing Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20 items-stretch">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Starter Plan */}
          <div className="p-6.5 rounded-xl bg-gray-900/40 border border-gray-800 flex flex-col justify-between text-left space-y-6 hover:border-gray-700 transition-all hover:scale-[1.01]">
            <div>
              <h3 className="font-bold text-lg text-white">Starter</h3>
              <p className="text-xs text-gray-500 mt-1">
                {currentLang === 'es' ? 'Para profesionales independientes y pequeños locales.' : currentLang === 'pt' ? 'Para profissionais autônomos e pequenos comércios.' : 'For independent professionals and small local shops.'}
              </p>
              
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$29</span>
                <span className="text-xs text-gray-500 font-semibold ml-1">{copy.plans.billed_monthly}</span>
              </div>
              
              <ul className="mt-6 space-y-3.5 text-xs text-gray-300">
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>1,000 {copy.plans.limit_msgs}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>500 {copy.plans.limit_ai}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>1 {copy.plans.limit_seats}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>{copy.plans.support_basic}</span>
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="py-3 rounded-lg border border-gray-700 bg-gray-900 text-center font-bold text-xs text-white hover:bg-gray-800 transition-all block"
            >
              {copy.plans.cta}
            </Link>
          </div>

          {/* Growth Plan */}
          <div className="p-6.5 rounded-xl bg-gray-900/40 border border-gray-800 flex flex-col justify-between text-left space-y-6 hover:border-gray-700 transition-all hover:scale-[1.01]">
            <div>
              <h3 className="font-bold text-lg text-white">Growth</h3>
              <p className="text-xs text-gray-500 mt-1">
                {currentLang === 'es' ? 'Para negocios medianos listos para automatizar flujos completos.' : currentLang === 'pt' ? 'Para empresas prontas para automatizar fluxos completos.' : 'For growing businesses ready to fully automate client flows.'}
              </p>
              
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$59</span>
                <span className="text-xs text-gray-500 font-semibold ml-1">{copy.plans.billed_monthly}</span>
              </div>
              
              <ul className="mt-6 space-y-3.5 text-xs text-gray-300">
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>5,000 {copy.plans.limit_msgs}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>3,000 {copy.plans.limit_ai}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>3 {copy.plans.limit_seats_plural}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>{copy.plans.support_basic}</span>
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="py-3 rounded-lg border border-gray-700 bg-gray-900 text-center font-bold text-xs text-white hover:bg-gray-800 transition-all block"
            >
              {copy.plans.cta}
            </Link>
          </div>

          {/* Pro Plan (Highly Recommended) */}
          <div className="p-6.5 rounded-xl bg-gray-900 border-2 border-[#00a884]/40 flex flex-col justify-between text-left space-y-6 relative shadow-md hover:scale-[1.01] transition-all">
            <span className="absolute top-0 right-6 translate-y-[-50%] bg-[#00a884] text-white text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full">
              {copy.plans.popular}
            </span>
            
            <div>
              <h3 className="font-bold text-lg text-white">Professional</h3>
              <p className="text-xs text-gray-500 mt-1">
                {currentLang === 'es' ? 'Nuestra solución ideal con soporte avanzado e integraciones completas.' : currentLang === 'pt' ? 'Nossa solução ideal com integrações robustas e suporte prioritário.' : 'Our ideal solution featuring advanced integrations and priorities.'}
              </p>
              
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$89</span>
                <span className="text-xs text-gray-500 font-semibold ml-1">{copy.plans.billed_monthly}</span>
              </div>
              
              <ul className="mt-6 space-y-3.5 text-xs text-gray-300">
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>15,000 {copy.plans.limit_msgs}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>10,000 {copy.plans.limit_ai}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>8 {copy.plans.limit_seats_plural}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>{copy.plans.support_priority}</span>
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="py-3 rounded-lg bg-[#00a884] hover:bg-[#009675] text-center font-bold text-xs text-white transition-all shadow-sm block"
            >
              {copy.plans.cta}
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="p-6.5 rounded-xl bg-gray-900/40 border border-gray-800 flex flex-col justify-between text-left space-y-6 hover:border-gray-700 transition-all hover:scale-[1.01]">
            <div>
              <h3 className="font-bold text-lg text-white">Enterprise</h3>
              <p className="text-xs text-gray-500 mt-1">
                {currentLang === 'es' ? 'Solución a gran escala para marcas con alto volumen de transacciones.' : currentLang === 'pt' ? 'Solução sob medida para corporações com alto volume de transações.' : 'Scalable enterprise solution for high-volume transactions.'}
              </p>
              
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">Custom</span>
              </div>
              
              <ul className="mt-6 space-y-3.5 text-xs text-gray-300">
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>Unlimited {copy.plans.limit_msgs}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>Unlimited {copy.plans.limit_ai}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>Custom {copy.plans.limit_seats_plural}</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="text-[#00a884]">✓</span>
                  <span>{copy.plans.support_dedicated}</span>
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="py-3 rounded-lg border border-gray-700 bg-gray-900 text-center font-bold text-xs text-white hover:bg-gray-800 transition-all block"
            >
              {copy.plans.cta}
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#121820] py-20 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-white text-center mb-12">{copy.faq.title}</h2>
          
          <div className="space-y-8">
            <div className="p-6 bg-[#0e1116] rounded-xl border border-gray-800">
              <h4 className="font-bold text-white text-base mb-2">{copy.faq.q1}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{copy.faq.a1}</p>
            </div>
            <div className="p-6 bg-[#0e1116] rounded-xl border border-gray-800">
              <h4 className="font-bold text-white text-base mb-2">{copy.faq.q2}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{copy.faq.a2}</p>
            </div>
            <div className="p-6 bg-[#0e1116] rounded-xl border border-gray-800">
              <h4 className="font-bold text-white text-base mb-2">{copy.faq.q3}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{copy.faq.a3}</p>
            </div>
            <div className="p-6 bg-[#0e1116] rounded-xl border border-gray-800">
              <h4 className="font-bold text-white text-base mb-2">{copy.faq.q4}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{copy.faq.a4}</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
