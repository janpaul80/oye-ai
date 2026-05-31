import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRateLimited } from '@/lib/services/rate-limiter';

export async function GET(request: NextRequest) {
  // 1. Rate Limiting Protection (Max 15 requests, 1 refill/sec)
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await isRateLimited(ip, 'health', 15, 1);

  if (limitResult.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Rate limit exceeded.' },
      { 
        status: 429, 
        headers: { 'Retry-After': limitResult.resetHeader.toString() } 
      }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isUrlConfigured = !!supabaseUrl && !supabaseUrl.includes('missing-supabase-url');
  
  let dbStatus = 'unconfigured';
  let dbLatencyMs: number | null = null;
  let errorMessage: string | null = null;

  if (isUrlConfigured) {
    try {
      const client = await createClient();
      const start = Date.now();
      
      // Execute a lightweight metadata query to verify direct database connectivity.
      // If table doesn't exist yet, we catch the PGRST (PostgREST) error but confirm connectivity.
      const { error, status } = await client.from('profiles').select('id').limit(1);
      
      // PostgREST errors like PGRST116 (No rows) or typical empty table returns indicate the DB is alive.
      // Network timeouts or bad authentication secrets (PGRST301) indicate degraded or unhealthy state.
      if (error && error.code !== 'PGRST116' && status !== 406) {
        dbStatus = 'degraded';
        errorMessage = `${error.code}: ${error.message}`;
      } else {
        dbStatus = 'healthy';
        dbLatencyMs = Date.now() - start;
      }
    } catch (e: any) {
      dbStatus = 'unhealthy';
      errorMessage = e.message || 'Unknown database connection error';
    }
  }

  const status = {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbStatus,
        latency_ms: dbLatencyMs,
        error: errorMessage,
      },
      redis: process.env.REDIS_URL ? 'configured' : 'missing',
      langdock: process.env.LANGDOCK_API_KEY ? 'configured' : 'missing',
      whatsapp: process.env.WHATSAPP_API_TOKEN ? 'configured' : 'missing',
      environment: process.env.NODE_ENV || 'development',
    },
    version: '0.1.0'
  };

  // Return a 200 OK so that application servers can boot in a degraded setup,
  // letting administrators see exact configuration statuses.
  return NextResponse.json(status, { status: 200 });
}
