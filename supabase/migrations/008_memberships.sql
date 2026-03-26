-- ============================================================
-- 008_memberships.sql — Multi-Tenancy: Memberships Table
-- Run after 007_rate_limits_feature_flags.sql
--
-- Adds many-to-many relationship: users ↔ clinics via memberships.
-- Preserves existing users.clinic_id for backward compatibility.
-- ============================================================

-- ── 1. Create memberships table ─────────────────────────────

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'staff')) DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, clinic_id)
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_clinic ON memberships(clinic_id);
CREATE INDEX idx_memberships_role ON memberships(role);

-- ── 2. Enable RLS ───────────────────────────────────────────

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Users can see memberships for clinics they belong to
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view clinic memberships"
  ON memberships FOR SELECT
  USING (clinic_id IN (
    SELECT m.clinic_id FROM memberships m WHERE m.user_id = auth.uid()
  ));

-- Only owners/admins can add members to their clinic
CREATE POLICY "Owners and admins can insert memberships"
  ON memberships FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT m.clinic_id FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

-- Only owners can update membership roles
CREATE POLICY "Owners can update memberships"
  ON memberships FOR UPDATE
  USING (
    clinic_id IN (
      SELECT m.clinic_id FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role = 'owner'
    )
  );

-- Only owners can remove members (but not themselves)
CREATE POLICY "Owners can delete memberships"
  ON memberships FOR DELETE
  USING (
    clinic_id IN (
      SELECT m.clinic_id FROM memberships m
      WHERE m.user_id = auth.uid() AND m.role = 'owner'
    )
    AND user_id != auth.uid()
  );

-- Operators bypass RLS (service role)
CREATE POLICY "Service role full access"
  ON memberships FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ── 3. Migrate existing users.clinic_id → memberships ───────
-- This is idempotent: inserts only if no membership exists yet.

INSERT INTO memberships (user_id, clinic_id, role)
SELECT
  u.id,
  u.clinic_id,
  CASE
    WHEN u.role = 'admin' THEN 'owner'
    WHEN u.role = 'doctor' THEN 'admin'
    ELSE 'staff'
  END
FROM users u
WHERE u.clinic_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = u.id AND m.clinic_id = u.clinic_id
  );

-- ── 4. Helper functions for membership-based queries ────────

-- Get all clinic IDs for current user
CREATE OR REPLACE FUNCTION get_user_clinic_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT clinic_id FROM memberships WHERE user_id = auth.uid();
$$;

-- Get user's role in a specific clinic
CREATE OR REPLACE FUNCTION get_user_clinic_role(p_clinic_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM memberships
  WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
  LIMIT 1;
$$;

-- Check if user is member of a clinic
CREATE OR REPLACE FUNCTION is_clinic_member(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
  );
$$;

-- Check if user is owner/admin of a clinic
CREATE OR REPLACE FUNCTION is_clinic_admin(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND clinic_id = p_clinic_id
      AND role IN ('owner', 'admin')
  );
$$;

-- Updated get_user_clinic_id() — returns primary clinic (first membership)
-- Keeps backward compatibility with existing RLS policies
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT clinic_id FROM memberships WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1),
    (SELECT clinic_id FROM users WHERE id = auth.uid())
  );
$$;

-- ── 5. Auto-create membership on user signup ────────────────
-- Extends handle_new_user() to also create a membership if clinic_id is set

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
BEGIN
  INSERT INTO users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );

  -- If clinic_id is passed in metadata, auto-create membership
  v_clinic_id := (NEW.raw_user_meta_data ->> 'clinic_id')::uuid;
  IF v_clinic_id IS NOT NULL THEN
    UPDATE users SET clinic_id = v_clinic_id WHERE id = NEW.id;
    INSERT INTO memberships (user_id, clinic_id, role)
    VALUES (NEW.id, v_clinic_id, 'staff')
    ON CONFLICT (user_id, clinic_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 6. Realtime for memberships ─────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE memberships;
