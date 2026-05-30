import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { hasSandboxSession } from './lib/auth/sandbox';


/**
 * Next.js App Router proxy (formerly middleware) to validate user authentication states,
 * refresh expired Supabase JWT session tokens, and protect dashboard routes.
 */
export async function proxy(request: NextRequest) {
  // 1. Trace ID generation and propagation
  const traceId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-trace-id', traceId);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Inject Trace ID into Response headers
  response.headers.set('x-trace-id', traceId);

  // 2. Production Security Hardening Headers & Content-Security-Policy (CSP)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.supabase.co;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sandbox Bypass Gatekeeper: Allow verified sandbox sessions in non-production environments
  if (hasSandboxSession(request.cookies)) {
    return response;
  }

  // Graceful Fallback: If credentials are not yet set up,
  // let routing proceed unblocked with console warnings.
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('missing-supabase-url')) {
    return response;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            
            // Recreate response to propagate cookie shifts
            const newResponse = NextResponse.next({
              request,
            });
            
            // Re-apply trace & security headers to the new response
            newResponse.headers.set('x-trace-id', traceId);
            newResponse.headers.set('Content-Security-Policy', cspHeader);
            newResponse.headers.set('X-Frame-Options', 'DENY');
            newResponse.headers.set('X-Content-Type-Options', 'nosniff');
            newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
            newResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

            cookiesToSet.forEach(({ name, value, options }) =>
              newResponse.cookies.set(name, value, options)
            );
            
            response = newResponse;
          },
        },
      }
    );

    // Retrieve active logged-in user profile.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // Protect Dashboard Routes: Send unauthenticated users back to login
    if (path.startsWith('/dashboard')) {
      if (!user) {
        const loginRedirect = request.nextUrl.clone();
        loginRedirect.pathname = '/login';
        return NextResponse.redirect(loginRedirect);
      }
    }
  } catch (error) {
    console.error('[Proxy] Auth token evaluation error:', error);
  }

  return response;
}

export const config = {
  // Match all request paths except static files, Next internals, and common image formats
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
