-- ============================================================
-- 004_storage.sql — Storage Buckets & Policies
-- Run after 003_functions.sql
-- ============================================================

-- ── Create buckets ────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('patient-photos', 'patient-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('documents', 'documents', false, 20971520, NULL),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── Patient Photos policies ───────────────────────────────────

CREATE POLICY "Clinic members can view patient photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );

CREATE POLICY "Staff can upload patient photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
    AND get_user_role() IN ('admin', 'doctor', 'receptionist')
  );

CREATE POLICY "Admins can delete patient photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
    AND get_user_role() = 'admin'
  );

-- ── Documents policies ────────────────────────────────────────

CREATE POLICY "Clinic members can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );

CREATE POLICY "Staff can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
    AND get_user_role() IN ('admin', 'doctor', 'receptionist')
  );

CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
    AND get_user_role() = 'admin'
  );

-- ── Avatars policies (public bucket) ──────────────────────────

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
