import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates an authenticated Supabase client for Server Components, Actions, and API Route Handlers.
 * Awaits Next.js cookie stores asynchronously to parse auth tokens.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[Supabase Server] Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Running in degraded state.'
    );
  }

  return createServerClient(
    supabaseUrl || 'https://missing-supabase-url.supabase.co',
    supabaseAnonKey || 'missing-anon-key-placeholder-string',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored: Occurs if setAll is invoked inside a read-only Server Component.
            // Handled dynamically by middleware session refreshes.
          }
        },
      },
    }
  );
}

/**
 * Creates an elevated administrative Supabase client bypassing Row-Level Security (RLS).
 * WARNING: NEVER use this client-side or inside standard user-facing server queries.
 * Used exclusively for WhatsApp webhook ingestion and platform billing scripts.
 */
export async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn(
      '[Supabase Admin] Warning: SUPABASE_SERVICE_ROLE_KEY is missing. Inbound events will fail database writes.'
    );
  }

  // Returns server client utilizing service role key with empty cookie overrides
  return createServerClient(
    supabaseUrl || 'https://missing-supabase-url.supabase.co',
    serviceKey || 'missing-service-key-placeholder-string',
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
