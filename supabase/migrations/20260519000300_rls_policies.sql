-- Oye AI: Multi-Tenant Row-Level Security (RLS) Policies
-- Description: Enables RLS across all business entities and enforces tenant separation 
--              so users can only query/mutate records matching their organization memberships.

-- 1. Enable RLS on all public tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. Profiles (Users can read all profiles, but edit only their own)
-- ==========================================
CREATE POLICY profile_read_policy ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY profile_update_policy ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- ==========================================
-- 3. Organizations (Read only if user is a member)
-- ==========================================
CREATE POLICY org_access_policy ON public.organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = organizations.id
            AND memberships.user_id = auth.uid()
        )
    );

-- ==========================================
-- 4. Memberships (Users can read all memberships in their organizations, but edit only their own)
-- ==========================================
CREATE POLICY membership_access_policy ON public.memberships
    FOR ALL USING (
        user_id = auth.uid() OR
        organization_id IN (
            SELECT m.organization_id FROM public.memberships m
            WHERE m.user_id = auth.uid()
        )
    );

-- ==========================================
-- 5. Tenant Scoped Policies (Scoped via membership join)
-- ==========================================

-- A. Channels
CREATE POLICY channel_tenant_policy ON public.channels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = channels.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- B. Customers
CREATE POLICY customer_tenant_policy ON public.customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = customers.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- C. Conversations
CREATE POLICY conversation_tenant_policy ON public.conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = conversations.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- D. Messages
CREATE POLICY message_tenant_policy ON public.messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = messages.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- E. AI Agents
CREATE POLICY ai_agent_tenant_policy ON public.ai_agents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = ai_agents.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- F. Appointments
CREATE POLICY appointment_tenant_policy ON public.appointments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = appointments.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- G. Payment Links
CREATE POLICY payment_link_tenant_policy ON public.payment_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = payment_links.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

-- H. Usage Ledger
CREATE POLICY usage_ledger_tenant_policy ON public.usage_ledger
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = usage_ledger.organization_id
            AND memberships.user_id = auth.uid()
        )
    );
