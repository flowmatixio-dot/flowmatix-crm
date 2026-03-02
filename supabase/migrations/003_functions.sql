-- ============================================================
-- 003_functions.sql — Database Functions & Triggers
-- Run after 002_rls.sql
-- ============================================================

-- ── 1. Handle new user signup ─────────────────────────────────
-- Creates a users row when a new auth.users entry is created

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ── 2. Auto-update updated_at ─────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_patients ON patients;
CREATE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_appointments ON appointments;
CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_leads ON leads;
CREATE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_clinics ON clinics;
CREATE TRIGGER set_updated_at_clinics
  BEFORE UPDATE ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── 3. Audit logging function ─────────────────────────────────

CREATE OR REPLACE FUNCTION log_audit(
  p_clinic_id uuid,
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_log (clinic_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (p_clinic_id, p_user_id, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data);
END;
$$;

-- ── 4. Audit trigger for patient changes ──────────────────────

CREATE OR REPLACE FUNCTION on_patient_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      NEW.clinic_id, NEW.created_by, 'patient_created', 'patient', NEW.id,
      NULL, to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit(
      NEW.clinic_id, auth.uid(), 'patient_updated', 'patient', NEW.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      OLD.clinic_id, auth.uid(), 'patient_deleted', 'patient', OLD.id,
      to_jsonb(OLD), NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_patients ON patients;
CREATE TRIGGER audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION on_patient_changed();

-- ── 5. Lead stage change → notification ───────────────────────

CREATE OR REPLACE FUNCTION on_lead_stage_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Notify assigned user
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (clinic_id, user_id, type, title, body, link)
      VALUES (
        NEW.clinic_id,
        NEW.assigned_to,
        'lead',
        'Lead stage changed',
        'Lead moved from ' || COALESCE(OLD.stage, 'none') || ' to ' || NEW.stage,
        '/leads/' || NEW.id
      );
    END IF;

    -- Audit log
    PERFORM log_audit(
      NEW.clinic_id, auth.uid(), 'lead_stage_changed', 'lead', NEW.id,
      jsonb_build_object('stage', OLD.stage),
      jsonb_build_object('stage', NEW.stage)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_stage_changed ON leads;
CREATE TRIGGER lead_stage_changed
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION on_lead_stage_changed();

-- ── 6. Dashboard stats function ───────────────────────────────

CREATE OR REPLACE FUNCTION dashboard_stats(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_patients', (SELECT count(*) FROM patients WHERE clinic_id = p_clinic_id),
    'patients_today', (SELECT count(*) FROM patients WHERE clinic_id = p_clinic_id AND created_at::date = CURRENT_DATE),
    'appointments_today', (SELECT count(*) FROM appointments WHERE clinic_id = p_clinic_id AND start_time::date = CURRENT_DATE),
    'revenue_total', (SELECT COALESCE(sum(total), 0) FROM invoices WHERE clinic_id = p_clinic_id AND status = 'paid'),
    'revenue_this_month', (SELECT COALESCE(sum(total), 0) FROM invoices WHERE clinic_id = p_clinic_id AND status = 'paid' AND paid_date >= date_trunc('month', CURRENT_DATE)),
    'no_show_rate', (
      SELECT CASE
        WHEN count(*) = 0 THEN 0
        ELSE round((count(*) FILTER (WHERE status = 'no_show')::numeric / count(*)::numeric) * 100, 1)
      END
      FROM appointments
      WHERE clinic_id = p_clinic_id AND start_time < now()
    ),
    'leads_by_stage', (
      SELECT COALESCE(jsonb_object_agg(stage, cnt), '{}')
      FROM (SELECT stage, count(*) as cnt FROM leads WHERE clinic_id = p_clinic_id GROUP BY stage) s
    ),
    'unread_messages', (SELECT count(*) FROM messages WHERE clinic_id = p_clinic_id AND direction = 'inbound' AND status != 'read')
  ) INTO result;

  RETURN result;
END;
$$;

-- ── 7. Full-text patient search ───────────────────────────────

CREATE OR REPLACE FUNCTION search_patients(p_clinic_id uuid, p_query text)
RETURNS SETOF patients
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND (
      to_tsvector('simple',
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(email, '') || ' ' ||
        coalesce(phone, '')
      ) @@ plainto_tsquery('simple', p_query)
      OR first_name ILIKE '%' || p_query || '%'
      OR last_name ILIKE '%' || p_query || '%'
      OR email ILIKE '%' || p_query || '%'
      OR phone ILIKE '%' || p_query || '%'
    )
  ORDER BY last_name, first_name
  LIMIT 50;
END;
$$;
