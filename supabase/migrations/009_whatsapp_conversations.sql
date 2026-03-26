-- ============================================================
-- 009_whatsapp_conversations.sql — Production WhatsApp Multi-Tenant
-- Run after 008_memberships.sql
--
-- Creates: whatsapp_configs, conversations, conversation_messages,
--          conversation_photos, monthly_patient_usage, reminders_sent, events
-- Alters:  patients (add drive_folder_id),
--          appointments (add conversation_id, phone, timezone, source,
--                        confirmed_at, no_show_alert_sent_at)
-- ============================================================

-- ── 1. whatsapp_configs ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT,
  access_token TEXT NOT NULL,
  display_name TEXT,
  google_drive_folder_id TEXT,
  staff_notify_channel TEXT,
  custom_system_prompt TEXT,
  welcome_message TEXT,
  allowed_languages TEXT[],
  webhook_verify_token TEXT DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_whatsapp_configs_clinic ON whatsapp_configs(clinic_id);
CREATE INDEX idx_whatsapp_configs_phone_number ON whatsapp_configs(phone_number_id);

-- ── 2. conversations ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  channel TEXT DEFAULT 'whatsapp',
  control_mode TEXT DEFAULT 'ai' CHECK (control_mode IN ('ai', 'human', 'paused')),
  flow_state TEXT DEFAULT 'EMPTY',
  gdpr_consent BOOLEAN DEFAULT false,
  photo_count INT DEFAULT 0,
  last_photo_at TIMESTAMPTZ,
  last_photo_confirm_at TIMESTAMPTZ,
  lang TEXT,
  extracted_fields JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  first_message_at TIMESTAMPTZ,
  photo_complete_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, phone, channel)
);

CREATE INDEX idx_conversations_clinic ON conversations(clinic_id);
CREATE INDEX idx_conversations_phone ON conversations(phone);
CREATE INDEX idx_conversations_flow_state ON conversations(flow_state);
CREATE INDEX idx_conversations_clinic_phone ON conversations(clinic_id, phone);

-- ── 3. conversation_messages (Idempotency + History) ──────────

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  wa_message_id TEXT NOT NULL,
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, wa_message_id)
);

CREATE INDEX idx_conv_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX idx_conv_messages_created ON conversation_messages(created_at DESC);

-- ── 4. conversation_photos ────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  wa_message_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  photo_type TEXT,
  storage_path TEXT,
  drive_file_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, wa_message_id)
);

CREATE INDEX idx_conv_photos_conversation ON conversation_photos(conversation_id);

-- ── 5. monthly_patient_usage (Patient Limit per Plan) ─────────

CREATE TABLE IF NOT EXISTS monthly_patient_usage (
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  phone TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (clinic_id, period, phone)
);

CREATE INDEX idx_monthly_usage_clinic_period ON monthly_patient_usage(clinic_id, period);

-- Trigger: period is ALWAYS set server-side from first_seen_at
CREATE OR REPLACE FUNCTION set_monthly_period()
RETURNS TRIGGER AS $$
BEGIN
  NEW.period := to_char(COALESCE(NEW.first_seen_at, now()), 'YYYY-MM');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_monthly_period
  BEFORE INSERT OR UPDATE ON monthly_patient_usage
  FOR EACH ROW EXECUTE FUNCTION set_monthly_period();

-- ── 6. ALTER patients: add drive_folder_id ────────────────────

ALTER TABLE patients ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;

-- ── 7. ALTER appointments: add WhatsApp/Reminder fields ───────

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Istanbul';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'crm';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS no_show_alert_sent_at TIMESTAMPTZ;

-- ── 8. reminders_sent (Dedup for Reminders) ───────────────────

CREATE TABLE IF NOT EXISTS reminders_sent (
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(appointment_id, reminder_type)
);

CREATE INDEX idx_reminders_sent_appointment ON reminders_sent(appointment_id);

-- ── 9. events (Performance Monitoring, Ops+) ──────────────────

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_clinic ON events(clinic_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at DESC);
CREATE INDEX idx_events_clinic_type_created ON events(clinic_id, event_type, created_at DESC);

-- ── 10. RLS Policies ──────────────────────────────────────────

ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_patient_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Service role (n8n) has full access
CREATE POLICY "Service role full access" ON whatsapp_configs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON conversations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON conversation_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON conversation_photos FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON monthly_patient_usage FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON reminders_sent FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can view data for their clinic
CREATE POLICY "Users can view own clinic whatsapp_configs" ON whatsapp_configs FOR SELECT
  USING (clinic_id IN (SELECT get_user_clinic_ids()));
CREATE POLICY "Users can view own clinic conversations" ON conversations FOR SELECT
  USING (clinic_id IN (SELECT get_user_clinic_ids()));
CREATE POLICY "Users can view own clinic conversation_messages" ON conversation_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE clinic_id IN (SELECT get_user_clinic_ids())
  ));
CREATE POLICY "Users can view own clinic conversation_photos" ON conversation_photos FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE clinic_id IN (SELECT get_user_clinic_ids())
  ));
CREATE POLICY "Users can view own clinic events" ON events FOR SELECT
  USING (clinic_id IN (SELECT get_user_clinic_ids()));

-- ── 11. Realtime ──────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;

-- ── 12. Helper: Count monthly patients for a clinic ───────────

CREATE OR REPLACE FUNCTION count_monthly_patients(p_clinic_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM monthly_patient_usage
  WHERE clinic_id = p_clinic_id
    AND period = to_char(now(), 'YYYY-MM');
$$;
