# Flowmatix CRM — Production Architecture Refactoring Plan

## Current State Assessment

### What EXISTS and WORKS
- React 18 + Vite SPA with 18 view components (~11,800 LOC)
- 7 Zustand stores (ui, auth, clinic, patient, inbox, appointment, billing)
- API client with 100+ endpoint functions (`src/api/client.js`)
- Supabase Postgres with 6 migrations (tables, RLS, functions, storage, indexes, realtime)
- 15 DB tables: clinics, users, patients, appointments, treatments, messages, notifications, invoices, payments, leads, drivers, driver_assignments, audit_log, automations, files
- RLS policies with `get_user_clinic_id()` and `get_user_role()` helpers
- Supabase Storage buckets: patient-photos, documents, avatars
- Full i18n (7 languages, 250+ keys each)
- OperatorPanel (2098 lines) with platform management
- WhatsAppSetup 5-step wizard
- Product tour + onboarding flow

### What MUST CHANGE (Gaps vs Requirements)
1. **Auth**: localStorage JWT tokens → httpOnly cookies
2. **Multi-tenancy**: No `memberships` table; users have single `clinic_id` column
3. **Demo data**: CLINICS_INIT/LEADS_INIT still seeded into stores on mount
4. **Hardcoded IDs**: `adminClinic: "c1"` default in clinicStore
5. **No job queue**: No BullMQ/Redis; webhooks not event-driven
6. **No Stripe integration**: No billing_customers, subscriptions, subscription_items tables
7. **No entitlements/usage**: Plan limits checked client-side against demo data
8. **No idempotency**: No dedupe table for webhook events
9. **CRM.jsx monolith**: 1791 lines, still hosts business logic + render
10. **WhatsApp**: Realtime subscription exists but inbound webhook flow is incomplete
11. **No provisioning pipeline**: Operator approves clinics but no automated flow

### What to PRESERVE (Do Not Touch)
- All 18 view components (they consume via `useApp()` — context bridge stays)
- `src/api/client.js` structure (extend, don't rewrite)
- Zustand store architecture (extend stores, don't replace)
- `src/data/constants.js` (all enums, status maps)
- `src/data/i18n.js` (translations)
- `src/utils/helpers.js` (utility functions)
- `src/components/shared/index.jsx` (UI primitives)
- Supabase connection + existing RLS architecture
- All existing migrations (additive migrations only)

---

## A) Folder Structure

```
/Users/bastian/Desktop/CRM/
├── index.html
├── main.jsx                          # React entry
├── CRM.jsx                          # REFACTOR: Layout + routing + context bridge only (~400 lines)
├── supabase.js                       # KEEP: Supabase client
├── package.json                      # ADD: bullmq not needed here (server-side)
├── vite.config.js                    # KEEP
├── .env                              # ADD: VITE_API_URL, VITE_STRIPE_PK
├── .env.staging                      # NEW
├── .env.production                   # NEW
│
├── src/
│   ├── api/
│   │   └── client.js                 # EXTEND: Add billing, webhooks, entitlements endpoints
│   │
│   ├── stores/
│   │   ├── index.js                  # KEEP: barrel export
│   │   ├── uiStore.js                # KEEP
│   │   ├── authStore.js              # REFACTOR: httpOnly cookie session, /api/auth/me on mount
│   │   ├── clinicStore.js            # REFACTOR: Remove "c1" default, fetch from API
│   │   ├── patientStore.js           # REFACTOR: Remove demo init, API-first
│   │   ├── inboxStore.js             # REFACTOR: Remove demo init, API-first
│   │   ├── appointmentStore.js       # REFACTOR: Remove demo init, API-first
│   │   ├── billingStore.js           # REFACTOR: Stripe-backed, remove demo invoices
│   │   └── entitlementStore.js       # NEW: Plan limits, usage counters
│   │
│   ├── context/
│   │   └── AppContext.jsx            # KEEP: Bridge (useApp hook)
│   │
│   ├── components/
│   │   ├── shared/
│   │   │   ├── index.jsx             # KEEP
│   │   │   └── ErrorBoundary.jsx     # KEEP
│   │   ├── Dashboard/DashboardView.jsx
│   │   ├── Inbox/InboxView.jsx
│   │   ├── Patients/PatientPanel.jsx
│   │   ├── Appointments/AppointmentsView.jsx
│   │   ├── Analytics/AnalyticsView.jsx
│   │   ├── AIControl/AIControlView.jsx
│   │   ├── Automations/AutomationsView.jsx
│   │   ├── Files/FilesView.jsx
│   │   ├── Billing/BillingView.jsx   # REFACTOR: Stripe portal, real invoices
│   │   ├── Revenue/RevenueView.jsx
│   │   ├── Addons/AddonsView.jsx     # REFACTOR: Real add-on management
│   │   ├── Settings/SettingsView.jsx
│   │   ├── AuditLog/AuditLogView.jsx
│   │   ├── Support/SupportView.jsx
│   │   ├── Operator/OperatorPanel.jsx
│   │   ├── SetupGuide/SetupGuide.jsx
│   │   ├── SetupGuide/WhatsAppSetup.jsx
│   │   └── Tour/ProductTour.jsx
│   │
│   ├── data/
│   │   ├── constants.js              # KEEP
│   │   ├── i18n.js                   # KEEP
│   │   └── demoData.js              # DELETE in production; keep for dev behind VITE_DEMO_MODE
│   │
│   └── utils/
│       └── helpers.js                # KEEP
│
├── supabase/
│   └── migrations/
│       ├── 001_tables.sql            # KEEP
│       ├── 002_rls.sql               # KEEP
│       ├── 003_functions.sql         # KEEP
│       ├── 004_storage.sql           # KEEP
│       ├── 005_indexes.sql           # KEEP
│       ├── 006_realtime.sql          # KEEP
│       ├── 007_memberships.sql       # NEW: Multi-tenant membership model
│       ├── 008_billing_tables.sql    # NEW: Stripe mirror tables
│       ├── 009_entitlements.sql      # NEW: Entitlements + usage counters
│       ├── 010_webhook_idempotency.sql # NEW: Dedupe table
│       ├── 011_conversations.sql     # NEW: Proper conversation model
│       └── 012_provisioning.sql      # NEW: Onboarding pipeline
│
├── server/                           # NEW: Backend service (Node/Fastify)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                          # Server secrets (Stripe SK, WA token, Redis URL)
│   ├── src/
│   │   ├── index.ts                  # Fastify server entry
│   │   ├── config.ts                 # Environment config
│   │   ├── db.ts                     # Supabase service-role client
│   │   ├── redis.ts                  # Redis connection
│   │   ├── auth/
│   │   │   ├── middleware.ts         # JWT verify + cookie extraction
│   │   │   ├── session.ts            # httpOnly cookie management
│   │   │   └── rbac.ts              # Permission checks
│   │   ├── routes/
│   │   │   ├── auth.ts              # /api/auth/me, login, logout, magic-link
│   │   │   ├── clinic.ts            # /api/clinic/current, settings
│   │   │   ├── patients.ts          # CRUD /api/patients
│   │   │   ├── conversations.ts     # /api/conversations, messages, takeover
│   │   │   ├── appointments.ts      # CRUD /api/appointments
│   │   │   ├── pipeline.ts          # /api/pipeline/move
│   │   │   ├── automations.ts       # CRUD /api/automations
│   │   │   ├── analytics.ts         # /api/analytics/summary
│   │   │   ├── storage.ts           # /api/uploads/signed-url, /api/storage/list
│   │   │   ├── billing.ts           # /api/billing/status, portal, change-plan, addons, cancel
│   │   │   └── operator.ts          # /api/operator/* (platform admin)
│   │   ├── webhooks/
│   │   │   ├── stripe.ts            # POST /webhooks/stripe
│   │   │   └── whatsapp.ts          # POST /webhooks/whatsapp
│   │   ├── jobs/
│   │   │   ├── queue.ts             # BullMQ queue definitions
│   │   │   ├── workers.ts           # Worker registration
│   │   │   ├── processWhatsappEvent.ts
│   │   │   ├── processStripeEvent.ts
│   │   │   ├── sendReminder.ts
│   │   │   ├── runAutomationStep.ts
│   │   │   ├── reconcileStripe.ts
│   │   │   └── cleanupRetention.ts
│   │   ├── services/
│   │   │   ├── stripe.ts            # Stripe SDK wrapper
│   │   │   ├── whatsapp.ts          # WhatsApp provider abstraction
│   │   │   ├── entitlements.ts      # Plan → entitlement resolution
│   │   │   └── provisioning.ts      # Clinic provisioning pipeline
│   │   └── lib/
│   │       ├── idempotency.ts       # Dedupe check/insert
│   │       └── logger.ts            # Structured logging
│   └── Dockerfile
│
└── docker-compose.yml                # NEW: Redis + server + CRM frontend
```

---

## B) Database Schema (New Migrations)

### 007_memberships.sql — Multi-Tenant Membership Model

```sql
-- Replace single clinic_id on users with a many-to-many membership model
-- Keep users.clinic_id for backward compat (default clinic), add memberships for proper RBAC

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'clinic_owner', 'clinic_admin', 'clinic_agent', 'clinic_viewer',
    'operator_superadmin', 'operator_support', 'operator_billing_admin'
  )) DEFAULT 'clinic_agent',
  is_primary boolean DEFAULT false,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  status text CHECK (status IN ('pending', 'active', 'suspended', 'revoked')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, clinic_id)
);

CREATE INDEX idx_memberships_user ON memberships(user_id, status);
CREATE INDEX idx_memberships_clinic ON memberships(clinic_id, role);

-- RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Users can see memberships for their own clinics
CREATE POLICY memberships_select ON memberships FOR SELECT
  USING (
    clinic_id IN (SELECT m.clinic_id FROM memberships m WHERE m.user_id = auth.uid() AND m.status = 'active')
    OR EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role LIKE 'operator_%')
  );

-- Only clinic_owner/clinic_admin can manage memberships
CREATE POLICY memberships_manage ON memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.clinic_id = memberships.clinic_id
      AND m.role IN ('clinic_owner', 'clinic_admin')
      AND m.status = 'active'
    )
    OR EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.role LIKE 'operator_%')
  );

-- Update the get_user_clinic_id function to use memberships
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT clinic_id FROM memberships
  WHERE user_id = auth.uid()
  AND status = 'active'
  AND is_primary = true
  LIMIT 1;
$$;

-- New function: get all clinic IDs for current user
CREATE OR REPLACE FUNCTION get_user_clinic_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT array_agg(clinic_id) FROM memberships
  WHERE user_id = auth.uid()
  AND status = 'active';
$$;

-- New function: check if user is operator
CREATE OR REPLACE FUNCTION is_operator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND role LIKE 'operator_%'
    AND status = 'active'
  );
$$;

-- New function: get user role for specific clinic
CREATE OR REPLACE FUNCTION get_role_for_clinic(p_clinic_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM memberships
  WHERE user_id = auth.uid()
  AND clinic_id = p_clinic_id
  AND status = 'active'
  LIMIT 1;
$$;
```

### 008_billing_tables.sql — Stripe Mirror

```sql
CREATE TABLE IF NOT EXISTS billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  email text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  status text NOT NULL CHECK (status IN (
    'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired',
    'trialing', 'unpaid', 'paused'
  )),
  price_id text NOT NULL,
  plan_name text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  stripe_item_id text NOT NULL UNIQUE,
  price_id text NOT NULL,
  product_name text,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  status text CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  amount_due integer, -- cents
  amount_paid integer,
  currency text DEFAULT 'eur',
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_customers_select ON billing_customers FOR SELECT
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE POLICY subscriptions_select ON subscriptions FOR SELECT
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE POLICY subscription_items_select ON subscription_items FOR SELECT
  USING (
    subscription_id IN (
      SELECT s.id FROM subscriptions s WHERE s.clinic_id = get_user_clinic_id()
    ) OR is_operator()
  );

CREATE POLICY stripe_invoices_select ON stripe_invoices FOR SELECT
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE INDEX idx_subscriptions_clinic ON subscriptions(clinic_id, status);
CREATE INDEX idx_stripe_invoices_clinic ON stripe_invoices(clinic_id, created_at DESC);
```

### 009_entitlements.sql — Entitlements + Usage

```sql
CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  source text DEFAULT 'plan', -- 'plan' | 'addon' | 'manual'
  source_id text, -- subscription_item_id or manual note
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, key, source_id)
);

CREATE TABLE IF NOT EXISTS usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  key text NOT NULL, -- 'patients_created', 'messages_sent', 'storage_bytes'
  period_start date NOT NULL,
  period_end date NOT NULL,
  count bigint DEFAULT 0,
  UNIQUE(clinic_id, key, period_start)
);

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_clinic_id uuid,
  p_key text,
  p_amount bigint DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start date;
  v_period_end date;
BEGIN
  -- Get current billing period from subscription
  SELECT current_period_start::date, current_period_end::date
  INTO v_period_start, v_period_end
  FROM subscriptions
  WHERE clinic_id = p_clinic_id AND status IN ('active', 'trialing')
  ORDER BY created_at DESC LIMIT 1;

  -- Fallback to calendar month
  IF v_period_start IS NULL THEN
    v_period_start := date_trunc('month', now())::date;
    v_period_end := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
  END IF;

  INSERT INTO usage_counters (clinic_id, key, period_start, period_end, count)
  VALUES (p_clinic_id, p_key, v_period_start, v_period_end, p_amount)
  ON CONFLICT (clinic_id, key, period_start)
  DO UPDATE SET count = usage_counters.count + p_amount;
END;
$$;

-- Function to check entitlement
CREATE OR REPLACE FUNCTION check_entitlement(
  p_clinic_id uuid,
  p_key text
) RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT value FROM entitlements
  WHERE clinic_id = p_clinic_id AND key = p_key
  ORDER BY
    CASE source WHEN 'manual' THEN 0 WHEN 'addon' THEN 1 WHEN 'plan' THEN 2 END
  LIMIT 1;
$$;

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY entitlements_select ON entitlements FOR SELECT
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE POLICY usage_counters_select ON usage_counters FOR SELECT
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE INDEX idx_entitlements_clinic ON entitlements(clinic_id, key);
CREATE INDEX idx_usage_clinic_period ON usage_counters(clinic_id, key, period_start);
```

### 010_webhook_idempotency.sql

```sql
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- 'stripe' | 'whatsapp' | 'meta'
  event_id text NOT NULL, -- Provider's event ID
  event_type text NOT NULL,
  payload jsonb,
  status text DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed', 'skipped')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, event_id)
);

CREATE INDEX idx_webhook_events_lookup ON webhook_events(provider, event_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status, created_at);
```

### 011_conversations.sql — Proper Conversation Model

```sql
-- The existing messages table has patient_id but no conversation grouping
-- Add a conversations table for proper inbox

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms', 'internal')),
  wa_phone text, -- WhatsApp phone number
  status text DEFAULT 'open' CHECK (status IN (
    'open', 'ai_active', 'collecting_photos', 'needs_review',
    'human_takeover', 'booking_pending', 'resolved', 'closed'
  )),
  control_mode text DEFAULT 'ai' CHECK (control_mode IN ('ai', 'human', 'paused')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  unread_count integer DEFAULT 0,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add conversation_id to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select ON conversations FOR SELECT
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE POLICY conversations_manage ON conversations FOR ALL
  USING (clinic_id = get_user_clinic_id() OR is_operator());

CREATE INDEX idx_conversations_clinic ON conversations(clinic_id, status, last_message_at DESC);
CREATE INDEX idx_conversations_patient ON conversations(patient_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
```

### 012_provisioning.sql — Onboarding Pipeline

```sql
CREATE TABLE IF NOT EXISTS provisioning_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL,
  -- Application data
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  clinic_name text NOT NULL,
  clinic_type text,
  country text,
  phone text,
  website text,
  -- Pipeline state
  stage text NOT NULL DEFAULT 'applied' CHECK (stage IN (
    'applied', 'under_review', 'approved', 'payment_pending',
    'payment_complete', 'provisioning', 'provisioned', 'onboarding',
    'active', 'rejected'
  )),
  -- Tracking
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  stripe_checkout_session_id text,
  provisioning_log jsonb DEFAULT '[]',
  -- Setup progress
  setup_steps jsonb DEFAULT '{
    "clinic_info": false,
    "whatsapp_connected": false,
    "ai_configured": false,
    "languages_set": false,
    "consent_templates": false,
    "first_test_message": false
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_provisioning_stage ON provisioning_pipeline(stage, created_at DESC);
CREATE INDEX idx_provisioning_clinic ON provisioning_pipeline(clinic_id);
```

---

## C) API Contracts

All endpoints derive `clinic_id` from the authenticated session (httpOnly cookie → JWT → membership lookup). Never client-provided.

### Auth

```
POST /api/auth/login
  Body: { email: string, password: string }
  Response: { ok: true }  (sets httpOnly cookie)
  Errors: 401 Invalid credentials

POST /api/auth/magic-link
  Body: { email: string }
  Response: { ok: true, message: "Check your email" }

POST /api/auth/logout
  Response: { ok: true }  (clears cookie)

GET /api/auth/me
  Response: {
    user_id: uuid,
    email: string,
    name: string,
    role: "clinic_owner" | "clinic_admin" | "clinic_agent" | "clinic_viewer" | "operator_*",
    clinic_id: uuid | null,
    clinic_name: string | null,
    memberships: [{ clinic_id, clinic_name, role, is_primary }],
    entitlements: { max_patients: number|null, max_messages: number|null, ... },
    mode: "operator" | "client"
  }
  Errors: 401 Not authenticated

POST /api/auth/set-password
  Body: { password: string }  (for recovery flow)
  Response: { ok: true }

POST /api/auth/switch-clinic
  Body: { clinic_id: uuid }
  Response: { ok: true }  (updates active clinic in session)
  Guard: User must have active membership for that clinic
```

### Clinic

```
GET /api/clinic/current
  Response: {
    id, name, slug, logo_url, address, phone, email,
    settings: jsonb, plan, setup_status, onboarding_completed,
    setup_steps: { clinic_info, whatsapp_connected, ai_configured, ... }
  }

PUT /api/clinic/current
  Body: { name?, address?, phone?, email?, settings? }
  Guard: clinic_owner | clinic_admin
  Response: { ...updated clinic }

GET /api/clinic/current/ai-config
  Response: { tone, services[], faq[], languages[], booking_rules, auto_photos, auto_qualify }

PUT /api/clinic/current/ai-config
  Body: { ...partial config }
  Guard: clinic_owner | clinic_admin
```

### Patients

```
GET /api/patients?status=lead&search=ali&page=1&limit=25
  Response: {
    patients: [{ id, first_name, last_name, phone, email, status, source, consent_given, created_at }],
    total: number,
    page: number,
    pages: number
  }

GET /api/patients/:id
  Response: {
    ...patient,
    timeline: [{ id, type, text, created_at }],
    appointments: [...],
    invoices: [...],
    files: [...],
    lead: { stage, priority, assigned_to, value }
  }

POST /api/patients
  Body: { first_name, last_name, phone?, email?, source?, language? }
  Guard: clinic_owner | clinic_admin | clinic_agent
  Side effects: increment_usage('patients_created'), audit_log
  Response: { ...created patient }

PATCH /api/patients/:id
  Body: { ...partial patient }
  Guard: clinic_owner | clinic_admin | clinic_agent
  Response: { ...updated patient }

DELETE /api/patients/:id
  Guard: clinic_owner | clinic_admin
  Side effects: audit_log
```

### Conversations

```
GET /api/conversations?status=open&page=1&limit=30
  Response: {
    conversations: [{
      id, patient_id, patient_name, channel, status, control_mode,
      assigned_to, unread_count, last_message_at, last_message_preview
    }],
    total, page, pages
  }

GET /api/conversations/:id/messages?page=1&limit=50
  Response: {
    messages: [{ id, direction, channel, content, media_urls, status, sent_by, created_at }],
    total, page, pages
  }

POST /api/conversations/:id/messages
  Body: { content: string, channel?: "whatsapp" }
  Guard: clinic_owner | clinic_admin | clinic_agent
  Side effects:
    - Insert message (direction=outbound)
    - If channel=whatsapp: enqueue send_whatsapp_message job
    - Update conversation.last_message_at
    - audit_log
  Response: { ...created message }

POST /api/conversations/:id/takeover
  Body: { mode: "human" | "ai" }
  Guard: clinic_owner | clinic_admin | clinic_agent
  Side effects: Update control_mode, audit_log
  Response: { ok: true, control_mode }

POST /api/conversations/:id/resolve
  Guard: clinic_owner | clinic_admin | clinic_agent
  Side effects: Set status=resolved, audit_log
```

### Pipeline

```
POST /api/pipeline/move
  Body: { patient_id: uuid, to_stage: "new"|"contacted"|"booked"|"done"|"lost" }
  Guard: clinic_owner | clinic_admin | clinic_agent
  Side effects: Update lead.stage, audit_log, notification if "booked"
  Response: { ok: true, lead: { ...updated } }

GET /api/pipeline/stages
  Response: {
    stages: [
      { id: "new", label: "New", count: 12 },
      { id: "contacted", label: "Contacted", count: 8 },
      ...
    ]
  }
```

### Appointments

```
GET /api/appointments?from=2026-03-01&to=2026-03-31&status=scheduled
  Response: {
    appointments: [{ id, patient_id, patient_name, doctor_id, type, title, start_time, end_time, status, notes }],
    total
  }

POST /api/appointments
  Body: { patient_id, doctor_id?, type, title?, start_time, end_time, notes? }
  Guard: clinic_owner | clinic_admin | clinic_agent
  Side effects: audit_log, usage increment, notification
  Response: { ...created appointment }

PATCH /api/appointments/:id
  Body: { status?, start_time?, end_time?, notes? }
  Guard: clinic_owner | clinic_admin | clinic_agent
  State machine:
    scheduled → confirmed | cancelled
    confirmed → completed | cancelled | no_show
    cancelled → scheduled (reschedule)
  Side effects: audit_log

DELETE /api/appointments/:id
  Guard: clinic_owner | clinic_admin
```

### Automations

```
GET /api/automations
  Response: {
    automations: [{ id, name, trigger_type, trigger_config, action_type, action_config, is_active, last_run, run_count }]
  }

PATCH /api/automations/:id
  Body: { is_active?: boolean, trigger_config?, action_config? }
  Guard: clinic_owner | clinic_admin
  Response: { ...updated automation }
```

### Analytics

```
GET /api/analytics/summary?period=30d
  Response: {
    new_leads: { value: 47, change: +12 },
    consultations_booked: { value: 12, change: +3 },
    conversion_rate: { value: 25.5, change: +2.1 },
    surgeries_completed: { value: 8, change: +1 },
    whatsapp_conversations: { value: 89, change: +15 },
    estimated_revenue: { value: 48000, currency: "EUR", change: +8000 }
  }
```

### Storage

```
POST /api/uploads/signed-url
  Body: { file_name: string, content_type: string, patient_id?: uuid, category: string }
  Guard: clinic_owner | clinic_admin | clinic_agent
  Consent check: If category starts with "photo_", verify patient.consent_given
  Response: { upload_url: string, file_id: uuid, storage_path: string }

GET /api/storage/list?patient_id=xxx&category=photo_before
  Response: {
    files: [{ id, file_name, file_type, file_size, storage_path, category, created_at, download_url }]
  }
```

### Billing (Stripe-backed)

```
GET /api/billing/status
  Response: {
    plan: "pro",
    status: "active",
    current_period_end: "2026-04-15T00:00:00Z",
    cancel_at_period_end: false,
    payment_method: { brand: "visa", last4: "4242" },
    usage: {
      patients: { used: 47, limit: 400 },
      messages: { used: 1200, limit: 2000 },
      storage_mb: { used: 340, limit: 2000 }
    },
    invoices: [{
      id, amount: 39900, currency: "eur", status: "paid",
      period_start, period_end, hosted_invoice_url, invoice_pdf
    }]
  }

POST /api/billing/portal
  Response: { url: "https://billing.stripe.com/session/..." }
  (Stripe Customer Portal for payment method, invoice history)

POST /api/billing/change-plan
  Body: { new_price_id: string }
  Guard: clinic_owner
  Side effects: Stripe subscription update, audit_log
  Response: { ok: true, subscription: { ...updated } }

POST /api/billing/addons
  Body: { action: "add"|"remove", price_id: string }
  Guard: clinic_owner
  Response: { ok: true }

POST /api/billing/cancel
  Body: { immediately?: boolean }  (default: at period end)
  Guard: clinic_owner
  Response: { ok: true, cancel_at_period_end: true, current_period_end: "..." }
```

### Operator (Platform Admin)

```
GET /api/operator/clinics?search=&status=active&page=1
  Guard: operator_*
  Response: { clinics: [...], total }

GET /api/operator/clinics/:id/overview
  Guard: operator_*
  Response: { clinic, stats, recent_events }

POST /api/operator/clinics/:id/impersonate
  Body: { reason: string }
  Guard: operator_superadmin
  Side effects: audit_log (critical), time-limited session token
  Response: { session_token, expires_at }

GET /api/operator/provisioning
  Guard: operator_*
  Response: { pipeline: [...], stats: { applied, under_review, ... } }

PATCH /api/operator/provisioning/:id
  Body: { stage: "approved"|"rejected", rejection_reason? }
  Guard: operator_superadmin | operator_support
```

---

## D) Webhook Handler Outline

### Stripe Webhook (`server/src/webhooks/stripe.ts`)

```
POST /webhooks/stripe
  Headers: stripe-signature (verified)

  Flow:
    1. Verify webhook signature using STRIPE_WEBHOOK_SECRET
    2. Check idempotency: INSERT INTO webhook_events ... ON CONFLICT DO NOTHING
    3. If already processed → return 200
    4. Enqueue job: queue.add('process_stripe_event', { event_id, event_type, payload })
    5. Return 200 immediately

  Handled event types:
    checkout.session.completed →
      - Look up clinic from metadata.clinic_id
      - Create billing_customer record
      - Create subscription record
      - Update provisioning_pipeline.stage = 'payment_complete'
      - Resolve entitlements from price → plan mapping
      - Trigger provisioning job

    customer.subscription.created →
      - Upsert subscription record
      - Resolve + upsert entitlements
      - Reset usage counters for new period

    customer.subscription.updated →
      - Update subscription fields (status, period, cancel_at_period_end)
      - If plan changed: re-resolve entitlements
      - If cancel_at_period_end changed: notify clinic owner

    customer.subscription.deleted →
      - Update subscription.status = 'canceled'
      - Set entitlements to free tier
      - Audit log

    invoice.paid →
      - Upsert stripe_invoices record (status=paid, paid_at, urls)
      - Update subscription period dates
      - Reset usage counters for new billing period

    invoice.payment_failed →
      - Upsert stripe_invoices record (status=open)
      - Notify clinic owner
      - If past_due threshold exceeded: restrict features
```

### WhatsApp Webhook (`server/src/webhooks/whatsapp.ts`)

```
GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=XXX
  (Meta webhook verification challenge)

POST /webhooks/whatsapp
  Headers: X-Hub-Signature-256 (verified)

  Flow:
    1. Verify signature using APP_SECRET
    2. Parse Cloud API payload: entry[0].changes[0].value
    3. Extract: phone_number_id, from, message_id, text/media, timestamp
    4. Check idempotency: INSERT INTO webhook_events (provider='whatsapp', event_id=message_id)
    5. Enqueue: queue.add('process_whatsapp_event', { ... })
    6. Return 200 immediately

  Message types handled:
    text → Create message record (direction=inbound, channel=whatsapp)
    image/document →
      - Check consent_given for patient
      - If no consent: enqueue consent request message
      - If consent: download media → upload to storage → link to message
    interactive (button reply) → Parse button payload, route to automation
    status (delivered/read) → Update message.status

  Side effects (in job, not webhook):
    - Find or create patient by phone number
    - Find or create conversation
    - Insert message
    - Update conversation.last_message_at, unread_count
    - If control_mode = 'ai': forward to n8n workflow
    - Emit realtime event via Supabase for live CRM update
    - Browser notification via Supabase realtime
```

---

## E) Queue Job Definitions

All jobs use BullMQ with Redis. Each job type has:
- Named queue
- Retry policy (exponential backoff)
- Dead letter queue after max retries
- Structured logging with tenant_id

```
Queue: 'whatsapp'
  Job: process_whatsapp_event
    Data: { event_id, phone_number_id, from, message_id, text, media?, timestamp }
    Retries: 3 (backoff: exponential, delay: 5000)
    Steps:
      1. Lookup clinic by phone_number_id → clinic_id
      2. Find/create patient by from phone
      3. Find/create conversation
      4. Insert message record
      5. Update conversation metadata
      6. If media + consent: download + store
      7. If control_mode='ai': POST to n8n webhook
      8. Update webhook_events.status = 'processed'
    DLQ: 'whatsapp-dlq'

Queue: 'stripe'
  Job: process_stripe_event
    Data: { event_id, event_type, payload }
    Retries: 5 (backoff: exponential, delay: 10000)
    Steps: (see webhook handler outline above)
    DLQ: 'stripe-dlq'

Queue: 'reminders'
  Job: send_reminder
    Data: { appointment_id, clinic_id, patient_id, type: '24h'|'1h' }
    Retries: 2
    Steps:
      1. Load appointment + patient
      2. Check appointment not cancelled
      3. Resolve message template (language-aware)
      4. Send via WhatsApp provider
      5. Insert outbound message record
      6. Update appointment.reminder_sent = true

Queue: 'automations'
  Job: run_automation_step
    Data: { automation_id, trigger_data }
    Retries: 2
    Steps:
      1. Load automation config
      2. Check is_active
      3. Execute action (send message, update status, notify staff)
      4. Update automation.last_run, run_count++
      5. Insert automation_run log

Queue: 'billing'
  Job: reconcile_stripe
    Cron: '0 3 * * *' (daily at 3am)
    Steps:
      1. List all active billing_customers
      2. For each: fetch Stripe subscription, compare with DB
      3. Fix any drift (status, period dates, items)
      4. Log discrepancies to audit_log
      5. Re-resolve entitlements if changed

Queue: 'maintenance'
  Job: cleanup_retention
    Cron: '0 4 * * 0' (weekly Sunday 4am)
    Steps:
      1. Delete webhook_events older than 90 days
      2. Archive audit_log entries older than 1 year
      3. Clean up expired sessions
      4. Report storage usage per clinic
```

---

## F) Step-by-Step Build Order

Each step is independently deployable and testable. No step breaks existing functionality.

### Step 1: Server Foundation (Backend)
**Files:** `server/` directory, `docker-compose.yml`
**Goal:** Fastify server with auth middleware, health check, connection to existing Supabase
**Test:** `curl /health` → 200

1. Create `server/package.json` with fastify, @supabase/supabase-js, stripe, bullmq, ioredis
2. Create `server/src/index.ts` — Fastify server with CORS for CRM domain
3. Create `server/src/config.ts` — env var loader with validation
4. Create `server/src/db.ts` — Supabase service-role client (bypasses RLS for server)
5. Create `server/src/redis.ts` — Redis connection
6. Create `docker-compose.yml` with Redis service
7. Deploy server alongside existing CRM frontend

### Step 2: Auth Refactor
**Files:** `server/src/auth/`, `server/src/routes/auth.ts`, `src/stores/authStore.js`
**Goal:** httpOnly cookie sessions, /api/auth/me endpoint
**Test:** Login → cookie set → /api/auth/me returns user+role+clinic

1. Run migration `007_memberships.sql` — add memberships table
2. Backfill: For every user with clinic_id, create a membership row
3. Create `server/src/auth/session.ts` — cookie create/verify/clear
4. Create `server/src/auth/middleware.ts` — extract user from cookie
5. Create `server/src/auth/rbac.ts` — permission check helpers
6. Create `server/src/routes/auth.ts` — login, logout, me, magic-link, switch-clinic
7. Refactor `authStore.js` — call /api/auth/me on mount instead of localStorage restore
8. Remove localStorage token storage from `src/api/client.js`

### Step 3: Billing + Stripe Integration
**Files:** `server/src/routes/billing.ts`, `server/src/webhooks/stripe.ts`, `server/src/services/stripe.ts`
**Goal:** Real Stripe plan management, webhook processing
**Test:** Change plan → Stripe updates → webhook → DB mirrors correctly

1. Run migration `008_billing_tables.sql`
2. Run migration `009_entitlements.sql`
3. Run migration `010_webhook_idempotency.sql`
4. Create `server/src/services/stripe.ts` — Stripe SDK wrapper
5. Create `server/src/services/entitlements.ts` — plan → entitlement mapping
6. Create `server/src/routes/billing.ts` — status, portal, change-plan, addons, cancel
7. Create `server/src/webhooks/stripe.ts` — signature verify, enqueue
8. Create `server/src/jobs/processStripeEvent.ts` — idempotent event handler
9. Create `server/src/jobs/reconcileStripe.ts` — daily sync
10. Create new `src/stores/entitlementStore.js` — frontend usage tracking
11. Refactor `BillingView.jsx` — real Stripe data instead of demo
12. Refactor `AddonsView.jsx` — real add-on management

### Step 4: WhatsApp Event Pipeline
**Files:** `server/src/webhooks/whatsapp.ts`, `server/src/services/whatsapp.ts`
**Goal:** Inbound WhatsApp → job → DB → realtime → CRM UI
**Test:** Send WhatsApp to clinic number → appears in Inbox within 3 seconds

1. Run migration `011_conversations.sql`
2. Create `server/src/services/whatsapp.ts` — provider abstraction (Cloud API + 360dialog)
3. Create `server/src/webhooks/whatsapp.ts` — verify + enqueue
4. Create `server/src/jobs/processWhatsappEvent.ts` — full message processing
5. Refactor `inboxStore.js` — fetch from /api/conversations, not localStorage
6. Keep existing Supabase realtime subscription for live updates
7. Wire outbound messages: POST /api/conversations/:id/messages → enqueue send job

### Step 5: Remove Demo Data + API-First Loading
**Files:** CRM.jsx, all stores, demoData.js
**Goal:** Every screen loads from API. No demo data in production.
**Test:** Login → Dashboard shows real data from DB (or empty state)

1. Remove store initialization block from CRM.jsx (lines that seed CLINICS_INIT, etc.)
2. Add fetch calls in each store: `fetchPatients()`, `fetchAppointments()`, etc.
3. Add loading states to each view (skeleton loaders, not blank screens)
4. Gate demoData.js behind `import.meta.env.VITE_DEMO_MODE === 'true'`
5. Remove `isDemoMode` state and all branching logic from CRM.jsx
6. Remove DEMO_ACCOUNTS from auth flow
7. Remove resetAllData() and DATA_VERSION cleanup
8. Replace hardcoded "c1" in clinicStore with null (loaded from /api/auth/me)

### Step 6: Provisioning Pipeline
**Files:** `server/src/services/provisioning.ts`, migration 012
**Goal:** Apply → Approve → Pay → Provision → Onboard → Active
**Test:** Operator approves application → checkout link sent → payment → clinic created → first login wizard

1. Run migration `012_provisioning.sql`
2. Create `server/src/services/provisioning.ts` — automated setup steps
3. Create `server/src/routes/operator.ts` — provisioning management endpoints
4. Wire Stripe checkout.session.completed to trigger provisioning
5. Provisioning creates: clinic, default automations, storage prefix, entitlements
6. First login detects `onboarding_completed=false` → shows setup wizard (existing)
7. Setup wizard completion marks `onboarding_completed=true`

### Step 7: CRM.jsx Slim-Down
**Files:** CRM.jsx
**Goal:** Reduce from 1791 lines to ~400 (layout + routing + context bridge)
**Test:** All views still work identically

1. Move PDF generation (generatePDF, generateInvoicePDF) → `src/utils/pdfGenerators.js`
2. Move driver/logistics handlers → patientStore actions or new `logisticsStore.js`
3. Move payment/Stripe link handlers → billingStore actions
4. Move template resolver → `src/utils/templateResolver.js`
5. Move revenue export → `src/utils/exporters.js`
6. Move ApptDrawer → `src/components/Appointments/ApptDrawer.jsx`
7. Move CalMonth/CalDay → `src/components/shared/Calendar.jsx`
8. Move SystemStatus → `src/components/shared/SystemStatus.jsx`
9. Move nav definition → `src/data/navigation.js`
10. Move auth screens → `src/components/Auth/LoginScreen.jsx`, `RecoveryScreen.jsx`
11. CRM.jsx becomes: store hooks + context bridge + layout + view routing

### Step 8: Observability + Hardening
**Files:** `server/src/lib/logger.ts`, monitoring config
**Goal:** Structured logs, alerts, runbook
**Test:** Webhook failure → alert fires → operator sees in dashboard

1. Add structured logging to all server routes (tenant_id, user_id, request_id)
2. Add metrics: webhook_processed, queue_depth, message_latency, payment_failures
3. Add alerting thresholds in monitoring config
4. Create runbook for: replay webhook, rebuild usage, reconcile Stripe, impersonation
5. Add rate limiting to public endpoints (auth, webhooks)
6. Add CSRF protection for mutation endpoints
7. Audit all RLS policies for completeness

---

## RBAC Permission Matrix

| Module | clinic_owner | clinic_admin | clinic_agent | clinic_viewer | operator_superadmin | operator_support | operator_billing |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard (read) | Y | Y | Y | Y | Y | Y | Y |
| Inbox (read) | Y | Y | Y | Y | Y | Y | - |
| Inbox (send) | Y | Y | Y | - | Y | Y | - |
| Inbox (takeover) | Y | Y | Y | - | Y | Y | - |
| Pipeline (read) | Y | Y | Y | Y | Y | Y | - |
| Pipeline (move) | Y | Y | Y | - | Y | Y | - |
| Patients (read) | Y | Y | Y | Y | Y | Y | - |
| Patients (create/edit) | Y | Y | Y | - | Y | Y | - |
| Patients (delete) | Y | Y | - | - | Y | - | - |
| Appointments (read) | Y | Y | Y | Y | Y | Y | - |
| Appointments (manage) | Y | Y | Y | - | Y | Y | - |
| AI Control | Y | Y | - | - | Y | Y | - |
| Automations (read) | Y | Y | Y | Y | Y | Y | - |
| Automations (manage) | Y | Y | - | - | Y | - | - |
| Billing (read) | Y | Y | - | - | Y | Y | Y |
| Billing (manage) | Y | - | - | - | Y | - | Y |
| Settings | Y | Y | - | - | Y | Y | - |
| Audit Log | Y | Y | - | - | Y | Y | Y |
| Team (manage) | Y | Y | - | - | Y | - | - |
| Storage (upload) | Y | Y | Y | - | Y | Y | - |
| Storage (delete) | Y | Y | - | - | Y | - | - |
| Operator Panel | - | - | - | - | Y | Y | Y |
| Impersonate | - | - | - | - | Y | - | - |

---

## Environment Configuration

### Frontend (.env)
```
# Development
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PK=pk_test_...
VITE_DEMO_MODE=true

# Staging
VITE_API_URL=https://api-staging.flowmatix.io
VITE_STRIPE_PK=pk_test_...
VITE_DEMO_MODE=false

# Production
VITE_API_URL=https://api.flowmatix.io
VITE_STRIPE_PK=pk_live_...
VITE_DEMO_MODE=false
```

### Server (.env)
```
# Shared
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
COOKIE_DOMAIN=.flowmatix.io

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE=price_...
STRIPE_PRO_PRICE=price_...
STRIPE_PREMIUM_PRICE=price_...
STRIPE_ENTERPRISE_PRICE=price_...

# WhatsApp
WA_PHONE_NUMBER_ID=...
WA_ACCESS_TOKEN=...
WA_APP_SECRET=...
WA_VERIFY_TOKEN=...

# n8n
N8N_WEBHOOK_URL=https://n8n.flowmatix.io/webhook/

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

---

## Rate Limiting

### WhatsApp Message Throttling

Meta sperrt Nummern bei zu vielen Nachrichten. Server-seitige Rate Limits sind Pflicht.

**Strategie: Token Bucket per Clinic**

```
Clinic sends message → Server checks consume_rate_limit(clinic_id, 'whatsapp_messages')
                       → true  → send via Meta Cloud API
                       → false → 429 + queue for retry after refill
```

**Defaults per Plan:**

| Plan | Messages/Day | Messages/Hour | Burst (10s) |
|------|-------------|---------------|-------------|
| Starter | 250 | 30 | 5 |
| Pro | 1,000 | 80 | 15 |
| Premium | 2,000 | 150 | 25 |
| Enterprise | 5,000 | 400 | 50 |

**Server Middleware** (`server/src/middleware/rateLimit.ts`):
```typescript
// Per-clinic, per-action rate limiting via DB token bucket
async function checkRateLimit(clinicId: string, key: string, cost = 1) {
  const { data } = await supabase.rpc('consume_rate_limit', {
    p_clinic_id: clinicId,
    p_key: key,
    p_cost: cost,
  });
  if (!data) {
    throw new RateLimitError(key);  // → 429 response
  }
}

// WhatsApp-specific: also enforce burst protection
async function checkWaRateLimit(clinicId: string) {
  // 1. Check hourly bucket
  await checkRateLimit(clinicId, 'whatsapp_messages');
  // 2. Check burst bucket (short interval, prevents spam)
  await checkRateLimit(clinicId, 'whatsapp_burst');
}
```

**Provisioning:** When a clinic is created, insert rate_limits rows based on plan:
```sql
INSERT INTO rate_limits (clinic_id, key, max_tokens, refill_rate, refill_interval, current_tokens)
VALUES
  (NEW.id, 'whatsapp_messages', 80, 80, '1 hour', 80),
  (NEW.id, 'whatsapp_burst', 15, 15, '10 seconds', 15),
  (NEW.id, 'api_requests', 5000, 5000, '1 hour', 5000);
```

**Plan Upgrade:** Update max_tokens + refill_rate via `PATCH /api/v1/operator/clinics/:id/rate-limits`.

### API Rate Limiting

Standard per-IP + per-clinic limits via Redis (not DB):

```typescript
// Redis-backed sliding window (no DB round-trip)
const apiLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  keyGenerator: (req) => req.clinicId || req.ip,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => PLAN_API_LIMITS[req.clinicPlan] || 1000,
});
```

---

## Feature Flags

### Design

Feature Flags = "kann diese Klinik Feature X nutzen?"

Separate von Entitlements (usage limits). Feature Flags sind boolean toggles.

**Sources (Priorität):**
1. `manual` — Operator override (höchste Prio)
2. `trial` — Zeitlich begrenzt (expires_at)
3. `addon` — Separat gekauft (Stripe line item)
4. `plan` — Im Abo enthalten (niedrigste Prio)

**Resolution:**
```sql
SELECT enabled FROM feature_flags
WHERE clinic_id = $1 AND flag = $2
  AND (expires_at IS NULL OR expires_at > now())
ORDER BY CASE source
  WHEN 'manual' THEN 0
  WHEN 'trial' THEN 1
  WHEN 'addon' THEN 2
  WHEN 'plan' THEN 3
END
LIMIT 1;
```

### Available Flags

| Flag | Description | Starter | Pro | Premium | Enterprise |
|------|-------------|---------|-----|---------|------------|
| `multi_language` | Multi-language AI + UI | ✓ | ✓ | ✓ | ✓ |
| `custom_branding` | Custom logo, colors, email templates | ✗ | ✓ | ✓ | ✓ |
| `api_access` | REST API access | ✗ | ✓ | ✓ | ✓ |
| `custom_webhooks` | Custom webhook endpoints | ✗ | ✓ | ✓ | ✓ |
| `flight_tracking` | Flight tracking + airport pickup | ✗ | ✗ | ✓ | ✓ |
| `driver_dispatch` | Driver dispatch system | ✗ | ✗ | ✓ | ✓ |
| `analytics_pro` | Advanced analytics + reports | ✗ | ✗ | ✓ | ✓ |
| `priority_support` | Priority support queue | ✗ | ✗ | ✓ | ✓ |
| `white_label` | Full white-label (no Flowmatix branding) | ✗ | ✗ | ✗ | ✓ |
| `sso` | SSO / SAML authentication | ✗ | ✗ | ✗ | ✓ |

### Frontend Guard

```jsx
// In any component:
const { hasFeature } = useEntitlementStore();

// Conditional render
{hasFeature('flight_tracking') && <FlightTracker patient={patient} />}

// Gate with upgrade prompt
if (!hasFeature('analytics_pro')) {
  return <UpgradePrompt feature="analytics_pro" />;
}
```

### Provisioning Flow

When a clinic subscribes or upgrades:
1. Stripe webhook `customer.subscription.updated` fires
2. Server resolves plan → feature list from `FEATURE_FLAGS` constant
3. Upsert `feature_flags` rows with `source: 'plan'`
4. Upsert `rate_limits` rows with plan defaults
5. Frontend `useEntitlementStore.initialize()` refreshes on next load

### Operator Add-on Override

Operators can grant any feature manually:
```
POST /api/v1/operator/clinics/:id/feature-flags
{ "flag": "analytics_pro", "enabled": true, "source": "manual" }
```

This overrides plan-based flags (manual has highest priority).

### Trial System

Operators can grant time-limited trials:
```
POST /api/v1/operator/clinics/:id/feature-flags
{ "flag": "flight_tracking", "enabled": true, "source": "trial", "expires_at": "2026-04-01" }
```

Expired trials auto-disable (DB function checks `expires_at > now()`).
