-- OYE AI: Voice AI Support Migration
-- Adds voice_ai fields for Pro-tier feature

BEGIN;

-- Add voice fields to organizations
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS voice_language TEXT DEFAULT 'es',
    ADD COLUMN IF NOT EXISTS voice_style TEXT DEFAULT 'neutral';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orgs_voice ON public.organizations(voice_enabled);

COMMIT;