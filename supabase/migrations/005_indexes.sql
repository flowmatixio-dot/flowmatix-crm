-- ============================================================
-- 005_indexes.sql — Performance Indexes
-- Run after 004_storage.sql
-- ============================================================

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_patients_search ON patients
  USING GIN (to_tsvector('simple',
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(phone, '')
  ));

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_time ON appointments(clinic_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_clinic ON messages(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_patient ON messages(patient_id);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_clinic_stage ON leads(clinic_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_activity ON leads(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_clinic ON invoices(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_clinic ON audit_log(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- Files
CREATE INDEX IF NOT EXISTS idx_files_clinic ON files(clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(clinic_id, category);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Treatments
CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);

-- Driver assignments
CREATE INDEX IF NOT EXISTS idx_driver_assignments_clinic ON driver_assignments(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON driver_assignments(driver_id);

-- Automations
CREATE INDEX IF NOT EXISTS idx_automations_clinic ON automations(clinic_id, is_active);
