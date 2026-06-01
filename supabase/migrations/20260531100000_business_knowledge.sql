-- Oye AI: Business Knowledge Base Schema Migration
-- Target: PostgreSQL / Supabase Cloud
-- Description: Adds tables for business information, services, pricing, FAQ, and policies.

BEGIN;

-- 1. Business Info (organization profile)
CREATE TABLE IF NOT EXISTS public.business_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    business_name TEXT,
    description TEXT,
    tagline TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    timezone TEXT DEFAULT 'America/Guayaquil',
    working_hours JSONB NOT NULL DEFAULT '{"monday": {"open": "09:00", "close": "18:00"}, "tuesday": {"open": "09:00", "close": "18:00"}, "wednesday": {"open": "09:00", "close": "18:00"}, "thursday": {"open": "09:00", "close": "18:00"}, "friday": {"open": "09:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "13:00"}, "sunday": {"open": null, "close": null}}'::jsonb,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Services Catalog
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC,
    currency TEXT DEFAULT 'USD',
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pricing Packages
CREATE TABLE IF NOT EXISTS public.pricing_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FAQ Knowledge Base
CREATE TABLE IF NOT EXISTS public.faq_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Business Policies
CREATE TABLE IF NOT EXISTS public.business_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    policy_type TEXT NOT NULL CHECK (policy_type IN ('refund', 'cancellation', 'privacy', 'terms', 'shipping', 'other')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_business_info_org ON public.business_info(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_org ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_pricing_org ON public.pricing_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_faq_org ON public.faq_knowledge(organization_id);
CREATE INDEX IF NOT EXISTS idx_faq_category ON public.faq_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_policies_org ON public.business_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_policies_type ON public.business_policies(policy_type);

-- 7. RLS enablement
ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_policies ENABLE ROW LEVEL SECURITY;

-- 8. Tenant-scoped policies
CREATE POLICY business_info_org_policy ON public.business_info
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = business_info.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY services_org_policy ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = services.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY pricing_org_policy ON public.pricing_packages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = pricing_packages.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY faq_org_policy ON public.faq_knowledge
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = faq_knowledge.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

CREATE POLICY policies_org_policy ON public.business_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.organization_id = business_policies.organization_id
            AND memberships.user_id = auth.uid()
        )
    );

COMMIT;