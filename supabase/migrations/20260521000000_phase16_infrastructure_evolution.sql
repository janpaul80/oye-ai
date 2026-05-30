-- 🧠 Migration: Phase 16 Governance & Analytics Infrastructure Evolution

-- 1. Expanded Provider Quarantine Ledger
CREATE TABLE IF NOT EXISTS public.provider_quarantines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quarantine_until TIMESTAMPTZ,
  reason TEXT NOT NULL,
  reroute_count INT DEFAULT 0,
  restored_at TIMESTAMPTZ,
  sla_breach_ms INT,
  trace_id TEXT
);

-- 2. Message Outbound & Status Tracing Table
CREATE TABLE IF NOT EXISTS public.message_delivery_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL,
  conversation_id UUID,
  status TEXT NOT NULL, -- 'sent', 'delivered', 'read', 'failed'
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  latency_dispatch_to_delivered_ms INT,
  latency_delivered_to_read_ms INT,
  error_message TEXT
);

-- 3. Anomaly Clusters Table
CREATE TABLE IF NOT EXISTS public.anomaly_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  anomaly_type TEXT NOT NULL, -- 'webhook_delay', 'provider_slowdown', 'db_degradation'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  correlated_events INT DEFAULT 0,
  details JSONB NOT NULL,
  is_mitigated BOOLEAN DEFAULT FALSE,
  mitigated_at TIMESTAMPTZ
);
