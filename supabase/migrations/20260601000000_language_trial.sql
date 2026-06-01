-- OYE AI: Language and Trial Support Migration
-- Adds language preference and free trial fields

BEGIN;

-- Add language and trial fields to organizations
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es' CHECK (language IN ('es', 'en', 'pt', 'fr')),
    ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trial_converted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS billing_plan TEXT DEFAULT 'trial' CHECK (billing_plan IN ('trial', 'basic', 'pro', 'business')),
    ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'active' CHECK (billing_status IN ('active', 'past_due', 'canceled', 'trialing'));

-- Add language to conversations for auto-detection
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es' CHECK (language IN ('es', 'en', 'pt', 'fr'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orgs_language ON public.organizations(language);
CREATE INDEX IF NOT EXISTS idx_orgs_trial ON public.organizations(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_orgs_billing_plan ON public.organizations(billing_plan);
CREATE INDEX IF NOT EXISTS idx_conversations_language ON public.conversations(language);

COMMIT;