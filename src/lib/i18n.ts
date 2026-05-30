import es from '../locales/es.json';
import en from '../locales/en.json';
import pt from '../locales/pt.json';

export type Locale = 'es' | 'en' | 'pt';

export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALES: Locale[] = ['es', 'en', 'pt'];

const dictionaries = {
  es,
  en,
  pt,
};

// Safe lookup for nested keys (e.g., "landing.title")
export type Dictionary = typeof es;
export type DictionaryKey = keyof Dictionary;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}

/**
 * Resolves a nested key string from the dictionary.
 * Example: translate(dict, 'landing.title') -> "Oye AI | ..."
 */
export function translate(dict: Dictionary, path: string): string {
  const parts = path.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return path; // Fallback to printing the path if not found
    }
  }

  return typeof current === 'string' ? current : path;
}
