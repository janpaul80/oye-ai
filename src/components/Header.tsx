'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/components/LanguageContext';
import { Locale } from '@/lib/i18n';

export default function Header() {
  const { locale, setLocale } = useTranslation();
  const pathname = usePathname();

  // Helper to determine active states
  const isActive = (path: string) => pathname === path;

  // Localized navigation strings
  const navText = {
    es: {
      about: 'Nosotros',
      pricing: 'Precios',
      contact: 'Contacto',
      home: 'Inicio',
    },
    en: {
      about: 'About Us',
      pricing: 'Pricing',
      contact: 'Contact Us',
      home: 'Home',
    },
    pt: {
      about: 'Sobre Nós',
      pricing: 'Preços',
      contact: 'Contato',
      home: 'Início',
    },
  }[locale] || {
    about: 'About Us',
    pricing: 'Pricing',
    contact: 'Contact Us',
    home: 'Home',
  };

  return (
    <header className="w-full bg-[#0a0a0c]/80 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3.5 hover:opacity-90 transition-opacity">
          {/* Large brand logo styling to make a bold, premium brand statement */}
          <img 
            src="/logo.png" 
            alt="Oye AI Logo" 
            style={{ height: '160px', width: 'auto' }} 
            className="object-contain" 
          />
        </Link>

        <div className="flex items-center space-x-8">
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className={`text-sm font-semibold transition-all ${
                isActive('/') 
                  ? 'text-[#00a884]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {navText.home}
            </Link>

            <Link
              href="/about"
              className={`text-sm font-semibold transition-all ${
                isActive('/about') 
                  ? 'text-[#00a884]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {navText.about}
            </Link>

            <Link
              href="/pricing"
              className={`text-sm font-semibold transition-all ${
                isActive('/pricing') 
                  ? 'text-[#00a884]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {navText.pricing}
            </Link>

            <Link
              href="/contact"
              className={`text-sm font-semibold transition-all ${
                isActive('/contact') 
                  ? 'text-[#00a884]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {navText.contact}
            </Link>
          </nav>

          {/* Language Switcher */}
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            {(['es', 'en', 'pt'] as Locale[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  locale === lang
                    ? 'bg-gray-800 text-white shadow-sm border border-gray-700'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Premium Client Dashboard Link */}
          <Link
            href="/dashboard"
            className="px-4.5 py-2 rounded-lg text-sm font-semibold border border-gray-700 hover:border-gray-500 bg-gray-900 hover:bg-gray-800 text-white transition-all shadow-sm"
          >
            Dashboard ↗
          </Link>
        </div>
      </div>
    </header>
  );
}
