'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * OYE AI - Premium Landing Page
 * B2B SaaS aesthetic inspired by respond.io
 */

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
      scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#262626]' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-[#0a0a0a] font-bold text-sm">OYE</span>
            </div>
            <span className="text-xl font-semibold text-white">OYE AI</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#a3a3a3] hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-[#a3a3a3] hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-[#a3a3a3] hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="text-sm text-[#a3a3a3] hover:text-white transition-colors">About</a>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#a3a3a3] hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-white text-[#0a0a0a] rounded-lg font-medium text-sm hover:bg-[#f5f5f5] transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#171717]" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-white/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#22c55e]/[0.05] blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#171717] border border-[#262626] text-sm">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[#a3a3a3]">Now handling WhatsApp conversations 24/7</span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Customers ask on WhatsApp.
            <br />
            <span className="text-[#22c55e]">OYE AI answers.</span>
          </h1>
        </div>

        {/* Subheadline */}
        <div className="text-center mb-10">
          <p className="text-lg md:text-xl text-[#a3a3a3] max-w-2xl mx-auto leading-relaxed">
            Never miss another customer. Your AI employee captures leads, qualifies prospects,
            and books appointments — on autopilot, 24/7.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/signup"
            className="px-6 py-3 bg-white text-[#0a0a0a] rounded-lg font-semibold hover:bg-[#f5f5f5] transition-colors"
          >
            Start Free Trial
          </Link>
          <a
            href="#about"
            className="px-6 py-3 border border-[#404040] text-white rounded-lg font-semibold hover:border-[#525252] transition-colors"
          >
            Talk to Sales
          </a>
        </div>

        {/* Video Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-[#262626] bg-[#171717] shadow-2xl">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-[16/9] object-cover"
          >
            <source src="/oye-ai-video.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  const logos = ['Toyota', 'McDonald\'s', 'British Airways', 'Toyota', 'Roche', 'Hertz', 'Decathlon'];

  return (
    <section className="py-12 border-y border-[#262626] bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm text-[#737373] mb-8">
          Trusted by leading brands
        </p>
        <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap opacity-50">
          {logos.map((logo, i) => (
            <span key={i} className="text-lg md:text-xl font-semibold text-[#525252]">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const pillars = [
    {
      title: 'Capture',
      description: 'Every WhatsApp message becomes a potential customer. Never miss a lead again.',
      color: '#22c55e',
    },
    {
      title: 'Convert',
      description: 'AI-powered conversations that qualify leads and drive sales forward.',
      color: '#3b82f6',
    },
    {
      title: 'Retain',
      description: 'Automated follow-ups that keep customers engaged and coming back.',
      color: '#8b5cf6',
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            One platform. Complete control.
          </h2>
          <p className="text-lg text-[#a3a3a3] max-w-2xl mx-auto">
            From first message to loyal customer — automate your entire WhatsApp sales funnel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="p-8 rounded-2xl bg-[#171717] border border-[#262626]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: pillar.color + '/20' }}>
                <span className="text-2xl font-bold" style={{ color: pillar.color }}>{pillar.title[0]}</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{pillar.title}</h3>
              <p className="text-[#a3a3a3]">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductShowcase() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#171717]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Your AI employee for WhatsApp
            </h2>
            <p className="text-lg text-[#a3a3a3] mb-8">
              OYE AI works around the clock handling your WhatsApp conversations
              the way your best employee would — without breaks, vacation, or oversight.
            </p>
            <ul className="space-y-4">
              {[
                'Automatically responds to messages 24/7',
                'Qualifies leads and captures contact info',
                'Books appointments directly in WhatsApp',
                'Tracks all conversations in your inbox',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[#a3a3a3]">
                  <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Screenshot */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-l from-[#22c55e]/20 to-transparent rounded-2xl" />
            <img
              src="/dashboard_real_screenshot.png"
              alt="OYE AI Dashboard"
              className="rounded-2xl border border-[#262626] shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: '60%', label: 'Faster sales cycle' },
    { value: '81%', label: 'Conversion rate' },
    { value: '24/7', label: 'Always-on automation' },
    { value: '4.8/5', label: 'Customer rating' },
  ];

  return (
    <section className="py-16 bg-[#0a0a0a] border-y border-[#262626]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</p>
              <p className="text-sm text-[#737373]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: 'Basic',
      price: '$25',
      description: 'For small businesses getting started',
      features: [
        '1,000 messages/month',
        'AI responses',
        'Basic FAQ automation',
        'Email support',
      ],
      cta: 'Start Free Trial',
    },
    {
      name: 'Pro',
      price: '$49.99',
      description: 'For growing businesses',
      features: [
        'Unlimited messages',
        'Voice notes transcription',
        'Appointment booking',
        'Multilingual support',
        'Priority support',
        'Advanced analytics',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Business',
      price: 'Coming Soon',
      description: 'For enterprises',
      features: [
        'Everything in Pro',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      cta: 'Join Waitlist',
    },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[#a3a3a3]">
            7-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-8 rounded-2xl border ${
                plan.popular
                  ? 'bg-white text-[#0a0a0a] border-white'
                  : 'bg-[#171717] border-[#262626]'
              }`}
            >
              {plan.popular && (
                <span className="inline-block px-3 py-1 bg-[#0a0a0a] text-white text-xs font-medium rounded-full mb-4">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-4 mb-2">
                <span className="text-5xl font-bold">{plan.price}</span>
                {plan.price !== 'Coming Soon' && (
                  <span className="text-[#525252]">/month</span>
                )}
              </div>
              <p className={`text-sm mb-6 ${plan.popular ? 'text-[#525252]' : 'text-[#a3a3a3]'}`}>
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-center gap-2 text-sm ${
                      plan.popular ? 'text-[#0a0a0a]' : 'text-[#a3a3a3]'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${plan.popular ? 'text-[#0a0a0a]' : 'text-[#22c55e]'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block w-full py-4 rounded-xl font-semibold text-center transition-colors ${
                  plan.popular
                    ? 'bg-[#0a0a0a] text-white hover:bg-[#262626]'
                    : 'border border-[#404040] text-white hover:border-[#525252]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-[#171717]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-start gap-8">
          <img
            src="/paul.png"
            alt="Paul Hartmann"
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
          />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Built by Paul Hartmann
            </h2>
            <p className="text-lg text-[#a3a3a3] leading-relaxed mb-4">
              After years building AI systems for enterprise, I wanted something different —
              practical AI that small and medium businesses could actually use.
            </p>
            <p className="text-lg text-[#a3a3a3] leading-relaxed mb-4">
              Most AI products are too complex, too expensive, or require a team to manage.
              OYE AI is different. It's a single employee that handles your WhatsApp conversations —
              without supervision.
            </p>
            <p className="text-lg text-[#a3a3a3] leading-relaxed">
              I built OYE AI because I believe every business deserves an AI employee.
              Not a chatbot. Not a toy. A real team member.
            </p>
            <div className="mt-6">
              <p className="text-[#737373] text-sm">Paul Hartmann</p>
              <p className="text-[#a3a3a3] text-sm">Founder, OYE AI</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-[#262626] bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-[#0a0a0a] font-bold text-sm">OYE</span>
            </div>
            <span className="text-lg font-semibold text-white">OYE AI</span>
          </div>
          <p className="text-sm text-[#737373]">
            © 2024 OYE AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-sm text-[#737373] hover:text-[#a3a3a3]">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-[#737373] hover:text-[#a3a3a3]">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Nav />
      <Hero />
      <SocialProof />
      <Features />
      <ProductShowcase />
      <Stats />
      <Pricing />
      <About />
      <Footer />
    </div>
  );
}