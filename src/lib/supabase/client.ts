import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in Client Components.
 * Incorporates a graceful fallback if environment variables are missing.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[Supabase Client] Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. App is running in degraded state.'
      );
    }
  }

  return createBrowserClient(
    supabaseUrl || 'https://missing-supabase-url.supabase.co',
    supabaseAnonKey || 'missing-anon-key-placeholder-string'
  );
}
