-- Phase 9: Production Beta Onboarding Schema Additions

-- 1. Add Onboarding & Lifecycle Status to organizations
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_status') THEN 
    CREATE TYPE organization_status AS ENUM (
      'draft',
      'onboarding',
      'pending_approval',
      'pending_verification',
      'beta_approved',
      'active',
      'suspended',
      'archived'
    );
  END IF;
END $$;

-- Drop existing check constraint and default value for status column dynamically
DO $$
DECLARE
    constraint_name_var text;
BEGIN
    SELECT tc.constraint_name 
    INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'organizations' 
      AND tc.constraint_type = 'CHECK' 
      AND ccu.column_name = 'status';

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE organizations DROP CONSTRAINT ' || quote_ident(constraint_name_var);
    END IF;
END $$;

ALTER TABLE organizations ALTER COLUMN status DROP DEFAULT;

-- Alter status column to use organization_status enum
ALTER TABLE organizations 
ALTER COLUMN status TYPE organization_status 
USING (
  CASE status
    WHEN 'active' THEN 'active'::organization_status
    WHEN 'suspended' THEN 'suspended'::organization_status
    WHEN 'trial' THEN 'active'::organization_status
    ELSE 'draft'::organization_status
  END
);

ALTER TABLE organizations ALTER COLUMN status SET DEFAULT 'draft'::organization_status;
ALTER TABLE organizations ALTER COLUMN status SET NOT NULL;

-- Add other onboarding columns
ALTER TABLE organizations
ADD COLUMN onboarding_step INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN beta_approved_at TIMESTAMPTZ,
ADD COLUMN beta_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN meta_business_id TEXT,
ADD COLUMN whatsapp_business_account_id TEXT,
ADD COLUMN phone_number_id TEXT,
ADD COLUMN default_language TEXT DEFAULT 'es-LA',
ADD COLUMN timezone TEXT DEFAULT 'America/Guayaquil',
ADD COLUMN ai_mode TEXT DEFAULT 'support',
ADD COLUMN ai_tone TEXT DEFAULT 'professional',
ADD COLUMN billing_status TEXT DEFAULT 'trial',
ADD COLUMN terms_accepted_at TIMESTAMPTZ,
ADD COLUMN privacy_accepted_at TIMESTAMPTZ;

-- 2. Organization Invites Table
CREATE TABLE organization_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'operator' NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- RLS Policies for Invites
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invites for their organizations"
  ON organization_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = organization_invites.organization_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage invites"
  ON organization_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = organization_invites.organization_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
    )
  );
