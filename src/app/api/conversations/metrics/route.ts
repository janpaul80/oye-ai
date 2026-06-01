import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sentiment distribution
    const { data: sentimentData } = await admin
      .from('conversations')
      .select('sentiment')
      .eq('organization_id', orgId)
      .not('sentiment', 'is', null);

    const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
    sentimentData?.forEach((c: any) => {
      if (c.sentiment && sentimentCounts[c.sentiment as keyof typeof sentimentCounts] !== undefined) {
        sentimentCounts[c.sentiment as keyof typeof sentimentCounts]++;
      }
    });

    // Lead score distribution
    const { data: scoreData } = await admin
      .from('conversations')
      .select('lead_score')
      .eq('organization_id', orgId)
      .gte('lead_score', 0);

    const highIntent = scoreData?.filter((c: any) => c.lead_score >= 70).length || 0;
    const mediumIntent = scoreData?.filter((c: any) => c.lead_score >= 40 && c.lead_score < 70).length || 0;
    const lowIntent = scoreData?.filter((c: any) => c.lead_score < 40).length || 0;

    // Avg lead score
    const avgScore = scoreData?.length 
      ? Math.round(scoreData.reduce((sum: number, c: any) => sum + (c.lead_score || 0), 0) / scoreData.length)
      : 0;

    // Appointment likelihood
    const { data: likelihoodData } = await admin
      .from('conversations')
      .select('appointment_likelihood')
      .eq('organization_id', orgId)
      .not('appointment_likelihood', 'is', null);

    const highLikelihood = likelihoodData?.filter((c: any) => c.appointment_likelihood === 'high').length || 0;
    const mediumLikelihood = likelihoodData?.filter((c: any) => c.appointment_likelihood === 'medium').length || 0;
    const lowLikelihood = likelihoodData?.filter((c: any) => c.appointment_likelihood === 'low').length || 0;
    const conversionOps = likelihoodData?.filter((c: any) => c.appointment_likelihood === 'high').map((c: any) => c.conversation_id).length || 0;

    // Customer intents
    const { data: intentData } = await admin
      .from('conversations')
      .select('customer_intent')
      .eq('organization_id', orgId)
      .not('customer_intent', 'is', null);

    const intentCounts: Record<string, number> = {};
    intentData?.forEach((c: any) => {
      if (c.customer_intent) {
        intentCounts[c.customer_intent] = (intentCounts[c.customer_intent] || 0) + 1;
      }
    });

    // Recent analysis
    const { data: recentAnalysis } = await admin
      .from('conversations')
      .select('id, ai_summary, sentiment, lead_score, customer_intent, suggested_next_action, last_analysis_at')
      .eq('organization_id', orgId)
      .not('last_analysis_at', 'is', null)
      .order('last_analysis_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      metrics: {
        sentiment: sentimentCounts,
        lead_score: { high_intent: highIntent, medium_intent: mediumIntent, low_intent: lowIntent, average: avgScore },
        appointment_likelihood: { high: highLikelihood, medium: mediumLikelihood, low: lowLikelihood },
        conversion_opportunities: highLikelihood,
        customer_intents: intentCounts,
        recent_analysis: recentAnalysis || []
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}