-- Oye AI: Conversation Quality Schema Migration
-- Target: PostgreSQL / Supabase Cloud
-- Description: Adds AI summaries, sentiment analysis, lead scoring, and conversation insights.

BEGIN;

-- 1. Extend conversations with quality metrics
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS ai_summary TEXT,
    ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    ADD COLUMN IF NOT EXISTS customer_intent TEXT,
    ADD COLUMN IF NOT EXISTS interested_service TEXT,
    ADD COLUMN IF NOT EXISTS appointment_likelihood TEXT CHECK (appointment_likelihood IN ('high', 'medium', 'low', 'none')),
    ADD COLUMN IF NOT EXISTS suggested_reply TEXT,
    ADD COLUMN IF NOT EXISTS suggested_next_action TEXT,
    ADD COLUMN IF NOT EXISTS follow_up_recommendation TEXT,
    ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS analysis_version INTEGER DEFAULT 1;

-- 2. Conversation Quality Events
CREATE TABLE IF NOT EXISTS public.conversation_quality (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('summary', 'sentiment', 'lead_score', 'intent', 'full')),
    sentiment TEXT,
    lead_score INTEGER,
    customer_intent TEXT,
    interested_service TEXT,
    appointment_likelihood TEXT,
    suggested_reply TEXT,
    suggested_next_action TEXT,
    confidence NUMERIC,
    raw_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for quality analysis
CREATE INDEX IF NOT EXISTS idx_conv_quality_conv ON public.conversation_quality(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_quality_org ON public.conversation_quality(organization_id);
CREATE INDEX IF NOT EXISTS idx_conv_quality_type ON public.conversation_quality(analysis_type);
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment ON public.conversations(sentiment);
CREATE INDEX IF NOT EXISTS idx_conversations_score ON public.conversations(lead_score);
CREATE INDEX IF NOT EXISTS idx_conversations_likelihood ON public.conversations(appointment_likelihood);

-- 4. RLS
ALTER TABLE public.conversation_quality ENABLE ROW LEVEL SECURITY;

CREATE POLICY conv_quality_org_policy ON public.conversation_quality
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = conversation_quality.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

COMMIT;