'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/components/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CONTACT_DICT = {
  es: {
    hero: {
      badge: "✦ Hablemos hoy",
      title: "Conecta con nuestro",
      title_accent: "equipo de ingeniería",
      subtitle: "Pregúntanos sobre integraciones personalizadas, volumen a escala corporativa, o agenda una videollamada personalizada con Paul."
    },
    form: {
      name: "Nombre Completo",
      email: "Correo Electrónico",
      whatsapp: "Número de WhatsApp (con código de país)",
      company: "Giro de tu Negocio / Sector",
      message: "Mensaje / ¿Qué te gustaría automatizar?",
      submit: "Enviar Mensaje",
      sending: "Enviando...",
      select_placeholder: "Selecciona una opción",
      sectors: {
        retail: "Tienda / E-commerce",
        health: "Clínica / Salud",
        beauty: "Salón / Barbería",
        realestate: "Bienes Raíces / Inmobiliaria",
        agency: "Agencia de Servicios",
        other: "Otro Sector"
      },
      validation: {
        name: "Por favor ingresa tu nombre",
        email: "Por favor ingresa un correo válido",
        whatsapp: "Por favor ingresa tu número de WhatsApp",
        message: "Por favor escribe tu consulta"
      }
    },
    success: {
      title: "¡Mensaje recibido con éxito!",
      subtitle: "Nuestra IA 'Elena' acaba de procesar tu solicitud y te ha enviado un mensaje simulado de WhatsApp:",
      badge: "Elena • Oye AI virtual",
      typing: "Elena está escribiendo...",
      ai_message: "Hola. Gracias por escribir a Oye AI. Registré los detalles para el sector de **{sector}**.\n\nHe transferido tu solicitud a nuestro equipo de ingeniería. Paul Hartmann o uno de nuestros ingenieros se comunicará contigo a **{email}** o vía WhatsApp en menos de 2 horas.\n\n¿Te gustaría que te agende una llamada de demostración de 15 minutos en nuestro calendario operativo?",
      btn_reset: "Enviar otro mensaje"
    }
  },
  en: {
    hero: {
      badge: "✦ Get in touch",
      title: "Connect with our",
      title_accent: "engineering team",
      subtitle: "Ask about custom CRM integrations, enterprise high-volume operations, or schedule a hands-on live demo with Paul."
    },
    form: {
      name: "Full Name",
      email: "Email Address",
      whatsapp: "WhatsApp Number (with country code)",
      company: "Business Sector / Industry",
      message: "Message / What would you like to automate?",
      submit: "Send Message",
      sending: "Sending...",
      select_placeholder: "Select an option",
      sectors: {
        retail: "Shop / E-commerce",
        health: "Clinic / Healthcare",
        beauty: "Salon / Aesthetics",
        realestate: "Real Estate",
        agency: "Service Agency",
        other: "Other Sector"
      },
      validation: {
        name: "Please enter your name",
        email: "Please enter a valid email",
        whatsapp: "Please enter your WhatsApp number",
        message: "Please write your query"
      }
    },
    success: {
      title: "Message received successfully!",
      subtitle: "Our virtual employee 'Elena' just processed your details and simulated a live WhatsApp response:",
      badge: "Elena • Oye AI virtual",
      typing: "Elena is typing...",
      ai_message: "Hello. Thank you for contacting Oye AI. I have logged your request for the **{sector}** sector.\n\nI have routed your inquiry to our engineering team. Paul Hartmann or one of our systems engineers will follow up at **{email}** or via WhatsApp within 2 hours.\n\nWould you like me to book a 15-minute operational demonstration in our calendar?",
      btn_reset: "Send another message"
    }
  },
  pt: {
    hero: {
      badge: "✦ Fale conosco",
      title: "Conecte-se com nosso",
      title_accent: "time de engenharia",
      subtitle: "Tire dúvidas sobre integrações personalizadas, planos corporativos ou agende uma videoconferência com o Paul."
    },
    form: {
      name: "Nome Completo",
      email: "E-mail Corporativo",
      whatsapp: "Número de WhatsApp (com DDI)",
      company: "Setor de Atuação / Indústria",
      message: "Mensagem / O que você deseja automatizar?",
      submit: "Enviar Mensagem",
      sending: "Enviando...",
      select_placeholder: "Selecione uma opção",
      sectors: {
        retail: "Loja / E-commerce",
        health: "Clínica / Saúde",
        beauty: "Salão / Estética",
        realestate: "Imobiliária / Real Estate",
        agency: "Agência de Serviços",
        other: "Outro Setor"
      },
      validation: {
        name: "Por favor, digite seu nome",
        email: "Por favor, digite um e-mail válido",
        whatsapp: "Por favor, insira seu WhatsApp",
        message: "Por favor, escreva sua mensagem"
      }
    },
    success: {
      title: "Mensagem enviada com sucesso!",
      subtitle: "Nossa colaboradora virtual 'Elena' processou seu contato e gerou uma resposta instantânea em tempo real:",
      badge: "Elena • Oye AI virtual",
      typing: "Elena está digitando...",
      ai_message: "Olá. Obrigada por entrar em contato com a Oye AI. Registrei seu interesse no setor de **{sector}**.\n\nEncaminhei sua solicitação para nossa equipe de engenharia. Paul Hartmann ou um de nossos engenheiros responderá no e-mail **{email}** ou no WhatsApp em menos de 2 horas.\n\nGostaria que eu agendasse uma chamada operacional de 15 minutos em nosso calendário?",
      btn_reset: "Enviar outra mensagem"
    }
  }
};

export default function ContactPage() {
  const { locale } = useTranslation();
  const currentLang = CONTACT_DICT[locale] ? locale : 'en';
  const copy = CONTACT_DICT[currentLang];

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sector, setSector] = useState('');
  const [message, setMessage] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showAiMessage, setShowAiMessage] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple robust validation
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = copy.form.validation.name;
    if (!email.trim() || !email.includes('@')) nextErrors.email = copy.form.validation.email;
    if (!whatsapp.trim()) nextErrors.whatsapp = copy.form.validation.whatsapp;
    if (!message.trim()) nextErrors.message = copy.form.validation.message;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // Simulate high-fidelity server delay and database insertion
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setIsAiTyping(true);

      // Conversational delay to feel alive
      setTimeout(() => {
        setIsAiTyping(false);
        setShowAiMessage(true);
      }, 1600);
    }, 1200);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setWhatsapp('');
    setSector('');
    setMessage('');
    setIsSuccess(false);
    setShowAiMessage(false);
  };

  // Sector text helper for Success block
  const getSectorLabel = (slug: string) => {
    if (!slug) return locale === 'es' ? 'Tu Negocio' : 'Your Business';
    return copy.form.sectors[slug as keyof typeof copy.form.sectors] || slug;
  };

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

      {/* Content Form Region */}
      <section className="max-w-6xl mx-auto px-6 py-20 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        
        {/* Left Card: Core Values */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-[#121820]/60 border border-gray-800 rounded-2xl p-8 space-y-6">
            <h3 className="font-bold text-white text-xl border-l-4 border-[#00a884] pl-3">
              {locale === 'es' ? 'Infraestructura de Confianza' : locale === 'pt' ? 'Infraestrutura de Confiança' : 'Enterprise Trust'}
            </h3>
            
            <div className="flex items-start space-x-4">
              <span className="text-2xl shrink-0">⚡</span>
              <div>
                <h4 className="font-bold text-white text-sm">{locale === 'es' ? 'SLA del 99.9%' : locale === 'pt' ? 'Acordo de Nível de Serviço' : '99.9% Core SLA'}</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {locale === 'es' ? 'Rendimiento robusto respaldado por infraestructura escalable en la nube.' : locale === 'pt' ? 'Desempenho robusto garantido com resiliência na nuvem.' : 'Robust operations built on top of high-availability cloud setups.'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <span className="text-2xl shrink-0">🔒</span>
              <div>
                <h4 className="font-bold text-white text-sm">{locale === 'es' ? 'Cifrado SSL de Extremo a Extremo' : locale === 'pt' ? 'Criptografia Total' : 'SSL Secure Gateway'}</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {locale === 'es' ? 'Los datos de tu negocio y de tus clientes viajan 100% seguros y encriptados.' : locale === 'pt' ? 'Os dados e logs dos seus clientes são totalmente protegidos.' : 'Every communication audit trace and checkout link is encrypted.'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <span className="text-2xl shrink-0">💼</span>
              <div>
                <h4 className="font-bold text-white text-sm">{locale === 'es' ? 'Control Humano Absoluto' : locale === 'pt' ? 'Controle Total do Operador' : 'Absolute Human Fallback'}</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {locale === 'es' ? 'Intervén en cualquier conversación en tiempo real con un solo clic.' : locale === 'pt' ? 'Assuma conversas a qualquer momento com apenas um clique.' : 'Intervene on active flows instantly via the unified inbox console.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-[#121820] to-[#0e1116] border border-gray-800 rounded-2xl flex items-center space-x-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-850 border border-[#00a884] shrink-0">
              <img 
                src="/paul.png" 
                alt="Paul Hartmann" 
                className="w-full h-full object-cover object-top" 
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 italic">
                {locale === 'es' 
                  ? '"¿Quieres ver una integración especial con tu CRM? Escríbeme y lo diseñamos juntos."' 
                  : locale === 'pt' 
                    ? '"Deseja ver uma integração customizada? Entre em contato e resolvemos juntos."' 
                    : '"Need to explore specific database linkages? Write to us and let\'s construct it."'}
              </p>
              <h5 className="text-[11px] font-bold text-white mt-1.5">Paul Hartmann, Founder</h5>
            </div>
          </div>
        </div>

        {/* Right Card: Dynamic Interactive Form Container */}
        <div className="lg:col-span-7">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-8 space-y-6">
              
              {/* Full Name */}
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">{copy.form.name}</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`bg-[#121820] border rounded-lg px-4 py-3 text-sm placeholder-gray-600 focus:outline-none transition-all ${
                    errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-[#00a884]/70'
                  }`}
                />
                {errors.name && <span className="text-[10px] text-red-500 font-semibold">{errors.name}</span>}
              </div>

              {/* Grid block for Email and WhatsApp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">{copy.form.email}</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={`bg-[#121820] border rounded-lg px-4 py-3 text-sm placeholder-gray-600 focus:outline-none transition-all ${
                      errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-[#00a884]/70'
                    }`}
                  />
                  {errors.email && <span className="text-[10px] text-red-500 font-semibold">{errors.email}</span>}
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">{copy.form.whatsapp}</label>
                  <input 
                    type="text" 
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className={`bg-[#121820] border rounded-lg px-4 py-3 text-sm placeholder-gray-600 focus:outline-none transition-all ${
                      errors.whatsapp ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-[#00a884]/70'
                    }`}
                  />
                  {errors.whatsapp && <span className="text-[10px] text-red-500 font-semibold">{errors.whatsapp}</span>}
                </div>
              </div>

              {/* Sector Selector */}
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">{copy.form.company}</label>
                <select 
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="bg-[#121820] border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#00a884]/70 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- {copy.form.select_placeholder} --</option>
                  <option value="retail">{copy.form.sectors.retail}</option>
                  <option value="health">{copy.form.sectors.health}</option>
                  <option value="beauty">{copy.form.sectors.beauty}</option>
                  <option value="realestate">{copy.form.sectors.realestate}</option>
                  <option value="agency">{copy.form.sectors.agency}</option>
                  <option value="other">{copy.form.sectors.other}</option>
                </select>
              </div>

              {/* Message */}
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">{copy.form.message}</label>
                <textarea 
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className={`bg-[#121820] border rounded-lg px-4 py-3 text-sm placeholder-gray-600 focus:outline-none transition-all ${
                    errors.message ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-[#00a884]/70'
                  }`}
                />
                {errors.message && <span className="text-[10px] text-red-500 font-semibold">{errors.message}</span>}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-[#00a884] hover:bg-[#009675] text-white font-bold text-base transition-all disabled:opacity-50 hover:scale-[1.01] shadow-md cursor-pointer"
              >
                {isSubmitting ? copy.form.sending : copy.form.submit}
              </button>

            </form>
          ) : (
            /* High-fidelity Success block: Simulated WhatsApp reply */
            <div className="bg-gray-900 border-2 border-emerald-800/40 rounded-2xl p-8 space-y-6 animate-fade-in relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl" />
              
              <div className="flex items-center space-x-3.5 mb-2">
                <span className="w-9 h-9 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-lg">✅</span>
                <div>
                  <h3 className="font-extrabold text-white text-xl leading-tight">{copy.success.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{copy.success.subtitle}</p>
                </div>
              </div>

              {/* High-Fidelity WhatsApp Device Simulation */}
              <div className="w-full max-w-[450px] mx-auto rounded-xl overflow-hidden bg-[#111b21] shadow-2xl border border-gray-850 relative mt-4">
                {/* Chat header */}
                <div className="bg-[#202c33] px-4 py-2.5 flex items-center space-x-3 border-b border-gray-850">
                  <div className="relative">
                    <svg className="w-8 h-8 rounded-full bg-gray-700 text-gray-200 p-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00a884] border-2 border-[#111b21] absolute bottom-0 right-0" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white leading-none">{copy.success.badge}</h4>
                    <p className="text-[9px] text-[#00a884] font-semibold tracking-wider mt-0.5 uppercase">Online & Active</p>
                  </div>
                </div>

                {/* Chat body area */}
                <div className="p-4 bg-[#0b141a] min-h-[180px] flex flex-col justify-start items-start space-y-4">
                  {/* User sent message */}
                  <div className="self-end flex flex-col items-end max-w-[85%]">
                    <div className="rounded-xl rounded-tr-none px-3.5 py-2 text-xs bg-[#005c4b] text-white shadow-md">
                      {locale === 'es' ? 'Hola Oye AI, acabo de enviar mi formulario de contacto.' : 'Hello Oye AI, I just submitted my contact form.'}
                    </div>
                  </div>

                  {/* AI Typing state */}
                  {isAiTyping && (
                    <div className="self-start flex flex-col items-start max-w-[85%]">
                      <div className="bg-[#202c33] rounded-xl rounded-tl-none px-3.5 py-2.5 border border-gray-850 flex items-center space-x-1 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]/70 typing-dot" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]/70 typing-dot" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]/70 typing-dot" />
                      </div>
                      <span className="text-[8px] text-gray-500 mt-1 font-semibold">{copy.success.typing}</span>
                    </div>
                  )}

                  {/* AI Finished Message */}
                  {showAiMessage && (
                    <div className="self-start flex flex-col items-start max-w-[85%] animate-fade-in">
                      <div className="bg-[#202c33] text-gray-200 rounded-xl rounded-tl-none px-3.5 py-2.5 border border-gray-850 text-xs leading-relaxed whitespace-pre-line shadow-md">
                        {copy.success.ai_message
                          .replace('{sector}', getSectorLabel(sector))
                          .replace('{email}', email)}
                      </div>
                      <span className="text-[8px] text-gray-500 mt-1 font-mono">10:01 AM • Read ✓✓</span>
                    </div>
                  )}
                </div>
              </div>

              {showAiMessage && (
                <button
                  onClick={handleReset}
                  className="mt-6 w-full py-3.5 rounded-xl border border-gray-700 bg-gray-900 text-center font-bold text-xs text-white hover:bg-gray-800 transition-all cursor-pointer"
                >
                  {copy.success.btn_reset}
                </button>
              )}
            </div>
          )}
        </div>

      </section>

      <Footer />
    </div>
  );
}
