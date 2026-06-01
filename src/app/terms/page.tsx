'use client';

import React from 'react';
import { useTranslation } from '@/components/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TERMS_DICT = {
  es: {
    hero: {
      badge: "✦ Marco Legal de Uso",
      title: "Términos de",
      title_accent: "Servicio",
      subtitle: "Al usar Oye AI aceptas estos términos que regulan la relación comercial, el uso del servicio y la protección de datos."
    },
    sections: {
      last_updated: "Última actualización: 21 de mayo, 2026",
      intro_title: "1. Aceptación de los Términos",
      intro_body: "Al crear una cuenta en Oye AI (\"Servicio\", \"Plataforma\"), contratar una suscripción mensual, o utilizar cualquiera de nuestros empleados virtuales de IA, el cliente (\"Usuario\") acepta de manera irrestricta sujetarse a las presentes condiciones de uso.",
      
      usage_title: "2. Licencia de Uso y Restricciones",
      usage_body: "Otorgamos al Usuario una licencia no exclusiva, revocable e intransferible para acceder y configurar agentes conversacionales de IA autónomos en su número de WhatsApp corporativo:",
      usage_items: [
        "**Mensajería Permitida**: Queda estrictamente prohibido utilizar el Servicio para enviar spam masivo, mensajes engañosos, o contenido ilegal que viole las políticas comerciales oficiales de Meta (WhatsApp Business Policy).",
        "**Cumplimiento Legal**: El Usuario garantiza que cuenta con el consentimiento explícito de sus clientes finales para contactarlos vía WhatsApp y enviarles alertas o procesar transacciones.",
        "**Límites de Uso**: Cada plan comercial tiene asignados límites de mensajes procesados por la IA. El rebasar estos límites podría causar la suspensión temporal del agente conversacional o cargos de actualización automática autorizados por el Usuario."
      ],

      payments_title: "3. Pagos, Facturación y Cancelaciones",
      payments_body: "El esquema de contratación y cobro se rige por las siguientes pautas de comercio electrónico:",
      payments_items: [
        "**Suscripciones**: El cobro se realiza de manera recurrente cada 30 días a la tarjeta de crédito o método de pago registrado a través de nuestro pasarela segura Stripe.",
        "**Reembolsos**: Oye AI no ofrece reembolsos retroactivos sobre mensualidades ya cursadas. Puedes cancelar el cobro automático de tu plan con un solo clic directamente en tu panel de control.",
        "**Actualizaciones de Plan**: Si decides subir de plan comercial, los límites se incrementarán al instante y se aplicará un cargo prorrateado en tu siguiente periodo de facturación."
      ],

      liability_title: "4. Deslindes y Limitación de Responsabilidad",
      liability_body: "El Usuario reconoce que la plataforma de Oye AI opera mediante modelos generativos y APIs deIA de terceros:",
      liability_items: [
        "**Uptime y API**: Aunque mantenemos un SLA del 99.9% en nuestra infraestructura central, no nos hacemos responsables por fallos generales, caídas de servidores globales de Meta o bloqueos temporales de tu línea telefónica comercial dictaminados por algoritmos automatizados de seguridad de WhatsApp.",
        "**Contenido de la IA**: El Usuario es responsable de configurar adecuadamente las instrucciones base (prompting) y la base de conocimientos de su IA. Oye AI no se responsabiliza por cotizaciones imprecisas, interpretaciones erróneas, o compromisos transaccionales incorrectos generados autónomamente por la IA."
      ],

      termination_title: "5. Cancelación del Servicio",
      termination_body: "Nos reservamos el derecho de cancelar de forma indefinida tu cuenta, accesos a base de datos e integración de WhatsApp ante comportamientos sospechosos de phishing, conductas abusivas, impagos persistentes o violación intencionada de estos términos. El Usuario es libre de dar de baja su servicio en cualquier momento sin penalizaciones adicionales.",

      governing_title: "6. Consultas Legales",
      governing_body: "Para cualquier aclaración de términos comerciales, auditorías contractuales o reclamos de facturas, puedes contactarnos enviando un correo directamente a **billing@oye-ai.com** o escribiendo en nuestra sección de [Contacto](/contact)."
    }
  },
  en: {
    hero: {
      badge: "✦ Legal Framework",
      title: "Terms of",
      title_accent: "Service",
      subtitle: "By accessing Oye AI, you agree to these legal conditions governing your commercial account, service limits, and data rules."
    },
    sections: {
      last_updated: "Last updated: May 21, 2026",
      intro_title: "1. Acceptance of Terms",
      intro_body: "By creating an account, selecting a monthly pricing tier, or deploying any Oye AI virtual agent on your business lines, you (\"User\", \"Client\") fully agree to be bound by these unified terms of service.",
      
      usage_title: "2. Usage License & Restrictions",
      usage_body: "We grant you a non-exclusive, revocable, and non-transferable right to access and config autonomous WhatsApp conversation engines for your business lines:",
      usage_items: [
        "**Spam and Abuse Policy**: You are strictly prohibited from using our tools to run unsolicited mass marketing, fraudulent actions, or violate Meta's official WhatsApp Business Policy.",
        "**Consent Requirements**: The User certifies they hold prior opt-in permissions from all end-customers prior to initiating outbound chats, custom orders, or transactional links.",
        "**Plan Constraints**: Standard pricing plans come with set limits for AI messages. Exceeding monthly plan limits might result in temporary throttling or pre-approved top-ups."
      ],

      payments_title: "3. Payments, Billing & Cancellation",
      payments_body: "Financial transactions and recurring plans are governed by the following rules:",
      payments_items: [
        "**Subscriptions**: Billing is recurring every 30 days and processed securely using Stripe card rails.",
        "**No Refund Policy**: We do not process retroactive refunds. You can cancel your automatic recurring subscription at any time with a single click inside your account console.",
        "**Tier Upgrades**: Upgrading your tier scales your operational limits instantly. The prorated difference will be reflected on your next billing schedule."
      ],

      liability_title: "4. Disclaimers & Limits of Liability",
      liability_body: "The User acknowledges Oye AI relies on third-party generative infrastructures and Meta network APIs:",
      liability_items: [
        "**Service Outages**: While we maintain a 99.9% uptime goal on our platform backend, we are not liable for outages on Meta's global WhatsApp networks or carrier line suspensions due to automatic spam flags.",
        "**AI Context Errors**: The User holds ultimate responsibility for customizing and auditing knowledge bases. Oye AI is not responsible for inaccurate price quotes or errors made by the generative LLM."
      ],

      termination_title: "5. Account Termination",
      termination_body: "We reserve the right to terminate your account immediately and block WhatsApp integrations in cases of suspected spam, phishing attempts, card chargeback abuse, or violations of these guidelines. You can cancel service without any exit fees at your choice.",

      governing_title: "6. Legal & Support Questions",
      governing_body: "For commercial clarifications, invoices, custom SLAs, or billing disputes, reach us directly at **billing@oye-ai.com** or via our [Contact Page](/contact)."
    }
  },
  pt: {
    hero: {
      badge: "✦ Regulamento de Uso",
      title: "Termos de",
      title_accent: "Serviço",
      subtitle: "Ao utilizar a Oye AI você aceita estes termos que regulamentam a relação comercial, limites de uso e proteção de dados."
    },
    sections: {
      last_updated: "Última atualização: 21 de maio, 2026",
      intro_title: "1. Aceitação dos Termos",
      intro_body: "Ao criar uma conta na Oye AI (\"Serviço\", \"Plataforma\"), assinar um plano mensal ou utilizar qualquer um de nossos agentes de inteligência artificial de WhatsApp, o usuário (\"Cliente\") aceita integralmente as regras estabelecidas neste termo.",
      
      usage_title: "2. Licença de Uso e Restrições",
      usage_body: "Concedemos ao Usuário uma licença limitada e revogável para configurar IAs em seus números comerciais:",
      usage_items: [
        "**Spam Proibido**: É expressamente proibido utilizar o Serviço para disparo de spam em massa, mensagens fraudulentas ou contrárias às diretrizes oficiais da Meta (WhatsApp Business Policy).",
        "**Autorização do Cliente**: O Usuário garante que possui permissão expressa de seus clientes finais para enviar mensagens ou alertas no WhatsApp.",
        "**Limites Operacionais**: Os planos possuem limites mensais de mensagens. Atingir os limites de processamento pode pausar a IA até a renovação ou upgrade voluntário."
      ],

      payments_title: "3. Pagamentos, Assinatura e Cancelamento",
      payments_body: "As regras financeiras de e-commerce e contratação de planos consistem em:",
      payments_items: [
        "**Assinaturas**: A cobrança é feita de forma recorrente a cada 30 dias diretamente no cartão de crédito via Stripe.",
        "**Sem Reembolso**: Não há devolução de valores após o início do ciclo de faturamento contratado. Você pode cancelar sua assinatura instantaneamente no painel com um clique.",
        "**Upgrades**: A migração de plano é imediata e a diferença pró-rata é faturada no ciclo subsequente."
      ],

      liability_title: "4. Limitação de Responsabilidade",
      liability_body: "O Usuário compreende que a Oye AI funciona com APIs de terceiros (Meta, OpenAI):",
      liability_items: [
        "**Instabilidade**: Embora nossa infraestrutura opere com 99.9% de SLA de disponibilidade, não nos responsabilizamos por quedas globais na rede da Meta ou bloqueios de número impostos pela segurança do WhatsApp.",
        "**Precisão da IA**: O Usuário é responsável pelo treinamento e prompts fornecidos à IA. A Oye AI não se responsabiliza por erros de preço ou respostas imprecisas geradas de forma autônoma pela IA."
      ],

      termination_title: "5. Rescisão",
      termination_body: "A Oye AI se reserva o direito de desativar contas envolvidas com práticas de phishing, mensagens abusivas ou inadimplência recorrente. O Usuário pode cancelar o serviço quando quiser, sem taxas de saída.",

      governing_title: "6. Dúvidas Fiscais e Jurídicas",
      governing_body: "Para dúvidas comerciais, notas fiscais ou termos especiais, contate nosso suporte em **billing@oye-ai.com** ou escreva diretamente na nossa página de [Contato](/contact)."
    }
  }
};

export default function TermsPage() {
  const { locale } = useTranslation();
  const currentLang = TERMS_DICT[locale] ? locale : 'en';
  const copy = TERMS_DICT[currentLang];

  return (
    <div className="min-h-screen bg-[#0e1116] text-[#f3f4f6] font-sans antialiased overflow-x-hidden flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 md:py-24 border-b border-gray-800 bg-gradient-to-b from-[#0e1116] to-[#0b141a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,168,132,0.06),transparent_45%)]" />
        <div className="max-w-4xl mx-auto px-6 relative text-center">
          <div className="inline-flex items-center space-x-2 bg-emerald-950/40 border border-emerald-800/40 rounded-full px-3.5 py-1.5 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00a884] animate-pulse" />
            <span className="text-xs font-bold text-[#00a884] tracking-wide uppercase">
              {copy.hero.badge}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
            {copy.hero.title}{' '}
            <span className="text-[#00a884] block sm:inline">{copy.hero.title_accent}</span>
          </h1>

          <p className="text-gray-400 text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto">
            {copy.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Editorial Content Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 w-full flex-grow">
        <div className="bg-[#121820]/40 border border-gray-850 rounded-2xl p-8 md:p-12 space-y-10 shadow-xl backdrop-blur-sm">
          
          <div className="text-xs font-semibold text-gray-500 border-b border-gray-800 pb-4 flex items-center justify-between">
            <span>{copy.sections.last_updated}</span>
            <span className="text-[#00a884]">Oye AI Legal</span>
          </div>

          {/* Section 1: Acceptance */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.intro_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.intro_body}
            </p>
          </div>

          {/* Section 2: Usage License */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.usage_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.usage_body}
            </p>
            <ul className="space-y-3 pl-4">
              {copy.sections.usage_items.map((item, idx) => (
                <li key={idx} className="text-gray-300 text-xs md:text-sm leading-relaxed flex items-start space-x-2.5">
                  <span className="text-[#00a884] mt-1 text-sm">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Payments & Cancellation */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.payments_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.payments_body}
            </p>
            <ul className="space-y-3 pl-4">
              {copy.sections.payments_items.map((item, idx) => (
                <li key={idx} className="text-gray-300 text-xs md:text-sm leading-relaxed flex items-start space-x-2.5">
                  <span className="text-[#00a884] mt-1 text-sm">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Section 4: Liability */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.liability_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.liability_body}
            </p>
            <ul className="space-y-3 pl-4">
              {copy.sections.liability_items.map((item, idx) => (
                <li key={idx} className="text-gray-300 text-xs md:text-sm leading-relaxed flex items-start space-x-2.5">
                  <span className="text-[#00a884] mt-1 text-sm">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Section 5: Termination */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.termination_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.termination_body}
            </p>
          </div>

          {/* Section 6: Legal Governing */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.governing_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed" 
               dangerouslySetInnerHTML={{ 
                 __html: copy.sections.governing_body
                   .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-[#00a884] hover:underline font-semibold">$1</a>') 
               }} 
            />
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
