'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/components/LanguageContext';

export default function Footer() {
  const { locale } = useTranslation();

  const footerText = {
    es: {
      rights: 'Todos los derechos reservados.',
      terms: 'Términos de Servicio',
      privacy: 'Políticas de Privacidad',
      help: 'Centro de Ayuda / Contacto',
    },
    en: {
      rights: 'All rights reserved.',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      help: 'Help Center / Contact',
    },
    pt: {
      rights: 'Todos os direitos reservados.',
      terms: 'Termos de Serviço',
      privacy: 'Políticas de Privacidade',
      help: 'Central de Ajuda / Contato',
    },
  }[locale] || {
    rights: 'All rights reserved.',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    help: 'Help Center / Contact',
  };

  return (
    <footer className="w-full bg-[#0e0e11] border-t border-zinc-900 py-8 text-center sm:text-left mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-gray-500 text-xs">
        <p>© 2026 Oye AI. oye-ai.com. {footerText.rights}</p>
        <div className="flex space-x-6 mt-3 sm:mt-0 font-medium">
          <Link href="/terms" className="hover:text-gray-300 transition-colors">
            {footerText.terms}
          </Link>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">
            {footerText.privacy}
          </Link>
          <Link href="/contact" className="hover:text-gray-300 transition-colors">
            {footerText.help}
          </Link>
        </div>
      </div>
    </footer>
  );
}
