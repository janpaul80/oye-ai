-- Oye AI: Slice 3 - Production Database Hardening Migration
-- Target: PostgreSQL / Supabase Cloud
-- Description: Adds tables for subscriptions (Stripe integration), audit logs, conversation events,
--              outbound delivery tracking (DLQ / retry queue), and alters message status check constraints.

BEGIN;

-- 1. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    plan_name TEXT NOT NULL CHECK (plan_name IN ('free', 'starter', 'pro', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Outbound Message Delivery Table (Retry / DLQ)
CREATE TABLE IF NOT EXISTS public.outbound_message_delivery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'sent', 'delivered', 'read', 'failed', 'retrying', 'dead_letter')),
    last_attempt_at TIMESTAMPTZ,
    error_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Conversation Events Table
CREATE TABLE IF NOT EXISTS public.conversation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'mode_change', 'agent_assignment', 'payment_created', 'payment_paid', 'sla_violation'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row-Level Security (RLS) on newly created tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_message_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_events ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Ensure full organization/membership-based tenant isolation)
CREATE POLICY subscription_org_policy ON public.subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = subscriptions.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY audit_log_org_policy ON public.audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = audit_logs.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY delivery_org_policy ON public.outbound_message_delivery
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = outbound_message_delivery.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY conversation_event_org_policy ON public.conversation_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = conversation_events.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 7. Update Messages status constraint to support expanded lifecycle
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_delivery_status_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_delivery_status_check 
    CHECK (delivery_status IN ('queued', 'processing', 'sent', 'delivered', 'read', 'failed', 'retrying'));

-- 8. Add useful index patterns for fast querying
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_msg ON public.outbound_message_delivery(message_id);
CREATE INDEX IF NOT EXISTS idx_delivery_org ON public.outbound_message_delivery(organization_id);
CREATE INDEX IF NOT EXISTS idx_conv_events_conv ON public.conversation_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_events_org ON public.conversation_events(organization_id);

COMMIT;
