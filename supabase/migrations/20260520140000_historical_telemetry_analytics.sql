-- Phase 13: Historical Telemetry Analytics and Organization Health Schemas
-- Target: PostgreSQL / Supabase Cloud

BEGIN;

-- 1. Create Provider SLA History Table (For persistent aggregated hourly snapshots)
CREATE TABLE IF NOT EXISTS public.provider_sla_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- 'langdock', 'openai', 'anthropic', 'gemini'
    avg_latency_ms INTEGER NOT NULL DEFAULT 0,
    p50_latency_ms INTEGER NOT NULL DEFAULT 0,
    p95_latency_ms INTEGER NOT NULL DEFAULT 0,
    p99_latency_ms INTEGER NOT NULL DEFAULT 0,
    error_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    uptime_ratio NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    recorded_hour TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (Admin only)
ALTER TABLE public.provider_sla_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_history_admin_policy ON public.provider_sla_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_platform_admin = TRUE
        )
    );

CREATE INDEX IF NOT EXISTS idx_sla_history_recorded ON public.provider_sla_history(recorded_hour);
CREATE INDEX IF NOT EXISTS idx_sla_history_provider ON public.provider_sla_history(provider);

-- 2. Create Organization Health History Table (For tracking tenant metrics over time)
CREATE TABLE IF NOT EXISTS public.org_health_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    health_score INTEGER NOT NULL DEFAULT 100, -- computed 0-100 based on message loss, breaches, limits
    message_volume INTEGER NOT NULL DEFAULT 0,
    token_count INTEGER NOT NULL DEFAULT 0,
    billing_anomalies INTEGER NOT NULL DEFAULT 0,
    recorded_hour TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (Admin only)
ALTER TABLE public.org_health_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_health_history_admin_policy ON public.org_health_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_platform_admin = TRUE
        )
    );

CREATE INDEX IF NOT EXISTS idx_org_health_history_recorded ON public.org_health_history(recorded_hour);
CREATE INDEX IF NOT EXISTS idx_org_health_history_org ON public.org_health_history(organization_id);

COMMIT;
