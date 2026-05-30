-- Oye AI: Usage Ledger Atomic Increment RPC Function
-- Description: Provides atomic increments for token usage and processing counters,
--              handling upsert conflicts cleanly under high webhook volumes.

CREATE OR REPLACE FUNCTION public.increment_usage_ledger(
  p_org_id UUID,
  p_month TEXT,
  p_tokens INTEGER,
  p_messages INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_ledger (organization_id, month_year, tokens_used, messages_processed)
  VALUES (p_org_id, p_month, p_tokens, p_messages)
  ON CONFLICT (organization_id, month_year)
  DO UPDATE SET
    tokens_used = public.usage_ledger.tokens_used + EXCLUDED.tokens_used,
    messages_processed = public.usage_ledger.messages_processed + EXCLUDED.messages_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
