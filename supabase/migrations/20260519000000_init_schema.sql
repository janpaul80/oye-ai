-- Oye AI: Multi-Tenant Database Migration
-- Target: PostgreSQL / Supabase Managed Cloud
-- Description: Sets up the initial structural schema, constraints, indexes, and tables.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Users, linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Will correspond to auth.users.id
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Memberships (Link users to organizations with roles)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'agent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- 4. Channels (WhatsApp, Webchat, Instagram, etc.)
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('whatsapp', 'instagram', 'messenger', 'webchat')),
    provider_channel_id TEXT, -- e.g., Meta WhatsApp Phone Number ID
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., Meta ACCESS_TOKEN, verify_token (encrypted or plain)
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT,
    phone_number TEXT, -- Format: +E.164 (e.g., +593998887777)
    email TEXT,
    custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb, -- CRM fields (tags, preferences, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_phone UNIQUE (organization_id, phone_number)
);

-- 6. Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'snoozed', 'closed')),
    mode TEXT NOT NULL DEFAULT 'ai' CHECK (mode IN ('ai', 'manual', 'hybrid')),
    summary TEXT, -- Automated AI summary of the chat
    language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en', 'pt', 'fr')),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'ai')),
    sender_id UUID, -- References profiles.id or customer_id
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'template')),
    body TEXT,
    media_url TEXT,
    provider_message_id TEXT UNIQUE, -- Meta WhatsApp Message ID
    delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI Agents (System configuration per organization)
CREATE TABLE IF NOT EXISTS public.ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model_provider TEXT NOT NULL DEFAULT 'openai' CHECK (model_provider IN ('openai', 'anthropic', 'gemini')),
    model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    system_prompt TEXT NOT NULL,
    tools_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    temperature NUMERIC NOT NULL DEFAULT 0.7,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Payment Links
CREATE TABLE IF NOT EXISTS public.payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    stripe_link_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Usage Ledger (Billing credits tracking)
CREATE TABLE IF NOT EXISTS public.usage_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    messages_processed INTEGER NOT NULL DEFAULT 0,
    month_year TEXT NOT NULL, -- e.g., '2026-05'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_month UNIQUE (organization_id, month_year)
);

-- Create optimal indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON public.memberships(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_channels_org ON public.channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON public.customers(organization_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agents_org ON public.ai_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_org ON public.payment_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_org ON public.usage_ledger(organization_id);

-- Setup automatic update triggers for last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_conversation_last_message_at
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message_at();
