'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/components/LanguageContext';
import { Locale } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ABOUT_DICT = {
  es: {
    hero: {
      badge: "✦ Conoce al Fundador",
      title: "Construyendo la infraestructura operativa para el",
      title_accent: "comercio del futuro",
      subtitle: "La visión de un ingeniero de sistemas para dotar a las empresas de una fuerza laboral operativa autónoma y resiliente en WhatsApp."
    },
    story: {
      title: "El Origen de Oye AI",
      para1: "Como ingeniero de software y constructor de sistemas, siempre he estado obsesionado con la resiliencia y la automatización de la infraestructura. Oye AI no nació en una sala de juntas corporativa, sino de observar una realidad frustrante en el comercio diario: miles de negocios y medianas empresas pierden clientes valiosos cada día simplemente porque no hay un humano disponible para responder un mensaje de WhatsApp a los pocos minutos.",
      para2: "Hoy en día, la operación comercial vive en WhatsApp. Los clientes escriben a cualquier hora, esperando respuestas instantáneas. Los equipos se ven rápidamente abrumados por consultas repetitivas de soporte y ventas. Como consecuencia, las oportunidades de negocio se evaporan, la atención al cliente se fragmenta y los dueños de negocios terminan atados a sus pantallas de chat, exhaustos pero sin poder despegarse de la operación manual.",
      para3: "Diseñé Oye AI no como otro chatbot genérico ni una interfaz CRM común, sino como una capa de fuerza laboral operativa autónoma. Mi visión es crear empleados digitales de confianza que manejen con precisión los flujos operativos de WhatsApp (agendar citas, enviar cotizaciones, recibir pagos con Stripe) y que sepan exactamente cuándo transferir el control a un operador humano de forma limpia y sin fricciones."
    },
    philosophy: {
      title: "Nuestra Filosofía",
      quote: "\"La Inteligencia Artificial no está aquí para reemplazar a los humanos; está aquí para remover la presión operativa y repetitiva, permitiendo que los negocios operen con absoluta tranquilidad y resiliencia.\"",
      author: "— Paul Hartmann, Fundador de Oye AI"
    },
    founder: {
      title: "Sobre el Fundador",
      desc1: "Paul Hartmann es un ingeniero de software, diseñador de sistemas y constructor de infraestructura enfocado en automatización de flujos operativos y runtimes resilientes para empresas modernas.",
      desc2: "Originario de Europa y con trayectoria internacional trabajando entre Europa y América Latina, Paul reside actualmente en Ecuador. A lo largo de los años, ha centrado su carrera en crear plataformas de alto rendimiento que eliminan la fricción operativa y convierten la comunicación desorganizada en sistemas estables y predecibles.",
      desc3: "Su experiencia técnica abarca el desarrollo de múltiples productos orientados a la automatización de infraestructura, ruteo inteligente de colas conversacionales y pasarelas de pago seguras. En Oye AI, su obsesión diaria no es vender 'hype' tecnológico ni promesas de ciencia ficción, sino ofrecer calidad de ingeniería, estabilidad a toda prueba y sistemas confiables que las empresas del mundo real puedan utilizar como si fuesen empleados entrenados.",
      vision_title: "La Visión a Largo Plazo",
      vision_desc: "Oye AI existe para dotar a los negocios de verdaderos empleados de IA autónomos que operen en WhatsApp con el nivel de profesionalismo, control e integración de un equipo operativo experto: contestar consultas complejas, calificar clientes potenciales, coordinar agendas sincronizadas, gestionar cobros con Stripe, y transferir el control con gracia a un operador humano en el momento exacto en que sea requerido."
    },
    cta: {
      title: "¿Listo para automatizar tus operaciones?",
      subtitle: "Únete a los negocios que confían en Oye AI para escalar sus ventas y soporte 24/7 sin estrés.",
      btn_demo: "Preview Sandbox",
      btn_home: "Volver al Inicio"
    }
  },
  en: {
    hero: {
      badge: "✦ Meet the Founder",
      title: "Building the operational infrastructure for the",
      title_accent: "future of commerce",
      subtitle: "A systems engineer's vision to empower businesses with a resilient, autonomous operational workforce layer on WhatsApp."
    },
    story: {
      title: "The Genesis of Oye AI",
      para1: "As a software engineer and infrastructure builder, I have always been obsessed with operational resilience and automation. Oye AI wasn't born out of corporate buzzwords, but from watching a painful everyday reality: thousands of businesses lose sales and support opportunities daily simply because a human isn't there to reply to a WhatsApp message within minutes.",
      para2: "Modern commerce lives inside WhatsApp. Customers message at all hours of the day and night expecting immediate answers. When businesses rely solely on manual teams, they quickly get overwhelmed. Customer inquiries get buried, leads grow cold, and founders and staff become slaves to notification screens just to keep basic operations afloat.",
      para3: "I built Oye AI not to be another generic chatbot or wrapper, but to serve as a reliable, autonomous operational workforce layer. Our mission is to deploy trained digital employees that execute WhatsApp workflows—like booking calendars and collecting Stripe checkouts—with absolute precision, knowing exactly when to hand off complex tasks to human operators."
    },
    philosophy: {
      title: "Our Philosophy",
      quote: "\"Artificial Intelligence shouldn't replace humans; it should remove the repetitive operational pressure that prevents them from doing their best work, letting businesses scale with resilience.\"",
      author: "— Paul Hartmann, Founder of Oye AI"
    },
    founder: {
      title: "About the Founder",
      desc1: "Paul Hartmann is a software engineer, systems builder, and AI infrastructure founder focused on building robust, autonomous operational runtimes for modern businesses.",
      desc2: "Originally from Europe and working internationally across Europe and Latin America, Paul now resides in Ecuador. He has spent years building platforms, queue engines, and highly scalable cloud architectures designed to minimize operational friction and establish resilient automation.",
      desc3: "His work centers on deep-tech applications including conversational CRM workflows, automated ledger systems, and resilient messaging backends. At Oye AI, his driving obsession is building premium, dependable infrastructure that real businesses can trust — avoiding startup hype in favor of clean engineering, ironclad reliability, and stable software engineering.",
      vision_title: "The Vision",
      vision_desc: "Oye AI was never meant to be just another chatbot. Paul's vision is to create genuine autonomous AI employees that live inside WhatsApp and operate with the capability of a real, professional team member: managing custom queues, qualifying leads, booking calendar events, generating Stripe checkouts, and gracefully escalating to humans whenever high-touch care is required."
    },
    cta: {
      title: "Ready to scale your business operations?",
      subtitle: "Join the businesses using Oye AI to handle customer conversations, bookings, and payments 24/7.",
      btn_demo: "Preview Sandbox",
      btn_home: "Back to Home"
    }
  },
  pt: {
    hero: {
      badge: "✦ Conheça o Fundador",
      title: "Construindo a infraestrutura operacional para o",
      title_accent: "comércio de amanhã",
      subtitle: "A visão de um engenheiro de sistemas para capacitar empresas com uma força de trabalho operacional autónoma e resiliente no WhatsApp."
    },
    story: {
      title: "A Origem do Oye AI",
      para1: "Como engenheiro de software e construtor de sistemas, sempre fui obcecado por resiliência e automação de infraestrutura. O Oye AI não nasceu de jargões corporativos, mas ao observar uma realidade frustrante: milhares de empresas perdem clientes todos os dias simplesmente porque não conseguem responder a uma mensagem de WhatsApp em poucos minutos.",
      para2: "Atualmente, o comércio vive no WhatsApp. Os clientes enviam mensagens a qualquer hora e esperam respostas imediatas. As equipes de atendimento ficam rapidamente sobrecarregadas por tarefas repetitivas. Com isso, as vendas esfriam, o suporte se fragmenta e os donos de negócios tornam-se reféns das telas de chat para manter o negócio funcionando.",
      para3: "Desenvolvi o Oye AI não como mais um chatbot genérico, mas como uma camada de força de trabalho operacional autónoma. Minha visão é criar colaboradores digitais de confiança que realizam fluxos operacionais completos no WhatsApp (como agendamentos e cobranças Stripe), sabendo o momento exato de passar o controle para um operador humano de forma transparente."
    },
    philosophy: {
      title: "Nossa Filosofia",
      quote: "\"A Inteligência Artificial não serve para substituir as pessoas; serve para eliminar a pressão operacional repetitiva, permitindo que as empresas cresçam com inteligência, resiliência e tranquilidade.\"",
      author: "— Paul Hartmann, Fundador do Oye AI"
    },
    founder: {
      title: "Sobre o Fundador",
      desc1: "Paul Hartmann é engenheiro de software, criador de produtos e construtor de infraestrutura de sistemas focado em criar runtimes operacionais autônomos para empresas modernas.",
      desc2: "Originário da Europa e atuando internacionalmente no eixo Europa-América Latina, Paul reside atualmente no Equador. Ao longo dos anos, dedicou sua carreira a projetar plataformas de alto desempenho que removem a fricção das operações diárias, tornando fluxos caóticos em processos altamente estáveis.",
      desc3: "Seu histórico profissional inclui a concepção de múltiplos sistemas de automação distribuída, gerenciamento de filas e integrações complexas. No Oye AI, seu compromisso diário não é vender promessas futuristas vazias, mas oferecer qualidade de engenharia, solidez operacional e uma experiência elegante e estável que ajude empresas reais a crescer.",
      vision_title: "A Visão",
      vision_desc: "O Oye AI não foi concebido como mais um chatbot genérico. A visão de Paul é equipar negócios com verdadeiros colaboradores de IA autônomos operando dentro do WhatsApp com o mesmo profissionalismo de um assistente operacional humano: respondendo dúvidas complexas, qualificando contatos, agendando reuniões sincronizadas, processando pagamentos via Stripe e transferindo o atendimento para operadores humanos no momento ideal."
    },
    cta: {
      title: "Pronto para automatizar suas operações?",
      subtitle: "Junte-se às empresas que confiam no Oye AI para escalar vendas e suporte 24/7 sem estresse.",
      btn_demo: "Preview Sandbox",
      btn_home: "Voltar ao Início"
    }
  }
};

export default function AboutPage() {
  const { locale, setLocale } = useTranslation();
  const currentLang = ABOUT_DICT[locale] ? locale : 'en';
  const copy = ABOUT_DICT[currentLang];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-200 font-sans antialiased overflow-x-hidden">
      
      <Header />

      {/* Editorial Hero Section */}
      <section className="relative py-24 md:py-36 border-b border-zinc-900 bg-gradient-to-b from-[#0a0a0c] to-[#0e0e11]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,168,132,0.03),transparent_50%)]" />
        <div className="max-w-4xl mx-auto px-6 relative text-center">
          
          <div className="inline-flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800/60 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" />
            <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
              {copy.hero.badge}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12] mb-6">
            {copy.hero.title}{' '}
            <span className="text-[#00a884] block sm:inline">{copy.hero.title_accent}</span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl font-normal leading-relaxed max-w-2xl mx-auto">
            {copy.hero.subtitle}
          </p>

        </div>
      </section>

      {/* Editorial Content Section */}
      <section className="max-w-5xl mx-auto px-6 py-24 md:py-32 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        
        {/* Left Narrative: The Origin */}
        <div className="lg:col-span-6 space-y-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight border-l-2 border-[#00a884] pl-4">
            {copy.story.title}
          </h2>
          
          <p className="text-zinc-400 leading-relaxed font-normal text-[15px] md:text-base">
            {copy.story.para1}
          </p>
          
          <p className="text-zinc-400 leading-relaxed font-normal text-[15px] md:text-base">
            {copy.story.para2}
          </p>

          <p className="text-zinc-400 leading-relaxed font-normal text-[15px] md:text-base">
            {copy.story.para3}
          </p>

          {/* Editorial Philosophy Quote */}
          <div className="bg-[#121215] border border-zinc-900 rounded-xl p-8 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.02] rounded-full blur-2xl" />
            <p className="text-white italic leading-relaxed text-sm md:text-[15px]">
              {copy.philosophy.quote}
            </p>
            <p className="text-[#00a884] text-xs font-semibold uppercase tracking-wider">
              {copy.philosophy.author}
            </p>
          </div>
        </div>

        {/* Right Narrative: The Founder & Vision */}
        <div className="lg:col-span-6 space-y-12">
          
          {/* Founder Bio Card */}
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {copy.founder.title}
            </h2>
            
            {/* Founder Avatar Simulation Panel */}
            <div className="flex items-center space-x-4 bg-[#121215] border border-zinc-900 p-4 rounded-xl">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
                <img 
                  src="/paul.png" 
                  alt="Paul Hartmann Avatar" 
                  className="w-full h-full object-cover object-top filter grayscale contrast-125 hover:grayscale-0 transition-all duration-300" 
                />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Paul Hartmann</h4>
                <p className="text-zinc-400 text-xs font-normal">Founder & Chief Infrastructure Architect, Oye AI</p>
              </div>
              <div className="ml-auto bg-zinc-900 border border-zinc-800 rounded-full px-3 py-0.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                Ecuador
              </div>
            </div>

            <p className="text-zinc-400 leading-relaxed font-normal text-[15px] md:text-base">
              {copy.founder.desc1}
            </p>

            <p className="text-zinc-400 leading-relaxed font-normal text-[15px] md:text-base">
              {copy.founder.desc2}
            </p>

            <p className="text-zinc-400 leading-relaxed font-normal text-[15px] md:text-base">
              {copy.founder.desc3}
            </p>
          </div>

          <hr className="border-zinc-900" />

          {/* The Vision Block */}
          <div className="space-y-4">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
              {copy.founder.vision_title}
            </h3>
            <p className="text-zinc-400 leading-relaxed font-normal text-[15px] md:text-base">
              {copy.founder.vision_desc}
            </p>
          </div>

        </div>

      </section>

      {/* Editorial Premium CTA Banner */}
      <section className="bg-gradient-to-t from-[#0a0a0c] to-[#0e0e11] border-t border-zinc-900 py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_center,rgba(0,168,132,0.02),transparent_40%)]" />
        <div className="max-w-3xl mx-auto px-6 relative space-y-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {copy.cta.title}
          </h2>
          <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto font-normal">
            {copy.cta.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-lg font-bold text-sm shadow-sm transition-all"
            >
              {copy.cta.btn_demo}
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white rounded-lg font-bold text-sm transition-all"
            >
              {copy.cta.btn_home}
            </Link>
          </div>
        </div>
      </section>

      <Footer />

    </div>
  );
}
