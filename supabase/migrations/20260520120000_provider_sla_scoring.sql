-- Phase 12: Billing Separation and Provider SLA Telemetry Schema Migration
-- Target: PostgreSQL / Supabase Cloud

BEGIN;

-- 1. Alter check constraint on subscriptions table status column to include 'beta' and 'suspended'
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'suspended', 'beta'));

-- 2. Create Provider SLA Logs Table (For raw telemetry tracking)
CREATE TABLE IF NOT EXISTS public.provider_sla_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    provider TEXT NOT NULL, -- 'langdock', 'openai', 'anthropic', 'gemini'
    model TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(10,5) NOT NULL DEFAULT 0.00000,
    trace_id TEXT,
    timeout_occurred BOOLEAN NOT NULL DEFAULT FALSE,
    failover_engaged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (Admin only)
ALTER TABLE public.provider_sla_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_logs_admin_policy ON public.provider_sla_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_platform_admin = TRUE
        )
    );

CREATE INDEX IF NOT EXISTS idx_sla_logs_created ON public.provider_sla_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sla_logs_provider ON public.provider_sla_logs(provider);

-- 3. Create Provider Reliability Scores Table (For cached aggregation UI display)
CREATE TABLE IF NOT EXISTS public.provider_reliability_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT UNIQUE NOT NULL, -- 'langdock', 'openai', 'anthropic', 'gemini'
    avg_latency_ms INTEGER NOT NULL DEFAULT 0,
    p50_latency_ms INTEGER NOT NULL DEFAULT 0,
    p95_latency_ms INTEGER NOT NULL DEFAULT 0,
    p99_latency_ms INTEGER NOT NULL DEFAULT 0,
    error_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    timeout_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    failover_count INTEGER NOT NULL DEFAULT 0,
    uptime_ratio NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (Admin only)
ALTER TABLE public.provider_reliability_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY rel_scores_admin_policy ON public.provider_reliability_scores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_platform_admin = TRUE
        )
    );

-- Pre-seed cache scores for clean dashboard boot
INSERT INTO public.provider_reliability_scores (provider, avg_latency_ms, p50_latency_ms, p95_latency_ms, p99_latency_ms, error_rate, timeout_rate, failover_count, uptime_ratio)
VALUES 
    ('langdock', 420, 400, 510, 680, 0.00, 0.00, 0, 100.00),
    ('openai', 580, 550, 720, 890, 0.00, 0.00, 0, 100.00),
    ('anthropic', 850, 810, 990, 1200, 0.00, 0.00, 0, 100.00),
    ('gemini', 390, 370, 480, 590, 0.00, 0.00, 0, 100.00)
ON CONFLICT (provider) DO NOTHING;

COMMIT;
