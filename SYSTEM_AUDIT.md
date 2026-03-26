# FLOWMATIX CRM — COMPLETE SYSTEM AUDIT
**Date:** 2026-03-10
**Auditor:** Claude Code (Automated Deep Audit)
**Server:** 91.99.78.93 | **Status:** PRODUCTION LIVE

---

## PHASE 1: FULL SYSTEM DISCOVERY

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       TRAEFIK (SSL/TLS)                         │
│                    ports 80, 443 (public)                       │
└──────┬──────────────────────────────────────────────────────────┘
       │
   ┌───┴───────────────────────────────┬───────────────┬──────────┐
   │                                   │               │          │
   ▼                                   ▼               ▼          ▼
┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐
│  fm-api     │  │  fm-app      │  │  fm-n8n  │  │   fm-web    │
│ (Fastify)   │  │  (Nginx+SPA) │  │ (engine) │  │  (static)   │
│  :4000      │  │    :80       │  │  :5678   │  │    :80      │
│ 68 route    │  │ React18 SPA  │  │ 9 templ  │  │ Marketing   │
│ files       │  │ 24 views     │  │ 8 active │  │ landing     │
└────┬────────┘  └──────────────┘  └──────────┘  └─────────────┘
     │
     ├──────────────────────────────────────────────────┐
     │                                                  │
     ▼                                                  ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────┐
│ fm-worker    │  │ fm-postgres  │  │  fm-redis   │
│ (BullMQ)     │  │ (Port 5432)  │  │ (Port 6379) │
│ 6 queues     │  │ 54 tables    │  │ Bull queues │
│ 9 processors │  │ 250+ indexes │  │ Sessions    │
└──────────────┘  └──────────────┘  └─────────────┘
```

**19 Running Containers:**
- **Core:** fm-api, fm-app, fm-worker, fm-postgres, fm-redis, fm-n8n, fm-web, fm-traefik
- **Monitoring:** fm-grafana, fm-prometheus, fm-loki, fm-promtail, fm-alertmanager, fm-node-exporter, fm-cadvisor
- **Status:** fm-uptime-kuma (⚠️ UNHEALTHY for 2 days)
- **Staging:** fm-staging-api, fm-staging-worker, fm-staging-app

### 1.2 Frontend (React 18 SPA)

| Aspect | Detail |
|--------|--------|
| Entry Point | `/src/CRM.jsx` (1,982 lines — monolithic) |
| Routing | State machine (`view` + `opSubTab`) — NO React Router |
| State | Zustand (8 stores) + AppContext (100+ values) |
| API Client | 122 functions in `client.js` (1,225 lines) |
| Views | 24 main views + 15 operator sub-tabs |
| i18n | 7 languages, custom `t()` function |
| Real-time | **NONE** — fetch-on-demand only |
| Build | Vite, served via Nginx container |

**Component Sizes (Risk):**
| File | Lines | Risk |
|------|-------|------|
| OperatorPanel.jsx | 2,781 | 🔴 God component |
| CRM.jsx | 1,982 | 🔴 Monolithic entry |
| SetupView.jsx | 1,343 | 🟠 Complex wizard |
| client.js | 1,225 | 🟠 Huge API client |
| PatientPanel.jsx | 625 | 🟡 Large |
| DashboardView.jsx | 478 | 🟡 Large |

### 1.3 Backend (Fastify + BullMQ Workers)

| Aspect | Detail |
|--------|--------|
| Framework | Fastify (TypeScript) |
| Route Files | 68 files, 210+ endpoints |
| Workers | 9 processors on BullMQ/Redis |
| Auth | JWT (access + refresh) + httpOnly cookies + single-session enforcement |
| RBAC | Database-driven permissions (api_permissions table, 5-min cache) |
| Internal API | `INTERNAL_API_KEY` header (timing-safe comparison) for n8n↔API |
| LLM | OpenAI (default) + Anthropic Claude (preferred) |
| Input Validation | ⚠️ Only auth routes use Zod — all other routes have NO validation |
| State Machine | 30+ flow states, optimistic locking, idempotency via wa_message_id |

**Worker Queues & Concurrency:**
| Queue | Processor | Concurrency |
|-------|-----------|-------------|
| `webhook-processing` | processWebhook | 10 |
| `message-send` | processMessageSend | 5 |
| `ai-response` | processAIResponse | 3 |
| `conversation` | processConversation | 5 |
| `reminder` | processAutomation | 1 |
| `provisioning` | processProvisioning | 2 |
| `export` | processExport | 2 |
| `email` | processEmail | 3 |

**Lib Utilities (16 files):**
audit.ts, circuit-breaker.ts, conversation-engine.ts, cookie-auth.ts, crypto.ts (AES-256-GCM), demo-mode.ts, email.ts (i18n templates), enforce-entitlement.ts, errors.ts, google.ts, google-calendar.ts, google-drive.ts, google-sheets.ts, idempotency.ts, queue.ts, stripe.ts

### 1.4 Database (PostgreSQL 16)

| Aspect | Detail |
|--------|--------|
| Tables | 54 total |
| Indexes | 250+ (96 unused!) |
| Foreign Keys | 91 FK relationships |
| Enum Types | 12 custom types |
| JSONB Columns | 45 across tables |
| Views | 4 custom + 2 system |
| Migrations | 13 deployed |

**Row Counts (Key Tables):**
| Table | Rows | Status |
|-------|------|--------|
| queue_jobs | 3,126 | Heavy |
| events | 2,442 | Heavy |
| idempotency_keys | 2,295 | Heavy |
| webhook_events | 2,292 | Heavy |
| audit_log | 2,116 | Active |
| action_executions | 750 | Active |
| platform_metrics | 565 | Active |
| conversation_messages | 293 | Active |
| page_views | 224 | Active |
| sessions | 123 | Active |
| files | 54 | Active |
| conversation_photos | 43 | Active |
| patients | 19 | Production |
| treatment_types | 19 | Active |
| appointments | 11 | Production |
| tasks | 11 | Production |
| conversations | 6 | Production |
| users | 6 | Production |
| organizations | 2 | Production |

**21 Empty Tables (Features not in use):**
aftercare_messages, aftercare_templates, alert_events, api_keys, backup_records, clinic_automations, clinic_documents, data_requests, deployment_events, drivers, file_uploads, flight_bookings, job_failures, outreach_leads, patient_reviews, provisioning_templates, restore_drills, subscription_plans, tenant_rate_limits, whatsapp_connection_events, billing_events

### 1.5 External Integrations

| Integration | Status | Protocol | Notes |
|-------------|--------|----------|-------|
| WhatsApp/Meta | ⚠️ Partial | Cloud API v21.0 | .env has PLACEHOLDER values! Works via n8n credentials |
| Stripe | ✅ Live | sk_live + webhooks | Live keys configured |
| Google Drive | ✅ Live | OAuth2 | Client ID + Secret configured |
| Google Calendar | ✅ Live | OAuth2 | Bi-directional sync |
| Google Sheets | ✅ Live | OAuth2 | Export function |
| OpenAI | ✅ Live | API key | sk-proj-* key present |
| Anthropic | ✅ Live | API key | sk-ant-api03-* key present |
| SMTP (Zoho) | ✅ Live | smtp.zoho.eu:587 | STARTTLS, info@flowmatix.io |
| n8n | ✅ Live | 27 workflows total | 8 mapped in API, many more active |
| Telegram | ✅ Live | Bot API | ⚠️ Single token reused for 3 purposes |
| Cloudflare | ✅ Live | DNS API | SSL cert automation |
| Backblaze B2 | ❌ Not configured | — | Backup scripts run but no off-site storage! |
| Supabase | ❌ Not configured | — | Referenced in docker-compose but missing from .env |

### 1.6 Infrastructure

| Aspect | Detail |
|--------|--------|
| Disk | 150G total, 69G used (48%) |
| SSL | Let's Encrypt via Cloudflare DNS challenge, TLS 1.2+, HSTS 2yr |
| Rate Limiting | API: 100/min, Webhooks: 500/min, Auth: 10/min |
| Networks | fm-proxy (public), fm-internal (DB+Redis isolated) |
| Monitoring | Grafana + Prometheus + Loki + Promtail + Alertmanager + cAdvisor |
| Backups | Daily 03:00, Weekly Sun 04:00, Monthly 1st 05:00 (local only!) |
| Cron | Docker prune weekly, file cleanup daily |
| Resource Limits | All containers have CPU+RAM limits set |

### 1.7 n8n Workflows (27 Total)

**API-Mapped (8 in N8N_WORKFLOW_MAP):**
| Workflow | ID | Trigger |
|----------|----|---------|
| booking_confirm | wf_patient-welcome | On booking |
| aftercare | OhnmvM0iUODaQQKA | Post-appointment |
| appt_reminder | YonGtp2bbA8ojAAP | 24h before appt |
| deposit_followup | wf_ (incomplete!) | Payment pending |
| flight_tracking | ftvision01 | Flight booked |
| driver_notify | zh1ie2bs7Io5V2Bl | Driver assigned |
| noshow | 17Pf43VM5axbQzeW | No-show detected |
| review_request | G10EBtx31ZwTYHDL | Post-procedure |

**Other Active Workflows (19):**
Production WhatsApp Flow (Multi-Tenant) v2, Subscription Expiry + Deactivation (Daily), WA Reminders + No-show Engine, Aftercare Messages, Platform Metrics Snapshot (5min), Stale Conversation Follow-Up, Plan Enforcement (Hourly), Payment Overdue Check (Daily), Global Error Handler, Clinic Provisioning, Send Router (Telegram/WhatsApp), Telegram Inbound Bridge, Flight Ticket Vision AI, Staff Analysis Response Webhook, [haarklinik-oldenburg] Automation, [hair-of-sunshine] Automation, Demo Telegram (Istanbul Hair Clinic), Patienten-Willkommen, Patienten-Nachverfolgung (24h)

---

## PHASE 2: END-TO-END CONNECTION AUDIT

### 2.1 WhatsApp Message Flow (VERIFIED WORKING)
```
Patient → Meta Cloud API → POST /webhooks/whatsapp
  → HMAC verify → idempotency check → enqueue webhook-processing
  → Worker: parse message → update conversation → enqueue ai-response
  → Worker: call LLM (OpenAI/Anthropic) → generate reply → enqueue message-send
  → Worker: POST graph.facebook.com → send read receipt → store in DB
```
**Issues Found:**
- ⚠️ No WebSocket/SSE — CRM users must refresh to see new messages
- ⚠️ `deposit_followup` workflow ID is incomplete (`wf_`)

### 2.2 Stripe Payment Flow (VERIFIED WORKING)
```
User selects plan → Stripe Checkout session → redirect to Stripe
  → Payment → webhook POST /webhooks/stripe → signature verify
  → enqueue webhook-processing → update org plan + features
  → send email notification
```

### 2.3 Patient Intake Flow
```
WhatsApp message → conversation created (flow_state: EMPTY)
  → AI asks intake questions → extracted_fields populated
  → Photos requested → conversation_photos stored → Drive upload
  → flow_state transitions through: EMPTY → AWAITING_INPUT → PHOTO_COLLECTION → COMPLETE
  → Task created for medical review
```

### 2.4 Google Drive Photo Flow (FIXED RECENTLY)
```
Photo received via WhatsApp → media downloaded → enqueue Drive upload
  → ensurePatientFolder (with lock to prevent duplicates)
  → Upload to Drive → store drive_file_id in files table
```

---

## PHASE 3: FEATURE-BY-FEATURE AUDIT

### ✅ Working Features
| Feature | Frontend | Backend | DB | Status |
|---------|----------|---------|-----|--------|
| Patient list/search | getPatients() | /crm/patients | patients | ✅ |
| Patient detail/edit | updatePatient() | PATCH /crm/patients/:id | patients | ✅ |
| WhatsApp inbox | getConversations() | /crm/conversations | conversations + messages | ✅ |
| Send message | sendCrmMessage() | POST /crm/conversations/:id/messages | conversation_messages | ✅ |
| Appointments CRUD | getAppointments() | /crm/appointments | appointments | ✅ |
| AI bot responses | (automatic) | ai-response.processor | conversations | ✅ |
| Google Drive files | getDriveFiles() | /drive/files | files | ✅ |
| Stripe billing | getMySubscription() | /billing/subscription | subscriptions | ✅ |
| Settings/config | getClinicSettings() | /clinic/settings | organizations | ✅ |
| Audit log | getAuditLog() | /ops/audit-log | audit_log | ✅ |
| Team management | getStaff() | /crm/clinic/staff | staff_members + users | ✅ |
| Treatment types | getTreatments() | /crm/clinic/treatments | treatment_types | ✅ |
| Bot config | getBotConfig() | /crm/clinic/bot-config | clinic_agent_config | ✅ |
| Booking funnel | metadata API | /clinic/settings | organizations.metadata | ✅ |
| Dashboard stats | getMyClinic() | /clinic/settings | v_clinic_dashboard | ✅ |
| Auto-translate | translateBatch() | /crm/translate/batch | (Anthropic API) | ✅ |
| Photo review tasks | (auto-created) | ai-response.processor | tasks | ✅ |

### ⚠️ Partially Working / Issues
| Feature | Issue | Severity |
|---------|-------|----------|
| Real-time messages | No WebSocket — must refresh | 🔴 HIGH |
| Pipeline/Kanban | Works but inline in CRM.jsx | 🟡 LOW |
| Payment links | TODO in code — Stripe link generation incomplete | 🟠 MEDIUM |
| Demo mode toggle | Demo data hardcoded alongside real data | 🟠 MEDIUM |
| Analytics | Component exists, unclear if data populates | 🟡 LOW |
| Revenue/Invoices | CRUD works, PDF generation is local-only | 🟡 LOW |

### ❌ Empty / Not Implemented Features
| Feature | Frontend | Backend | DB Rows | Status |
|---------|----------|---------|---------|--------|
| Aftercare messages | UI exists | Templates exist | 0 rows | ❌ Not configured |
| Patient reviews | UI exists | Endpoint exists | 0 rows | ❌ Not used |
| Outreach leads | Operator tab | Endpoint exists | 0 rows | ❌ Not used |
| Flight bookings | UI references | Schema exists | 0 rows | ❌ Not used |
| Drivers | UI references | Schema exists | 0 rows | ❌ Not used |
| API keys | Operator tab | Endpoint exists | 0 rows | ❌ Not configured |
| Backup system | Operator tab | Schema exists | 0 rows | ❌ Not running |
| GDPR data requests | Code references | Schema exists | 0 rows | ❌ Not used |
| Voice transcription | Feature flag exists | Code stub | N/A | ❌ Incomplete |
| Clinic automations | AutomationsView | Endpoint exists | 0 rows | ❌ Not configured |

---

## PHASE 4: N8N WORKFLOW AUDIT

| Workflow | Status | Issue |
|----------|--------|-------|
| booking_confirm | ✅ Active | — |
| aftercare | ✅ Active | DB tables empty (0 aftercare_messages) |
| appt_reminder | ✅ Active | — |
| deposit_followup | ⚠️ BROKEN | Workflow ID is `wf_` (empty/incomplete) |
| flight_tracking | ✅ Active | No flight_bookings data (0 rows) |
| driver_notify | ✅ Active | No drivers data (0 rows) |
| noshow | ✅ Active | — |
| review_request | ✅ Active | No patient_reviews data (0 rows) |

**Internal API Endpoints (n8n → API):**
| Endpoint | Purpose | Status |
|----------|---------|--------|
| /internal/wa/send | Send WhatsApp | ✅ |
| /internal/wa/upload-media | Upload to Drive | ✅ |
| /internal/conversation/transition | State change | ✅ |
| /internal/aftercare-reviews | Aftercare (6h cron) | ⚠️ No data |
| /internal/conversation-followup | Stale follow-up (2h) | ✅ |
| /internal/metrics/snapshot | Metrics (5min) | ✅ |
| /internal/appointment-reminders | Reminder check | ✅ |

---

## PHASE 5: BUTTONS / ACTIONS / UX TRUTH AUDIT

### Frontend Actions — Real vs Fake

| Button/Action | Calls API? | Actually Works? | Notes |
|---------------|-----------|-----------------|-------|
| Send Message | ✅ POST | ✅ Yes | Optimistic update + sync |
| Move Lead (Kanban drag) | ✅ PATCH | ✅ Yes | Updates patient stage |
| Create Appointment | ✅ POST | ✅ Yes | — |
| Update Patient | ✅ PATCH | ✅ Yes | — |
| Take Over (human handoff) | ✅ PATCH | ✅ Yes | Fixed recently (leadId→patientId) |
| Reopen Conversation | ✅ PATCH | ✅ Yes | Fixed recently (flow_state reset) |
| Change Language | ✅ PATCH | ✅ Yes | Fixed recently (DB sync) |
| Toggle Automation | ✅ PATCH | ✅ Yes | n8n activate/deactivate |
| Generate PDF | ❌ Local | ⚠️ Partial | Inline HTML, no API |
| Send Payment Link | ⚠️ TODO | ⚠️ Partial | Stripe link gen incomplete |
| Export to Sheets | ✅ POST | ✅ Yes | — |
| Upload File | ✅ POST | ✅ Yes | Multipart to Drive |
| Delete File | ✅ DELETE | ✅ Yes | — |
| AI Support Chat | ✅ POST | ✅ Yes | Streaming response |
| Reset Demo Data | ✅ POST | ✅ Yes | — |
| Simulate Lead | ✅ POST | ✅ Yes | — |
| Subscribe to Plan | ✅ POST | ✅ Yes | Stripe Checkout |
| Cancel Subscription | ✅ DELETE | ✅ Yes | — |
| Impersonate Clinic | ✅ POST | ✅ Yes | Platform owner only |
| Suspend Clinic | ✅ POST | ✅ Yes | Platform owner only |

### Demo Data Contamination
- 2,000+ lines of hardcoded demo data in CRM.jsx
- Demo enrichment creates fake patients, conversations, appointments, invoices
- `is_demo` flag exists but demo/live mixing is risky
- Comment says `/* demoData removed */` but demo data is STILL THERE

---

## PHASE 6: CONSISTENCY & ARCHITECTURE AUDIT

### 6.1 Critical Architecture Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| **aftercare-reviews.ts NOT REGISTERED** | 🔴 CRITICAL | Route file exists but never loaded in server.ts — n8n calls return 404 |
| **WhatsApp webhook sig bypass** | 🔴 CRITICAL | Signature verification skipped when META_APP_SECRET is placeholder |
| **WA access_token leaked in plaintext** | 🔴 CRITICAL | aftercare-reviews returns raw token instead of encrypted+decrypted |
| **`src/src/` directory confusion** | 🔴 CRITICAL | CRM.jsx imports resolve to `src/src/` — outer `src/` is stale dead code |
| **markResolved() never persists** | 🔴 CRITICAL | Resolving conversations only updates local state, not API |
| **No real-time messaging** | 🔴 CRITICAL | Users don't see new messages without refresh |
| **Backups only local (no off-site)** | 🔴 CRITICAL | Backblaze B2 not configured — disk failure = data loss |
| **Uptime Kuma UNHEALTHY** | 🔴 HIGH | Status monitoring down for 2 days |
| **n8n "insights" error spam** | 🔴 HIGH | Duplicate key constraint errors filling logs continuously |
| **No input validation on API routes** | 🔴 HIGH | Only auth uses Zod; all CRM/ops routes accept raw body |
| **REMINDER queue wrong processor** | 🟠 HIGH | processReminder imported but unused — queue uses processAutomation |
| **ReviewPanel crashes on mount** | 🟠 HIGH | Calls 4 non-existent API methods |
| **CRM.jsx monolith (1,982 lines)** | 🟠 HIGH | Unmaintainable, all state computed here |
| **OperatorPanel.jsx (2,781 lines)** | 🟠 HIGH | 15 sub-views in one file |
| **Hardcoded cookie secret fallback** | 🟠 HIGH | `'flowmatix-cookie-secret'` if SESSION_SECRET missing |
| **RBAC bypass on ops routes** | 🟠 HIGH | /ops/applications and /ops/outreach skip RBAC |
| **withTenant() RLS never used** | 🟠 HIGH | Tenant isolation relies on manual WHERE clause per query |
| **Photo data stored as base64 in DB** | 🟠 MEDIUM | 14MB for 43 photos in conversation_photos.photo_data |
| **Meta/WhatsApp env placeholders** | 🟠 MEDIUM | .env still has `REPLACE_WITH_*` for Meta vars |
| **Demo data mixed with real** | 🟠 MEDIUM | Data contamination risk |
| **deposit_followup workflow broken** | 🟠 MEDIUM | Workflow ID incomplete |
| **5 dead frontend components** | 🟡 MEDIUM | BillingView, InvoicingView, AISupportWidget, ThemeToggle, ReviewPanel |
| **Redis connection leak in ai-response** | 🟡 MEDIUM | New Redis() per photo debounce, not reused |
| **Stripe price IDs hardcoded in source** | 🟡 MEDIUM | Should be in env or DB |
| **Client-side invoice numbering** | 🟡 MEDIUM | Array.length-based = duplicates under concurrency |
| **traefik:latest and n8n:latest tags** | 🟡 MEDIUM | Unpinned versions risk breakage |
| **WebSocket reconnect churn** | 🟡 LOW | Reconnects every ~6s per client |
| **11 .bak files + stale src/ directory** | 🟡 LOW | Dev clutter, misleading code |
| **No React Router** | 🟡 LOW | No URL-based navigation |

### 6.2 Security Observations

| Aspect | Status | Notes |
|--------|--------|-------|
| JWT auth | ✅ | Access + refresh + httpOnly cookies + single-session enforcement |
| Webhook HMAC | ✅ | WhatsApp + Stripe verified (timing-safe) |
| CORS | ✅ | Restricted to flowmatix.io domains |
| Rate limiting | ✅ | Traefik (100/min API, 500/min webhooks, 10/min auth) |
| SQL injection | ✅ | Parameterized queries throughout — no string concat |
| Container security | ✅ | read_only FS, no-new-privileges, tmpfs mounts |
| Network isolation | ✅ | DB + Redis on internal-only network |
| Account lockout | ✅ | 10 failed attempts → lock |
| Encryption at rest | ✅ | AES-256-GCM for secrets (crypto.ts) |
| DB isolation | ⚠️ | org_id on tables, but withTenant() RLS not used |
| Input validation | ⚠️ | Only auth routes validated; everything else raw |
| RBAC | ⚠️ | DB-driven but some routes bypass it |
| Secrets management | ⚠️ | .env plaintext — all keys in one file |
| MFA | ⚠️ | Schema exists but not enforced |
| Cookie secret | ⚠️ | Hardcoded fallback in server.ts |
| Off-site backups | ❌ | B2 not configured |

### 6.3 Data Consistency Issues

| Issue | Tables Affected | Risk |
|-------|----------------|------|
| conversations.patient_id nullable | conversations | Orphaned conversations possible |
| appointments without treatment_type | appointments | 11 records missing type |
| No JSONB validation | 45 JSONB columns | Schema drift |
| No GIN indexes on JSONB | patients.metadata, events.payload | Slow queries |
| High sequential scans | events (1M+ seq scans) | Performance |

### 6.4 Naming Inconsistencies

| Frontend | Backend | DB Column | Issue |
|----------|---------|-----------|-------|
| `leadId` | `patientId` | `patient_id` | Lead vs Patient naming mixed |
| `selChat.leadId` | response.patientId | — | Required `\|\|selChat.patientId` fallback |
| `control_mode: 'bot'` | `control_mode: 'ai'` | `control_mode` | 'bot' vs 'ai' inconsistent |
| `conversation_state` | `flow_state` | Both exist | Two state fields, different meanings |

---

## PHASE 7: PRIORITY-RANKED FIX LIST

### 🔴 P0 — Critical (Fix Immediately)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | **Configure off-site backups (Backblaze B2)** | Disk failure = total data loss, backups are local only | LOW |
| 2 | **Register aftercare-reviews.ts in server.ts** | Route file exists but is NEVER registered — n8n calls to `/internal/aftercare/*` and `/internal/reviews/*` return 404. Aftercare + review workflows are completely broken | LOW |
| 3 | **Fix WhatsApp webhook signature bypass** | When META_APP_SECRET is unset/placeholder, signature verification is SKIPPED — anyone can forge webhook events | LOW |
| 4 | **Fix plaintext WA access_token leak** | aftercare-reviews.ts returns `wc.access_token` in plaintext instead of using `access_token_encrypted` + decrypt() — token exposed to n8n logs | LOW |
| 5 | **Fix `src/src/` directory structure** | CRM.jsx imports from `./src/...` resolving to `src/src/...` — outer `src/` files are STALE COPIES not actually used. 1.7MB of misleading dead code | MEDIUM |
| 6 | **Fix inboxStore.markResolved()** | Only updates local state — NEVER calls API to persist. Resolving conversations does not save | LOW |
| 7 | **Fix Uptime Kuma** | Status monitoring down for 2 days, needs initial setup | LOW |
| 8 | **Fix n8n insights error spam** | Duplicate key errors flooding logs continuously | LOW |
| 9 | **Add WebSocket/SSE for real-time messages** | Users miss incoming messages, must refresh constantly | HIGH |
| 10 | **Fix deposit_followup workflow ID** | n8n workflow `wf_` is incomplete, deposit reminders broken | LOW |
| 11 | **Add Zod input validation to all API routes** | No type/format validation on CRM/ops endpoints — security gap | MEDIUM |

### 🟠 P1 — High Priority (Fix This Week)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 12 | **Fix REMINDER queue processor mapping** | `processReminder` imported but unused — queue uses `processAutomation`. Appointment reminders may not fire | LOW |
| 13 | **Fix/remove ReviewPanel component** | Calls 4 non-existent API methods (getReviews, getReviewPhotos, updateReview, sendQuote) — will crash if mounted | LOW |
| 14 | **Remove hardcoded cookie secret fallback** | `'flowmatix-cookie-secret'` used if SESSION_SECRET missing | LOW |
| 15 | **Fix RBAC bypass on ops routes** | /ops/applications & /ops/outreach skip RBAC entirely | LOW |
| 16 | **Fix Meta/WhatsApp env placeholders** | .env still has REPLACE_WITH_* — API/worker WA features may not work | LOW |
| 17 | **Fix Redis connection leak in ai-response** | New Redis() per photo debounce under load | LOW |
| 18 | **Pin traefik and n8n Docker image versions** | `:latest` tags risk uncontrolled breakage | LOW |
| 19 | **Move photo_data out of database** | conversation_photos stores base64 inline — 14MB for 43 photos. Use Drive/object storage | MEDIUM |
| 20 | **Move Stripe price IDs to env/DB** | Live price IDs hardcoded in source code | LOW |
| 21 | **Split CRM.jsx into proper route components** | 1,982-line monolith, unmaintainable | HIGH |
| 22 | **Split OperatorPanel.jsx into sub-components** | 2,781-line God component | HIGH |
| 23 | **Move invoice number generation server-side** | Client-side generation from array length = duplicates under concurrency | LOW |

### 🟡 P2 — Medium Priority (Fix This Month)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 24 | **Use withTenant() RLS consistently** | Manual WHERE org_id in every query — one miss = data leak | MEDIUM |
| 25 | **Remove dead components** | BillingView (imported never rendered), InvoicingView, AISupportWidget, ThemeToggle, useTheme hook — all dead code | LOW |
| 26 | **Clean up duplicate/stale files** | 11 .bak files + `src/src/` stale directory + demoData.js/demoSeed.js unused | LOW |
| 27 | **Remove/isolate demo data from CRM.jsx** | 2,000+ lines mixed with production code | MEDIUM |
| 28 | **Consolidate file_uploads vs files tables** | Two file-tracking tables, file_uploads has 0 rows | LOW |
| 29 | **Remove duplicate DB indexes** | idx_page_views_created, idx_api_keys_hash, idx_wh_events_idempotency are all redundant | LOW |
| 30 | **Make conversations.patient_id NOT NULL** | Prevent orphaned conversations | LOW |
| 31 | **Add payment link generation** | TODO in code, Stripe checkout incomplete | MEDIUM |
| 32 | **Add React Router for URL navigation** | No back button, no deep linking | HIGH |
| 33 | **Standardize lead/patient naming** | Frontend uses both terms inconsistently | MEDIUM |
| 34 | **Add missing DB indexes** | events.patient_id, events.appointment_id, conversation_photos.patient_id | LOW |
| 35 | **Fix WebSocket reconnection churn** | ~6s reconnect cycle generates excessive log volume | LOW |
| 36 | **Separate Telegram bot tokens** | One token for alerts + demo + main = single point of failure | LOW |
| 37 | **Deduplicate API methods** | subscribeToPlan and changePlan hit same endpoint; createInvoice exists in both CRM.jsx and billingStore | LOW |

### 🟢 P3 — Low Priority (Backlog)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 38 | Fix TOCTOU in alert acknowledge (DB update before org check) | Edge case security | LOW |
| 39 | Standardize control_mode values ('bot' vs 'ai') | Inconsistent naming | LOW |
| 40 | Remove dead processReminder import | Unused code in worker.ts | LOW |
| 41 | Extract parseExpiry() to shared utility | Duplicated 3x across auth routes | LOW |
| 42 | Record migration 014 in _migrations table | Applied but not tracked | LOW |
| 43 | Configure aftercare templates | Feature exists but 0 data | LOW |
| 44 | Configure review request flow | 0 rows, workflow active but unused | LOW |
| 45 | Move secrets to vault (Docker secrets) | All keys in plaintext .env | MEDIUM |
| 46 | Enforce MFA for admin users | Security hardening | MEDIUM |
| 47 | Add queue_jobs pruning strategy | 3,126 rows growing | LOW |
| 48 | Remove 17 empty tables for unused features | Schema bloat | LOW |
| 49 | Implement voice message transcription | Feature flag exists, code incomplete | HIGH |
| 50 | Set up Supabase or remove references | Referenced in docker-compose but not configured | LOW |
| 51 | Add missing FKs (action_executions.conversation_id) | Referential integrity gap | LOW |
| 52 | Add error rollback for optimistic updates | 6+ locations silently diverge on API failure | MEDIUM |
| 53 | Fix hardcoded German text in payment modal | "Jetzt senden" not using t() | LOW |

---

## APPENDIX A: Store Architecture

| Store | File | Purpose | Persisted |
|-------|------|---------|-----------|
| uiStore | uiStore.js | View, sidebar, lang, modals | lang, sidebar |
| authStore | authStore.js | User session, login | none |
| clinicStore | clinicStore.js | Clinic settings, AI config | none |
| patientStore | patientStore.js | Patients, drag-drop, notes | none |
| inboxStore | inboxStore.js | Conversations, messages | none |
| appointmentStore | appointmentStore.js | Appointments, calendar | none |
| billingStore | billingStore.js | Invoices, payments | none |
| entitlementStore | entitlementStore.js | Plan limits, feature flags | none |

## APPENDIX B: Complete Table List (54 Tables)

_migrations, action_executions, aftercare_messages, aftercare_templates, alert_events, alert_rules, api_keys, api_permissions, applications, appointments, audit_log, backup_records, billing_events, circuit_breakers, clinic_agent_config, clinic_automations, clinic_documents, conversation_messages, conversation_photos, conversation_transitions, conversations, data_requests, deployment_events, drivers, encryption_keys, events, file_uploads, files, flight_bookings, health_snapshots, idempotency_keys, incidents, integrations, invitations, job_failures, monthly_patient_usage, organizations, outreach_leads, page_views, patient_reviews, patients, platform_metrics, provisioning_logs, provisioning_templates, queue_jobs, restore_drills, sessions, staff_members, subscription_plans, subscriptions, tasks, tenant_rate_limits, treatment_types, users, webhook_events, whatsapp_configs, whatsapp_connection_events

## APPENDIX C: Backend Route Groups

| Group | Files | Endpoints | Auth | Notes |
|-------|-------|-----------|------|-------|
| Auth (`/auth/`) | 4 | 11 | Public (login, magic-link) + JWT | Zod validation ✅ |
| Clinic (`/clinic/`) | 10 | ~25 | JWT | No validation ⚠️ |
| CRM (`/crm/`) | 14 | ~40 | JWT + RBAC | No validation ⚠️ |
| Ops (`/ops/`) | 19 | ~50 | JWT + RBAC (some bypass!) | No validation ⚠️ |
| Internal (`/internal/`) | 7 | ~15 | x-api-key | n8n only |
| Webhooks | 2 | 3 | HMAC-SHA256 | Stripe + WhatsApp |
| Google (`/google-*`) | 3 | ~10 | JWT | Drive, Calendar, Sheets |
| Other | 5 | ~10 | Mixed | health, tracking, pay-redirect |

## APPENDIX D: API Client Functions (122 Total)

**Auth (6):** login, logout, getMe, requestMagicLink, verifyMagicLink, updatePassword
**Operator (45+):** getPlatformOverview, getPlatformClinics, getPlatformMetrics, getIncidents, createIncident, getAlerts, getSubscriptions, getWebhookEvents, getApiKeys, getAuditLog, getQueueJobs, getInfrastructure, getSessions, suspendClinic, impersonateClinic, ...
**CRM Core (40+):** getPatients, getPatient, createPatient, updatePatient, addTimelineEntry, getConversations, getMessages, sendCrmMessage, getAppointments, createAppointment, updateAppointment, deleteAppointment, getInvoices, createCrmInvoice, updateInvoice, getAutomations, updateAutomation, getDashboard, getStaff, getTreatments, getBotConfig, getClinicSettings, updateClinicSettings, ...
**Billing (15+):** getMySubscription, createBillingPortalSession, subscribeToPlan, changePlan, addAddon, removeAddon, cancelSubscription, getStripeInvoices, createStripeCheckoutLink, ...
**Files/Drive (10):** getDriveStatus, setupDriveFolder, getDriveFiles, uploadToDrive, deleteDriveFile, exportPatientsToSheets, exportRevenueToSheets, ...
**AI/Integrations (15+):** getAgentConfig, updateAgentConfig, getWaProfile, updateWaProfile, getGoogleStatus, disconnectGoogle, getAnalyticsData, updateAnalyticsConfig, aiSupportChat, streamFetch, ...
