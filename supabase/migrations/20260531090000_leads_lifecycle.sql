-- Oye AI: Leads Lifecycle Schema Migration
-- Target: PostgreSQL / Supabase Cloud
-- Description: Introduces leads with lifecycle stages, notes, and events for activity/history.

BEGIN;

-- 1. Leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    stage TEXT NOT NULL DEFAULT 'new' CHECK (
        stage IN (
            'new',
            'contacted',
            'qualified',
            'appointment_scheduled',
            'customer',
            'closed_won',
            'closed_lost'
        )
    ),
    source TEXT,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closed_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Lead Notes (internal)
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Lead Events (activity/history)
CREATE TABLE IF NOT EXISTS public.lead_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_conv ON public.leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON public.lead_events(lead_id);

-- 5. RLS enablement
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- 6. Tenant-scoped RLS policies
CREATE POLICY leads_org_policy ON public.leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = leads.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY lead_notes_org_policy ON public.lead_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = lead_notes.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY lead_events_org_policy ON public.lead_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = lead_events.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

COMMIT;
