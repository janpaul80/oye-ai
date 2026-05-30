-- Phase 11: Controlled Production Beta Schema, Telemetry, and Role Additions

-- 1. 'pending_approval' is now natively part of organization_status enum defined in 20260519000800_onboarding_schema.sql
-- We no longer need to alter the type inside a transaction block here.

-- 2. Alter status column default on organizations table
ALTER TABLE public.organizations ALTER COLUMN status SET DEFAULT 'pending_approval'::organization_status;

-- 3. Add platform administrator role capability to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure Hartmann Oye seed profile is elevated to platform administrator status
UPDATE public.profiles 
SET is_platform_admin = TRUE 
WHERE id = '99999999-9999-9999-9999-999999999999';

-- 4. Update the default new user provisioning trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    org_name TEXT;
    org_slug TEXT;
    user_name TEXT;
BEGIN
    -- Extract full name from metadata, or fallback to email username prefix
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
    
    -- A. Provision public.profiles
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    -- B. Generate default Organization Workspace Name and Slug
    org_name := user_name || ' Workspace';
    org_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
    
    -- De-duplicate slug if workspace conflict exists
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) THEN
        org_slug := org_slug || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
    END IF;

    -- C. Provision default public.organizations in pending_approval status (manual beta registration flow)
    INSERT INTO public.organizations (name, slug, status, settings)
    VALUES (org_name, org_slug, 'pending_approval'::organization_status, '{}'::jsonb)
    RETURNING id INTO new_org_id;

    -- D. Provision public.memberships (Assign new user as owner)
    INSERT INTO public.memberships (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Operational Telemetry Table (SLA, AI failovers, Latency Tracking)
CREATE TABLE IF NOT EXISTS public.operational_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    message_latency_ms INTEGER, -- elapsed duration from reception to final DB sync/background enqueuing
    provider_latency_ms INTEGER, -- Meta API roundtrip request-to-response duration
    delivery_latency_ms INTEGER, -- Duration from worker enqueuing to final Meta read/delivered callback
    ai_failover_event BOOLEAN NOT NULL DEFAULT FALSE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    error_message TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.operational_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY op_telemetry_org_policy ON public.operational_telemetry
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = operational_telemetry.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_op_telemetry_org ON public.operational_telemetry(organization_id);
CREATE INDEX IF NOT EXISTS idx_op_telemetry_created ON public.operational_telemetry(created_at);

-- 6. Reliability Scores Table (Tenant Operational Statistics)
CREATE TABLE IF NOT EXISTS public.reliability_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    uptime_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    message_loss_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    sla_breaches INTEGER NOT NULL DEFAULT 0,
    webhook_failures INTEGER NOT NULL DEFAULT 0,
    rate_limit_events INTEGER NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reliability_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY rel_scores_org_policy ON public.reliability_scores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = reliability_scores.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_rel_scores_org ON public.reliability_scores(organization_id);
