import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET - exchangeCodeForSession
 * Exchange the callback code returned by Supabase Auth for a persistent session cookie,
 * then redirect the user to the requested dashboard page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('missing-supabase-url')) {
      try {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          return NextResponse.redirect(`${origin}${next}`);
        }
        console.error('[Auth Callback] Session exchange failed:', error.message);
      } catch (err) {
        console.error('[Auth Callback] Critical error during code exchange:', err);
      }
    } else {
      console.warn('[Auth Callback] Supabase url is missing. Proceeding with dummy redirect.');
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange fails, send user back to login with error parameter
  return NextResponse.redirect(`${origin}/login?error=auth-exchange-failed`);
}
