'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/**
 * OYE AI - Premium Landing Page
 * Product-led design showcasing the AI employee for WhatsApp
 */

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/50' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-gray-950 font-bold text-sm">OYE</span>
            </div>
            <span className="text-xl font-semibold text-white">OYE AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#product" className="text-sm text-gray-400 hover:text-white transition-colors">Product</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="text-sm text-gray-400 hover:text-white transition-colors">About</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-white text-gray-950 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-white/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-green-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Now handling WhatsApp conversations 24/7
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[1.1] mb-8">
            Your AI employee
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
              for WhatsApp
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Never miss a customer again. OYE AI captures leads, qualifies prospects,
            and books appointments — on autopilot.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-gray-950 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all hover:scale-[1.02]"
            >
              Start Free Trial
            </Link>
            <a
              href="#product"
              className="px-8 py-4 border border-gray-700 text-white rounded-xl font-semibold text-lg hover:border-gray-500 transition-colors"
            >
              See It In Action
            </a>
          </div>
        </div>

        {/* Video/Product Showcase */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10" />
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full rounded-2xl border border-gray-800 shadow-2xl shadow-black/50"
          >
            <source src="/oye-ai-video.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}

function ProductShowcase() {
  const workflows = [
    {
      step: '01',
      title: 'Customer Message Arrives',
      description: 'A customer messages your business on WhatsApp asking about your services, pricing, or availability.',
      image: '/landing_real_screenshot.png',
    },
    {
      step: '02',
      title: 'AI Responds Instantly',
      description: 'OYE AI understands the question and provides a helpful, personalized response in seconds.',
      image: '/dashboard_real_screenshot.png',
    },
    {
      step: '03',
      title: 'Lead Gets Qualified',
      description: 'The AI qualifies the lead, gathers contact info, and scores their readiness to buy.',
      image: '/about_real_screenshot.png',
    },
    {
      step: '04',
      title: 'Appointment Booked',
      description: 'Customer books a time slot directly in WhatsApp. Calendar updates automatically.',
      image: '/login_real_screenshot.png',
    },
  ];

  return (
    <section id="product" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            One employee. Unlimited capacity.
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            OYE AI works around the clock handling your WhatsApp conversations
            the way your best employee would.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {workflows.map((item, index) => (
            <div
              key={item.step}
              className={`group relative bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all ${
                index % 2 === 1 ? 'lg:mt-16' : ''
              }`}
            >
              <div className="p-8">
                <span className="text-6xl font-bold text-white/10">{item.step}</span>
                <h3 className="text-2xl font-semibold text-white mt-4 mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
              <div className="border-t border-gray-800">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Connect WhatsApp',
      description: 'Link your business WhatsApp number in one click. No sim cards or extra phones needed.',
    },
    {
      number: '02',
      title: 'Train Your AI',
      description: 'Upload your FAQ, pricing, and services. OYE AI learns your business automatically.',
    },
    {
      number: '03',
      title: 'Go Live',
      description: 'Your AI employee starts handling conversations immediately. 24/7.',
    },
    {
      number: '04',
      title: 'Review in Inbox',
      description: 'Track all conversations, leads, and bookings in your business dashboard.',
    },
  ];

  return (
    <section id="how-it-works" className="py-32 px-6 bg-gray-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            From setup to live in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="relative p-8 bg-gray-900/50 rounded-2xl border border-gray-800">
              <span className="text-5xl font-bold text-white/5">{step.number}</span>
              <h3 className="text-xl font-semibold text-white mt-2 mb-3 relative z-10">{step.title}</h3>
              <p className="text-gray-400 relative z-10">{step.description}</p>
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
    <section id="pricing" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Simple pricing
          </h2>
          <p className="text-xl text-gray-400">
            7-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-8 rounded-2xl border ${
                plan.popular
                  ? 'bg-white text-gray-950 border-white'
                  : 'bg-gray-900/50 border-gray-800'
              }`}
            >
              {plan.popular && (
                <span className="inline-block px-3 py-1 bg-gray-950 text-white text-xs font-medium rounded-full mb-4">
                  Most Popular
                </span>
              )}
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <div className="mt-4 mb-2">
                <span className="text-5xl font-bold">{plan.price}</span>
                {plan.price !== 'Coming Soon' && (
                  <span className="text-gray-500">/month</span>
                )}
              </div>
              <p className={`text-sm mb-6 ${plan.popular ? 'text-gray-600' : 'text-gray-400'}`}>
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-center gap-2 text-sm ${
                      plan.popular ? 'text-gray-700' : 'text-gray-300'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${plan.popular ? 'text-gray-950' : 'text-green-500'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block w-full py-4 rounded-xl font-semibold text-center transition-colors ${
                  plan.popular
                    ? 'bg-gray-950 text-white hover:bg-gray-800'
                    : 'border border-gray-700 text-white hover:border-gray-500'
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
    <section id="about" className="py-32 px-6 bg-gray-900/30">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-12">
          <img
            src="/paul.png"
            alt="Paul Hartmann"
            className="w-32 h-32 rounded-2xl object-cover hidden sm:block"
          />
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Built by Paul Hartmann
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed mb-6">
              After years building AI systems for enterprise, I wanted something different —
              practical AI that small and medium businesses could actually use.
            </p>
            <p className="text-xl text-gray-300 leading-relaxed mb-6">
              Most AI products are too complex, too expensive, or require a team
              to manage. OYE AI is different. It's a single employee that handles
              your WhatsApp conversations — without supervision.
            </p>
            <p className="text-xl text-gray-300 leading-relaxed">
              I built OYE AI because I believe every business deserves an AI employee.
              Not a chatbot. Not a toy. A real team member.
            </p>
            <div className="mt-8">
              <p className="text-gray-500 text-sm">Paul Hartmann</p>
              <p className="text-gray-400">Founder, OYE AI</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-gray-950 font-bold text-sm">OYE</span>
            </div>
            <span className="text-lg font-semibold text-white">OYE AI</span>
          </div>
          <p className="text-sm text-gray-500">
            © 2024 OYE AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-400">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-400">
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
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <Hero />
      <ProductShowcase />
      <HowItWorks />
      <Pricing />
      <About />
      <Footer />
    </div>
  );
}