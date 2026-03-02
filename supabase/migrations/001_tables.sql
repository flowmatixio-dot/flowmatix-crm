-- ============================================================
-- 001_tables.sql — Core Tables for Flowmatix CRM
-- Run this first in Supabase SQL Editor
-- ============================================================

-- Clinics
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  address text,
  phone text,
  email text,
  settings jsonb DEFAULT '{}',
  plan text DEFAULT 'starter',
  setup_status text DEFAULT 'new',
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL,
  email text NOT NULL,
  role text CHECK (role IN ('admin', 'doctor', 'receptionist', 'readonly')) DEFAULT 'receptionist',
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  language text CHECK (language IN ('de', 'en', 'tr')) DEFAULT 'en',
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  gender text,
  date_of_birth date,
  nationality text,
  language text,
  norwood_scale text,
  notes text,
  tags text[],
  status text CHECK (status IN ('lead', 'contacted', 'booked', 'in_treatment', 'completed', 'lost')) DEFAULT 'lead',
  source text CHECK (source IN ('whatsapp', 'instagram', 'facebook', 'website', 'referral', 'walk_in', 'other')),
  consent_given boolean DEFAULT false,
  consent_date timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type text CHECK (type IN ('consultation', 'treatment', 'followup', 'control')),
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Treatments
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  type text CHECK (type IN ('fue', 'fut', 'prp', 'mesotherapy', 'other')),
  grafts_count integer,
  area text,
  price numeric(10,2),
  currency text DEFAULT 'EUR',
  notes text,
  before_photos text[],
  after_photos text[],
  status text CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
  created_at timestamptz DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  direction text CHECK (direction IN ('inbound', 'outbound')),
  channel text CHECK (channel IN ('whatsapp', 'email', 'sms', 'internal')),
  content text,
  media_urls text[],
  status text CHECK (status IN ('sent', 'delivered', 'read', 'failed')) DEFAULT 'sent',
  sent_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text,
  title text,
  body text,
  is_read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  invoice_number text,
  items jsonb DEFAULT '[]',
  subtotal numeric(10,2),
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total numeric(10,2),
  currency text DEFAULT 'EUR',
  status text CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
  due_date date,
  paid_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL,
  method text CHECK (method IN ('cash', 'card', 'transfer', 'paypal')),
  reference text,
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Leads (pipeline tracking)
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  stage text CHECK (stage IN ('new', 'contacted', 'booked', 'done', 'lost')) DEFAULT 'new',
  source text,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  value numeric(10,2),
  notes text,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text,
  vehicle text,
  status text CHECK (status IN ('available', 'busy', 'off')) DEFAULT 'available',
  created_at timestamptz DEFAULT now()
);

-- Driver Assignments
CREATE TABLE IF NOT EXISTS driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  type text CHECK (type IN ('pickup', 'dropoff')),
  scheduled_time timestamptz,
  status text CHECK (status IN ('pending', 'notified', 'confirmed', 'declined', 'escalated', 'backup_confirmed', 'backup_declined')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Automations
CREATE TABLE IF NOT EXISTS automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trigger_type text,
  trigger_config jsonb DEFAULT '{}',
  action_type text,
  action_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_run timestamptz,
  run_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Files
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text NOT NULL,
  category text CHECK (category IN ('photo_before', 'photo_after', 'document', 'consent', 'invoice', 'other')),
  created_at timestamptz DEFAULT now()
);
