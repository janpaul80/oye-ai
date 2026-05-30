-- Oye AI: Multi-Tenant RLS Policy Verification Script
-- Target: PostgreSQL / Supabase SQL Editor
-- Description: Run this script in the Supabase SQL editor to test, mock, 
--              and verify tenant isolation between two separate organizations.

-- ==========================================
-- 1. Setup Mock Test Entities
-- ==========================================
BEGIN;

-- Add User Profiles
INSERT INTO public.profiles (id, email, full_name)
VALUES 
  ('aaaa1111-1111-1111-1111-aaaaaaaaaaaa', 'tenant_a@oye-ai.com', 'Business A Owner'),
  ('bbbb2222-2222-2222-2222-bbbbbbbbbbbb', 'tenant_b@oye-ai.com', 'Business B Owner')
ON CONFLICT (id) DO NOTHING;

-- Add Workspaces (Organizations)
INSERT INTO public.organizations (id, name, slug)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Org Alpha', 'org-alpha'),
  ('22222222-2222-2222-2222-222222222222', 'Org Beta', 'org-beta')
ON CONFLICT (id) DO NOTHING;

-- Map Memberships
INSERT INTO public.memberships (organization_id, user_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-aaaaaaaaaaaa', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'bbbb2222-2222-2222-2222-bbbbbbbbbbbb', 'owner')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Add Scoped Customer Data
INSERT INTO public.customers (id, organization_id, name, phone_number)
VALUES
  ('a0a0a0a0-0000-0000-0000-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Customer Alpha', '+593991112222'),
  ('b0b0b0b0-0000-0000-0000-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Customer Beta', '+551199998888')
ON CONFLICT DO NOTHING;

COMMIT;

-- ==========================================
-- 2. Verify Row-Level Security Scoping
-- ==========================================

-- Simulating: Session context of Tenant A (User 'aaaa1111...')
SET LOCAL request.jwt.claim.sub = 'aaaa1111-1111-1111-1111-aaaaaaaaaaaa';
SET ROLE authenticated;

-- Test A1: Query active customers. Expected: Customer Alpha ONLY (1 row).
SELECT 'Test A1: Query Customers (Alpha Context)' AS check_label, id, name, organization_id 
FROM public.customers;

-- Test A2: Confirm Tenant A cannot access Org Beta
SELECT 'Test A2: Attempting access to Org Beta' AS check_label, name 
FROM public.organizations 
WHERE id = '22222222-2222-2222-2222-222222222222';


-- Simulating: Switch Session context to Tenant B (User 'bbbb2222...')
RESET ROLE;
SET LOCAL request.jwt.claim.sub = 'bbbb2222-2222-2222-2222-bbbbbbbbbbbb';
SET ROLE authenticated;

-- Test B1: Query active customers. Expected: Customer Beta ONLY (1 row).
SELECT 'Test B1: Query Customers (Beta Context)' AS check_label, id, name, organization_id 
FROM public.customers;

-- Test B2: Attempting deletion of Tenant A's customer. Expected: 0 rows affected (denied by policy)
DELETE FROM public.customers WHERE id = 'a0a0a0a0-0000-0000-0000-aaaaaaaaaaaa';

-- Reset testing session state
RESET ROLE;
