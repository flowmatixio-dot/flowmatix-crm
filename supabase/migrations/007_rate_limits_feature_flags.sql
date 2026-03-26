-- ============================================================
-- 007: Rate Limiting + Feature Flags
-- ============================================================

-- ── Rate Limiting ───────────────────────────────────────────
-- Token-bucket style: per clinic, per action key.
-- Server middleware checks & decrements; cron refills.

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  key text NOT NULL,               -- e.g. 'whatsapp_messages', 'api_requests'
  max_tokens integer NOT NULL,     -- bucket capacity
  refill_rate integer NOT NULL,    -- tokens added per refill_interval
  refill_interval interval NOT NULL DEFAULT '1 hour',
  current_tokens integer NOT NULL, -- current available tokens
  last_refill_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, key)
);

-- Function: consume token (returns true if allowed, false if throttled)
CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_clinic_id uuid,
  p_key text,
  p_cost integer DEFAULT 1
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row rate_limits%ROWTYPE;
  v_elapsed interval;
  v_new_tokens integer;
BEGIN
  SELECT * INTO v_row FROM rate_limits
  WHERE clinic_id = p_clinic_id AND key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    -- No rate limit configured = unlimited
    RETURN true;
  END IF;

  -- Refill tokens based on elapsed time
  v_elapsed := now() - v_row.last_refill_at;
  v_new_tokens := LEAST(
    v_row.max_tokens,
    v_row.current_tokens + FLOOR(EXTRACT(EPOCH FROM v_elapsed) / EXTRACT(EPOCH FROM v_row.refill_interval))::integer * v_row.refill_rate
  );

  IF v_new_tokens < p_cost THEN
    -- Update refill timestamp even when denied
    UPDATE rate_limits SET current_tokens = v_new_tokens, last_refill_at = now(), updated_at = now()
    WHERE id = v_row.id;
    RETURN false;
  END IF;

  -- Consume tokens
  UPDATE rate_limits
  SET current_tokens = v_new_tokens - p_cost, last_refill_at = now(), updated_at = now()
  WHERE id = v_row.id;

  RETURN true;
END;
$$;

-- Function: get remaining tokens (for UI display)
CREATE OR REPLACE FUNCTION get_rate_limit_status(
  p_clinic_id uuid,
  p_key text
) RETURNS TABLE(max_tokens integer, current_tokens integer, refill_rate integer, refill_interval interval)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT rl.max_tokens, rl.current_tokens, rl.refill_rate, rl.refill_interval
  FROM rate_limits rl
  WHERE rl.clinic_id = p_clinic_id AND rl.key = p_key;
$$;

-- ── Feature Flags ───────────────────────────────────────────
-- Per-clinic toggles for add-on features.
-- Source: 'plan' (included in tier), 'addon' (purchased), 'manual' (operator override).

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  flag text NOT NULL,              -- e.g. 'flight_tracking', 'driver_dispatch', 'analytics_pro'
  enabled boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'plan' CHECK (source IN ('plan', 'addon', 'manual', 'trial')),
  expires_at timestamptz,          -- NULL = permanent, set for trials
  metadata jsonb DEFAULT '{}',     -- extra config per flag
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, flag)
);

-- Function: check if feature is enabled (respects expiry)
CREATE OR REPLACE FUNCTION has_feature(
  p_clinic_id uuid,
  p_flag text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM feature_flags
    WHERE clinic_id = p_clinic_id
      AND flag = p_flag
      AND enabled = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_select ON rate_limits FOR SELECT
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE POLICY rate_limits_manage ON rate_limits FOR ALL
  USING (is_operator());

CREATE POLICY feature_flags_select ON feature_flags FOR SELECT
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE POLICY feature_flags_manage ON feature_flags FOR ALL
  USING (is_operator());

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_rate_limits_clinic ON rate_limits(clinic_id, key);
CREATE INDEX idx_feature_flags_clinic ON feature_flags(clinic_id, flag);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(clinic_id) WHERE enabled = true;

-- ── Seed: Default rate limits per plan ──────────────────────
-- These are inserted per clinic during provisioning.
-- Reference values:
--
-- WhatsApp rate limits (per Meta policy):
--   Starter:    250 msgs/day  → ~10/hour
--   Pro:        1000 msgs/day → ~42/hour
--   Premium:    2000 msgs/day → ~83/hour
--   Enterprise: 5000 msgs/day → ~208/hour
--
-- API rate limits (per clinic):
--   Starter:    1000 req/hour
--   Pro:        5000 req/hour
--   Premium:    15000 req/hour
--   Enterprise: 50000 req/hour

-- ── Seed: Default feature flags per plan ────────────────────
-- Provisioning inserts these per clinic based on plan:
--
-- Feature              | Starter | Pro | Premium | Enterprise
-- ─────────────────────|---------|-----|---------|───────────
-- flight_tracking      | ✗       | ✗   | ✓       | ✓
-- driver_dispatch      | ✗       | ✗   | ✓       | ✓
-- analytics_pro        | ✗       | ✗   | ✓       | ✓
-- custom_branding      | ✗       | ✓   | ✓       | ✓
-- multi_language       | ✓       | ✓   | ✓       | ✓
-- api_access           | ✗       | ✓   | ✓       | ✓
-- priority_support     | ✗       | ✗   | ✓       | ✓
-- white_label          | ✗       | ✗   | ✗       | ✓
-- sso                  | ✗       | ✗   | ✗       | ✓
-- custom_webhooks      | ✗       | ✓   | ✓       | ✓
