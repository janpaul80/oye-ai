'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, DEFAULT_LOCALE, getDictionary, translate, Dictionary } from '@/lib/i18n';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
  dict: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dict, setDict] = useState<Dictionary>(getDictionary(initialLocale));

  // Sync state with cookie and trigger Next.js refresh
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setDict(getDictionary(newLocale));
    
    // Save to cookie so server components can read it
    document.cookie = `oye_lang=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Force a router refresh to re-render Server Components
    window.location.reload();
  };

  // Sync state initially on mount if client-side cookie differs
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )oye_lang=([^;]*)/);
    const cookieLocale = match ? (match[1] as Locale) : null;
    if (cookieLocale && cookieLocale !== locale) {
      setLocaleState(cookieLocale);
      setDict(getDictionary(cookieLocale));
    }
  }, [locale]);

  const t = (path: string) => {
    return translate(dict, path);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
