import { NextRequest, NextResponse } from 'next/server';
import { processOutboundRetries } from '@/lib/services/delivery-retry';
import { isRateLimited } from '@/lib/services/rate-limiter';

/**
 * POST / GET - Background Job for Outbound Message Retry & DLQ
 * Intended to be triggered by cron scheduling servers (e.g. Vercel Cron, server crontab).
 * Secured via a secret authorization key check.
 */
export async function POST(request: NextRequest) {
  // 1. Rate Limiting Protection (Max 10 requests, 1 refill/sec)
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limitResult = await isRateLimited(ip, 'job-retry', 10, 1);
  if (limitResult.limited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 2. Security Authorization Check
  const { searchParams } = new URL(request.url);
  const paramKey = searchParams.get('key');
  const headerKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  const actualKey = paramKey || headerKey;
  
  const cronSecret = process.env.CRON_SECRET || 'oye_ai_cron_secret_default_987';

  if (process.env.NODE_ENV === 'production' && actualKey !== cronSecret) {
    console.warn('[Job Retry] Unauthorized request attempt block.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await processOutboundRetries();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Job Retry] Critical execution error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Worker execution failed'
    }, { status: 500 });
  }
}

// Support GET triggers for simple webhook / cron services
export async function GET(request: NextRequest) {
  return POST(request);
}
