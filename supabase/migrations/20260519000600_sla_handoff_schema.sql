-- Oye AI: Slice 4 - SLA Handoff, Priorities, and Conversation Notes Schema Migration
-- Target: PostgreSQL / Supabase Cloud
-- Description: Extends the conversations table with triage, priorities, ownership, and SLA deadline trackers.
--              Introduces a timeline ledger for operator conversation notes with appropriate RLS protections.

BEGIN;

-- 1. Extend Conversations table with SLA, priority and ownership status structures
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_operator_action_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS team_owner_id UUID; -- Support team-level ownership if needed in the future

-- 2. Modify check constraints if needed or expand status checks
-- Currently: status is CHECK (status IN ('open', 'snoozed', 'closed'))
-- Mode is CHECK (mode IN ('ai', 'manual', 'hybrid'))
-- We add columns to track transfer history and audit stamps inside conversation_events (which already exists).

-- 3. Create Timeline Notes Table (Operator Internal Comments Timeline)
CREATE TABLE IF NOT EXISTS public.conversation_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row-Level Security (RLS) on the newly created table
ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

-- 5. Tenant scoped security policy
CREATE POLICY notes_org_policy ON public.conversation_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = conversation_notes.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 6. Indices for high performance lookups
CREATE INDEX IF NOT EXISTS idx_conversations_sla ON public.conversations(sla_deadline) WHERE sla_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON public.conversations(priority_level);
CREATE INDEX IF NOT EXISTS idx_conv_notes_conversation ON public.conversation_notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_notes_org ON public.conversation_notes(organization_id);

COMMIT;
