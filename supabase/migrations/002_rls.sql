-- ============================================================
-- 002_rls.sql — Row Level Security for Flowmatix CRM
-- Run after 001_tables.sql
-- ============================================================

-- ── Helper functions ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT clinic_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- ── Enable RLS on all tables ──────────────────────────────────

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ── Clinics ───────────────────────────────────────────────────

CREATE POLICY "Users can view own clinic"
  ON clinics FOR SELECT
  USING (id = get_user_clinic_id());

CREATE POLICY "Admins can update own clinic"
  ON clinics FOR UPDATE
  USING (id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Users ─────────────────────────────────────────────────────

CREATE POLICY "Users can view clinic members"
  ON users FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can manage clinic users"
  ON users FOR ALL
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Patients ──────────────────────────────────────────────────

CREATE POLICY "Users can view clinic patients"
  ON patients FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Staff can insert patients"
  ON patients FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor', 'receptionist'));

CREATE POLICY "Staff can update patients"
  ON patients FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor', 'receptionist'));

CREATE POLICY "Admins can delete patients"
  ON patients FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Appointments ──────────────────────────────────────────────

CREATE POLICY "Users can view clinic appointments"
  ON appointments FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Staff can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor', 'receptionist'));

CREATE POLICY "Staff can update appointments"
  ON appointments FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor', 'receptionist'));

CREATE POLICY "Admins can delete appointments"
  ON appointments FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Treatments ────────────────────────────────────────────────

CREATE POLICY "Users can view clinic treatments"
  ON treatments FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Doctors and admins can insert treatments"
  ON treatments FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor'));

CREATE POLICY "Doctors and admins can update treatments"
  ON treatments FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor'));

CREATE POLICY "Admins can delete treatments"
  ON treatments FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Messages ──────────────────────────────────────────────────

CREATE POLICY "Users can view clinic messages"
  ON messages FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Staff can send messages"
  ON messages FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor', 'receptionist'));

-- ── Notifications ─────────────────────────────────────────────

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ── Invoices ──────────────────────────────────────────────────

CREATE POLICY "Users can view clinic invoices"
  ON invoices FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Admins can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

CREATE POLICY "Admins can update invoices"
  ON invoices FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Payments ──────────────────────────────────────────────────

CREATE POLICY "Users can view payments for clinic invoices"
  ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND invoices.clinic_id = get_user_clinic_id()
  ));

CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND invoices.clinic_id = get_user_clinic_id()
  ) AND get_user_role() = 'admin');

-- ── Leads ─────────────────────────────────────────────────────

CREATE POLICY "Users can view clinic leads"
  ON leads FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Staff can insert leads"
  ON leads FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor', 'receptionist'));

CREATE POLICY "Staff can update leads"
  ON leads FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor', 'receptionist'));

CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Drivers ───────────────────────────────────────────────────

CREATE POLICY "Users can view clinic drivers"
  ON drivers FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Admins can manage drivers"
  ON drivers FOR ALL
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Driver Assignments ────────────────────────────────────────

CREATE POLICY "Users can view clinic driver assignments"
  ON driver_assignments FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Staff can manage driver assignments"
  ON driver_assignments FOR ALL
  USING (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'receptionist'));

-- ── Audit Log ─────────────────────────────────────────────────

CREATE POLICY "Admins can view clinic audit log"
  ON audit_log FOR SELECT
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ── Automations ───────────────────────────────────────────────

CREATE POLICY "Users can view clinic automations"
  ON automations FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Admins can manage automations"
  ON automations FOR ALL
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');

-- ── Files ─────────────────────────────────────────────────────

CREATE POLICY "Users can view clinic files"
  ON files FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Staff can upload files"
  ON files FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND get_user_role() IN ('admin', 'doctor', 'receptionist'));

CREATE POLICY "Admins can delete files"
  ON files FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND get_user_role() = 'admin');
