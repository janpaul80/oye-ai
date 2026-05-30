-- Oye AI: Phase 5 - Dead-Letter Queue (DLQ) Durable Storage and Replay Ledger Schema Migration
-- Target: PostgreSQL / Supabase Cloud
-- Description: Creates the dead_letter_queue table to persist failed background jobs, enabling replay workflows with RLS protections.

BEGIN;

CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    queue_name TEXT NOT NULL,
    job_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replayed', 'ignored')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    replayed_at TIMESTAMPTZ,
    replayed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT
);

-- Enable Row-Level Security (RLS) on the newly created table
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Scoped security policy for organization-level isolation
CREATE POLICY dlq_org_policy ON public.dead_letter_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = dead_letter_queue.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- Indices for performance lookup
CREATE INDEX IF NOT EXISTS idx_dlq_org ON public.dead_letter_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_dlq_status ON public.dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_dlq_conv ON public.dead_letter_queue(conversation_id);

COMMIT;
