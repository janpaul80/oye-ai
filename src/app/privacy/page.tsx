'use client';

import React from 'react';
import { useTranslation } from '@/components/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PRIVACY_DICT = {
  es: {
    hero: {
      badge: "✦ Seguridad y Confianza",
      title: "Políticas de",
      title_accent: "Privacidad",
      subtitle: "En Oye AI la privacidad de tu negocio y la de tus clientes es nuestra máxima prioridad. Aquí detallamos cómo protegemos y gestionamos tu información."
    },
    sections: {
      last_updated: "Última actualización: 21 de mayo, 2026",
      introduction_title: "1. Introducción y Alcance",
      introduction_body: "Esta Política de Privacidad describe cómo Oye AI (\"nosotros\", \"nuestro\") recopila, utiliza, procesa y protege la información personal y los datos de conversación de los usuarios de nuestra plataforma de automatización de WhatsApp, así como la de los clientes finales que interactúan con los agentes de IA de nuestros suscriptores.",
      
      data_collection_title: "2. Información que Recopilamos",
      data_collection_body: "Para ofrecer un servicio de empleado virtual de IA eficiente, recopilamos:",
      data_collection_items: [
        "**Datos de Cuenta**: Nombre, correo electrónico, número de WhatsApp comercial, detalles de facturación de Stripe y credenciales de acceso.",
        "**Datos de Clientes Finales**: Número de teléfono, nombre de contacto de WhatsApp y el historial de mensajes intercambiados con el agente de IA.",
        "**Tokens de Integración**: Credenciales cifradas de la API oficial de WhatsApp Cloud y webhooks de bases de datos o CRM vinculados."
      ],

      usage_title: "3. Uso de la Información",
      usage_body: "Utilizamos la información recopilada únicamente para:",
      usage_items: [
        "Procesar y responder mensajes automáticos en tiempo real a través de modelos de lenguaje autorizados.",
        "Proveer la bandeja de entrada unificada para que operadores humanos intervengan en los chats.",
        "Optimizar el entrenamiento de los agentes de IA exclusivos de tu negocio (tus datos jamás se usan para entrenar modelos públicos o de competidores).",
        "Gestionar suscripciones, facturación y prevenir el uso indebido de la plataforma."
      ],

      retention_title: "4. Retención de Datos y Seguridad",
      retention_body: "Implementamos medidas de seguridad de grado empresarial para salvaguardar tu información:",
      retention_items: [
        "**Cifrado Avanzado**: Todos los datos se transmiten mediante canales HTTPS/SSL y se almacenan con cifrado AES-256 en reposo.",
        "**Políticas de Retención**: Los registros de conversaciones se conservan durante un período máximo de 180 días, tras el cual se archivan de manera anónima o se eliminan permanentemente, a menos que configures un período personalizado.",
        "**Aislamiento de Datos**: Cada base de datos de cliente está estrictamente aislada (multi-tenant estricto) para evitar cualquier filtración de información."
      ],

      whatsapp_title: "5. API de WhatsApp y Terceros",
      whatsapp_body: "Nuestra integración se realiza bajo los términos y directrices oficiales de Meta y la API de WhatsApp Cloud. Oye AI no comparte información con redes de publicidad externas. Solo compartimos datos indispensables con proveedores de infraestructura tecnológica autorizados (como OpenAI y Stripe) bajo estrictos contratos de confidencialidad y procesamiento seguro.",

      contact_title: "6. Tus Derechos y Contacto",
      contact_body: "Tienes derecho a acceder, rectificar, limitar o solicitar la eliminación total de tus datos personales y del historial de conversaciones en cualquier momento. Si tienes dudas sobre nuestras prácticas de privacidad, puedes contactarnos directamente enviando un correo a **privacy@oye-ai.com** o escribiéndonos en nuestra sección de [Contacto](/contact)."
    }
  },
  en: {
    hero: {
      badge: "✦ Security & Trust",
      title: "Privacy",
      title_accent: "Policy",
      subtitle: "At Oye AI, safeguarding your business operations and your customers' data is our highest commitment. Learn how we handle and secure your information."
    },
    sections: {
      last_updated: "Last updated: May 21, 2026",
      introduction_title: "1. Introduction & Scope",
      introduction_body: "This Privacy Policy describes how Oye AI (\"we\", \"our\", \"us\") collects, uses, processes, and protects the personal information and chat logs of subscribers of our WhatsApp automation platform, as well as the end-customers interacting with our subscribers' AI agents.",
      
      data_collection_title: "2. Information We Collect",
      data_collection_body: "In order to deliver an efficient virtual AI employee service, we collect:",
      data_collection_items: [
        "**Account Details**: Full name, email address, commercial WhatsApp number, Stripe billing details, and login credentials.",
        "**End-Customer Information**: Phone numbers, WhatsApp display names, and the chronological text/media logs exchanged with the AI agent.",
        "**Integration Tokens**: Encrypted WhatsApp Cloud API tokens and linked CRM/database webhook configurations."
      ],

      usage_title: "3. How We Use Information",
      usage_body: "We process collected information strictly to:",
      usage_items: [
        "Process and generate automatic, context-aware replies in real-time using secure language model pipelines.",
        "Maintain the unified live chat console for human fallback operations.",
        "Train and refine your business's proprietary AI knowledge base (your customer data is never used to train public or competitive models).",
        "Manage subscription tiers, prevent fraudulent activities, and maintain system health."
      ],

      retention_title: "4. Data Security & Retention",
      retention_body: "We implement enterprise-grade security protocols to protect your information:",
      retention_items: [
        "**Robust Encryption**: All communication is encrypted via secure SSL/HTTPS channels. Data is stored using industry-standard AES-256 encryption at rest.",
        "**Strict Retention Policy**: Chat logs are retained for a maximum of 180 days before being automatically anonymized or purged, unless you define custom rules inside your settings.",
        "**Strict Isolation**: Customer database nodes are mathematically isolated (strict multi-tenant structure) to prevent cross-account data leaks."
      ],

      whatsapp_title: "5. WhatsApp Cloud API & Third Parties",
      whatsapp_body: "Our platform complies fully with Meta's developer rules and WhatsApp Cloud API standards. Oye AI never sells customer data to advertising brokers. Information is shared only with certified infrastructure partners (e.g., OpenAI, Stripe) strictly to compute AI inference and settle secure invoices.",

      contact_title: "6. Your Rights & Contacts",
      contact_body: "You retain full ownership of your data. You can access, export, correct, or request the permanent purge of your account details and customer logs at any time. For privacy inquiries, please contact us directly at **privacy@oye-ai.com** or send a message through our [Contact Page](/contact)."
    }
  },
  pt: {
    hero: {
      badge: "✦ Segurança e Confiança",
      title: "Políticas de",
      title_accent: "Privacidade",
      subtitle: "Na Oye AI, a privacidade do seu negócio e dos seus clientes é a nossa prioridade número um. Veja como protegemos e gerenciamos suas informações."
    },
    sections: {
      last_updated: "Última atualização: 21 de maio, 2026",
      introduction_title: "1. Introdução e Escopo",
      introduction_body: "Esta Política de Privacidade descreve como a Oye AI (\"nós\", \"nosso\") coleta, utiliza, processa e protege os dados pessoais e históricos de conversas dos usuários assinantes da plataforma, bem como dos clientes finais que interagem com os agentes de IA de nossos parceiros.",
      
      data_collection_title: "2. Informações que Coletamos",
      data_collection_body: "Para fornecer um serviço robusto de inteligência artificial de WhatsApp, coletamos:",
      data_collection_items: [
        "**Dados Cadastrais**: Nome completo, e-mail corporativo, número de WhatsApp comercial, detalhes de cobrança via Stripe e credenciais de acesso.",
        "**Dados dos Clientes Finais**: Número de telefone, nome de exibição no WhatsApp e histórico de mensagens de texto/mídia trocadas com a IA.",
        "**Tokens de Integração**: Chaves criptografadas da API oficial do WhatsApp Cloud e conexões com CRMs ou bancos de dados parceiros."
      ],

      usage_title: "3. Uso das Informações",
      usage_body: "Utilizamos as informações coletadas estritamente para:",
      usage_items: [
        "Processar e responder mensagens automaticamente e em tempo real por meio de conexões seguras de inteligência artificial.",
        "Fornecer a caixa de entrada unificada para que atendentes humanos intervenham nos chats.",
        "Refinar o treinamento dos agentes de IA exclusivos da sua empresa (seus dados nunca são compartilhados ou usados para treinar IAs concorrentes).",
        "Gerenciar assinaturas, pagamentos e prevenir acessos não autorizados."
      ],

      retention_title: "4. Retenção de Dados e Segurança",
      retention_body: "Implementamos padrões de segurança corporativos para blindar seus dados:",
      retention_items: [
        "**Criptografia Completa**: Tráfego de dados protegido por canais HTTPS/SSL e armazenamento protegido por criptografia AES-256.",
        "**Retenção Controlada**: Históricos de conversa são mantidos por um limite de 180 dias, após o qual são limpos ou anonimizados, a menos que você configure um período diferente.",
        "**Isolamento Estrito**: Cada conta opera em um ambiente isolado logicamente (banco de dados multi-tenant) prevenindo vazamentos de informação."
      ],

      whatsapp_title: "5. API de WhatsApp e Parceiros",
      whatsapp_body: "Nossa operação segue fielmente as regras oficiais da API de WhatsApp Cloud (Meta). A Oye AI não comercializa dados com agências de publicidade. Compartilhamos dados operacionais exclusivamente com infraestruturas de tecnologia aprovadas (como OpenAI e Stripe) de acordo com regras estritas de sigilo.",

      contact_title: "6. Seus Direitos e Contato",
      contact_body: "Você tem direito total sobre seus dados e pode solicitar o download, correção ou exclusão definitiva da sua conta ou registros a qualquer momento. Em caso de dúvidas, envie um e-mail para **privacy@oye-ai.com** ou escreva diretamente na nossa página de [Contato](/contact)."
    }
  }
};

export default function PrivacyPage() {
  const { locale } = useTranslation();
  const currentLang = PRIVACY_DICT[locale] ? locale : 'en';
  const copy = PRIVACY_DICT[currentLang];

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

          {/* Section 1: Introduction */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.introduction_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.introduction_body}
            </p>
          </div>

          {/* Section 2: Data Collection */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.data_collection_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.data_collection_body}
            </p>
            <ul className="space-y-3 pl-4">
              {copy.sections.data_collection_items.map((item, idx) => (
                <li key={idx} className="text-gray-300 text-xs md:text-sm leading-relaxed flex items-start space-x-2.5">
                  <span className="text-[#00a884] mt-1 text-sm">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Usage */}
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
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 4: Security and Retention */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.retention_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.retention_body}
            </p>
            <ul className="space-y-3 pl-4">
              {copy.sections.retention_items.map((item, idx) => (
                <li key={idx} className="text-gray-300 text-xs md:text-sm leading-relaxed flex items-start space-x-2.5">
                  <span className="text-[#00a884] mt-1 text-sm">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Section 5: WhatsApp API Integration */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.whatsapp_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              {copy.sections.whatsapp_body}
            </p>
          </div>

          {/* Section 6: User Rights & Contact */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-wide border-l-4 border-[#00a884] pl-3.5">
              {copy.sections.contact_title}
            </h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed" 
               dangerouslySetInnerHTML={{ 
                 __html: copy.sections.contact_body
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
