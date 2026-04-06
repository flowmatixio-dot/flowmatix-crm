/**
 * Flowmatix API Client
 * Handles JWT auth, auto-refresh, and all operator console API calls.
 */

import { isDemoMode } from '../utils/demoTime';

export const API_URL = import.meta.env.VITE_API_URL || 'https://api.flowmatix.io';

// sessionStorage = per-tab isolation (allows admin + coordinator in separate tabs)
let accessToken = sessionStorage.getItem('fm_access_token');
let refreshToken = sessionStorage.getItem('fm_refresh_token');
let refreshPromise = null;

// ── Token Management ──────────────────────────────────────

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  sessionStorage.setItem('fm_access_token', access);
  sessionStorage.setItem('fm_refresh_token', refresh);
  // Set cookie for img/media auth (httpOnly=false so browser sends it with img src requests)
  document.cookie = `fm_token=${access}; path=/; max-age=86400; SameSite=Lax; Secure`;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  sessionStorage.removeItem('fm_access_token');
  sessionStorage.removeItem('fm_refresh_token');
  sessionStorage.removeItem('fm_api_user');
  document.cookie = 'fm_token=; path=/; max-age=0';

}

export function getAccessToken() {
  return accessToken;
}

export function authPhotoUrl(url) {
  if (!url || !accessToken) return url;
  if (!url.includes('/crm/photos/') && !url.includes('api.flowmatix.io')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'token=' + accessToken;
}

export function isAuthenticated() {
  return !!accessToken;
}

// ── Core Fetch Wrapper ────────────────────────────────────

// ── Demo mode write guard ──
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Endpoints that are BLOCKED for writes in demo mode (real external side-effects)
const DEMO_BLOCKED_PATTERNS = [
  '/whatsapp/send',
  '/clinic/payments',
  '/clinic/invoices',
  '/clinic/stripe',
  '/billing/checkout',
];

// Endpoints that are ALLOWED for writes in demo mode (safe demo data manipulation)
const DEMO_ALLOWED_PATTERNS = [
  '/crm/patients',
  '/crm/appointments',
  '/clinic/settings',
  '/clinic/support',
  '/crm/conversations',
  '/auth/',
  '/session',
  '/clinic/mode',
  '/clinic/workspace',
  '/demo/',
];

export function isDemoBlocked(method, path) {
  if (!isDemoMode()) return false;
  if (!WRITE_METHODS.includes(method.toUpperCase())) return false;

  // Check if the path matches an allowed pattern first
  if (DEMO_ALLOWED_PATTERNS.some(p => path.includes(p))) return false;

  // Check if the path matches a blocked pattern
  if (DEMO_BLOCKED_PATTERNS.some(p => path.includes(p))) return true;

  // Default: allow other writes (safe for demo data)
  return false;
}

export function showDemoBlockedModal() {
  window.dispatchEvent(new CustomEvent('fm:demo-blocked'));
}

export async function apiFetch(path, options = {}) {
  // Block write actions in demo mode
  const method = (options.method || 'GET').toUpperCase();
  if (isDemoBlocked(method, path)) {
    showDemoBlockedModal();
    throw new Error('DEMO_BLOCKED');
  }

  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Always send current CRM language
  try { const lang = localStorage.getItem('fm_lang'); if (lang) headers['X-Locale'] = lang; } catch {}

  let res = await fetch(url, { ...options, headers, credentials: 'include' });

  // Auto-refresh on 401
  if (res.status === 401 && refreshToken && !options._isRetry) {
    await doRefresh();
    // Retry original request with new token
    headers['Authorization'] = `Bearer ${accessToken}`;
    res = await fetch(url, { ...options, headers, credentials: 'include', _isRetry: true });
  }

  // Auto-retry on 429 (rate limited)
  if (res.status === 429 && !options._is429Retry) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '3', 10);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return apiFetch(path, { ...options, _is429Retry: true });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `API error ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return res.json();
}

async function doRefresh() {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!res.ok) {
        clearTokens();
        window.dispatchEvent(new Event('fm:session-expired'));
        throw new Error('Session expired');
      }

      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Auth ──────────────────────────────────────────────────

export async function login(email, password) {
  const data = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.accessToken, data.refreshToken);
  sessionStorage.setItem('fm_api_user', JSON.stringify(data.user));
  return data;
}

export async function logout() {
  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
  } catch {
    // Logout best-effort
  }
  clearTokens();
}

export async function getMe() {
  const res = await apiFetch('/api/v1/auth/me');
  return res.user || res;
}

// ── Platform (Operator) ──────────────────────────────────

export async function getPlatformOverview() {
  return apiFetch('/api/v1/ops/platform/overview');
}

export async function getPlatformClinics(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  const q = qs.toString();
  return apiFetch(`/api/v1/ops/platform/clinics${q ? '?' + q : ''}`);
}

export async function getPlatformMetrics(days = 30) {
  return apiFetch(`/api/v1/ops/platform/metrics?days=${days}`);
}

// ── Clinic ────────────────────────────────────────────────

export async function getClinicOverview(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/overview`);
}

export async function getClinicEvents(orgId, params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.type) qs.set('type', params.type);
  return apiFetch(`/api/v1/ops/clinic/${orgId}/events?${qs}`);
}

// ── Incidents ─────────────────────────────────────────────

export async function getIncidents(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.severity) qs.set('severity', params.severity);
  if (params.limit) qs.set('limit', params.limit);
  return apiFetch(`/api/v1/ops/incidents?${qs}`);
}

export async function createIncident(data) {
  return apiFetch('/api/v1/ops/incidents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resolveIncident(id) {
  return apiFetch(`/api/v1/ops/incidents/${id}/resolve`, { method: 'PATCH' });
}

// ── Alerts ────────────────────────────────────────────────

export async function getAlerts(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.limit) qs.set('limit', params.limit);
  return apiFetch(`/api/v1/ops/alerts?${qs}`);
}

export async function getAlertRules() {
  return apiFetch('/api/v1/ops/alerts/rules');
}

export async function acknowledgeAlert(id) {
  return apiFetch(`/api/v1/ops/alerts/${id}/acknowledge`, { method: 'POST' });
}

export async function resolveAlert(id) {
  return apiFetch(`/api/v1/ops/alerts/${id}/resolve`, { method: 'POST' });
}

// ── Subscriptions ────────────────────────────────────────

export async function getSubscriptions(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  const q = qs.toString();
  return apiFetch(`/api/v1/ops/subscriptions${q ? '?' + q : ''}`);
}

export async function getSubscriptionPlans() {
  return apiFetch('/api/v1/ops/subscriptions/plans');
}

export async function getRevenue() {
  return apiFetch('/api/v1/ops/subscriptions/revenue');
}

// ── Users Admin ──────────────────────────────────────────

export async function getUsers(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.search) qs.set('search', params.search);
  if (params.role) qs.set('role', params.role);
  const q = qs.toString();
  return apiFetch(`/api/v1/ops/users${q ? '?' + q : ''}`);
}

export async function getUserStats() {
  return apiFetch('/api/v1/ops/users/stats');
}

export async function deactivateUser(id) {
  return apiFetch(`/api/v1/ops/users/${id}/deactivate`, { method: 'PATCH' });
}

export async function activateUser(id) {
  return apiFetch(`/api/v1/ops/users/${id}/activate`, { method: 'PATCH' });
}

// ── Webhooks ─────────────────────────────────────────────

export async function getWebhookEvents(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.provider) qs.set('provider', params.provider);
  if (params.status) qs.set('status', params.status);
  const q = qs.toString();
  return apiFetch(`/api/v1/ops/webhooks${q ? '?' + q : ''}`);
}

export async function getWebhookStats() {
  return apiFetch('/api/v1/ops/webhooks/stats');
}

export async function getIntegrations() {
  return apiFetch('/api/v1/ops/webhooks/integrations');
}

// ── API Keys ─────────────────────────────────────────────

export async function getApiKeys() {
  return apiFetch('/api/v1/ops/security/api-keys');
}

export async function createApiKey(data) {
  return apiFetch('/api/v1/ops/security/api-keys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function revokeApiKey(id) {
  return apiFetch(`/api/v1/ops/security/api-keys/${id}`, { method: 'DELETE' });
}

export async function rotateApiKey(id) {
  return apiFetch(`/api/v1/ops/security/api-keys/${id}/rotate`, { method: 'POST' });
}

// ── Infrastructure ──────────────────────────────────────

export async function getInfrastructure() {
  return apiFetch('/api/v1/ops/infrastructure');
}

export async function getInfraContainers() {
  return apiFetch('/api/v1/ops/infrastructure/containers');
}

export async function getInfraDatabase() {
  return apiFetch('/api/v1/ops/infrastructure/database');
}

export async function getR2Stats() {
  return apiFetch('/api/v1/ops/infrastructure/r2-stats');
}

export async function getInfraBackups() {
  return apiFetch('/api/v1/ops/infrastructure/backups');
}

export async function getInfraDeployments() {
  return apiFetch('/api/v1/ops/infrastructure/deployments');
}

// ── Audit ────────────────────────────────────────────────

export async function getAuditLog(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.action) qs.set('action', params.action);
  if (params.user_id) qs.set('user_id', params.user_id);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const q = qs.toString();
  return apiFetch(`/api/v1/clinic/audit${q ? '?' + q : ''}`);
}

export async function getAuditStats() {
  return apiFetch('/api/v1/clinic/audit/stats');
}

// ── Queues ───────────────────────────────────────────────

export async function getQueueJobs(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.status) qs.set('status', params.status);
  if (params.queue_name) qs.set('queue_name', params.queue_name);
  const q = qs.toString();
  return apiFetch(`/api/v1/ops/queues${q ? '?' + q : ''}`);
}

export async function getQueueStats() {
  return apiFetch('/api/v1/ops/queues/stats');
}

export async function retryJob(id) {
  return apiFetch(`/api/v1/ops/queues/${id}/retry`, { method: 'POST' });
}

// ── Onboarding ──────────────────────────────────────────

export async function getOnboarding() {
  return apiFetch('/api/v1/ops/onboarding');
}

export async function getOnboardingLogs(orgId) {
  return apiFetch(`/api/v1/ops/onboarding/${orgId}/logs`);
}

// ── Security ────────────────────────────────────────────

export async function getRbacPermissions() {
  return apiFetch('/api/v1/ops/security/rbac');
}

export async function getSessions() {
  return apiFetch('/api/v1/ops/security/sessions');
}

export async function revokeSession(id) {
  return apiFetch(`/api/v1/ops/security/sessions/${id}`, { method: 'DELETE' });
}

// ── Clinic Actions ──────────────────────────────────────

export async function suspendClinic(orgId, reason) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function resumeClinic(orgId, reason) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/resume`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function impersonateClinic(orgId, reason) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/impersonate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function generateTrialLink(orgId) {
  return apiFetch('/api/v1/billing/trial-link', {
    method: 'POST',
    body: JSON.stringify({ orgId }),
  });
}

// ── WhatsApp Operator Control ────────────────────────────
export async function waStart(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/wa-start`, { method: 'POST' });
}
export async function waRetry(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/wa-retry`, { method: 'POST' });
}
export async function waForceConnect(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/wa-force-connect`, { method: 'POST' });
}
export async function waReset(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/wa-reset`, { method: 'POST' });
}
export async function waLogs(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/wa-logs`);
}

export async function regenOnboardingLink(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/regen-onboarding`, { method: 'POST' });
}

// ── Onboarding Actions ──────────────────────────────────

export async function retryProvisioningStep(orgId, step) {
  return apiFetch(`/api/v1/ops/onboarding/${orgId}/retry-step`, {
    method: 'POST',
    body: JSON.stringify({ step }),
  });
}

// ── Incidents Actions ───────────────────────────────────

export async function acknowledgeIncident(id) {
  return apiFetch(`/api/v1/ops/incidents/${id}/acknowledge`, { method: 'PATCH' });
}

// ── Billing Export ──────────────────────────────────────

export async function getOverdueSubscriptions() {
  return apiFetch('/api/v1/ops/billing/overdue');
}

export async function autoSuspendOverdue(daysOverdue = 14) {
  return apiFetch('/api/v1/ops/billing/auto-suspend', {
    method: 'POST',
    body: JSON.stringify({ daysOverdue }),
  });
}

// SECURITY FIX: Download via fetch+blob instead of exposing JWT in URL
export async function downloadDatevExport(from, to) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const url = `${API_URL}/api/v1/ops/billing/datev-export?${qs}`;
  const headers = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`DATEV export failed: ${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition');
  const filename = disposition?.match(/filename="?([^";\n]+)"?/)?.[1] || `datev-export-${from || 'all'}.csv`;
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objUrl);
}

// Deprecated: kept for backward compatibility, prefer downloadDatevExport()
export function getDatevExportUrl(from, to) {
  const token = getAccessToken();
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (token) qs.set('token', token);
  return `${API_URL}/api/v1/ops/billing/datev-export?${qs}`;
}

// ── Platform Stats ──────────────────────────────────────

export async function getPlatformStats() {
  return apiFetch('/api/v1/ops/platform/stats');
}

export async function getCommandCenter() {
  return apiFetch('/api/v1/ops/platform/command-center');
}
export async function getCommandCenterDrilldown(metric) {
  return apiFetch(`/api/v1/ops/platform/command-center/drilldown?metric=${metric}`);
}

// ── Incidents V2 (Alert Center) ─────────────────────────
export async function getLiveIncidents() {
  return apiFetch('/api/v1/ops/incidents-v2/live');
}
export async function getIncidentHistory() {
  return apiFetch('/api/v1/ops/incidents-v2/history');
}
export async function resolveIncidentV2(id) {
  return apiFetch(`/api/v1/ops/incidents-v2/resolve/${id}`, { method: 'POST' });
}
export async function acknowledgeIncidentV2(id) {
  return apiFetch(`/api/v1/ops/incidents-v2/acknowledge/${id}`, { method: 'POST' });
}
export async function evaluateIncidents() {
  return apiFetch('/api/v1/ops/incidents-v2/evaluate', { method: 'POST' });
}
export async function getCostTracker() {
  return apiFetch('/api/v1/ops/platform/cost-tracker');
}
export async function getOperatorSettings() {
  return apiFetch('/api/v1/ops/platform/settings');
}
export async function saveOperatorSettings(settings) {
  return apiFetch('/api/v1/ops/platform/settings', { method: 'PUT', body: JSON.stringify(settings) });
}
export async function getBackupStatus() {
  return apiFetch('/api/v1/ops/platform/backup-status');
}
export async function getN8nWorkflows() {
  return apiFetch('/api/v1/ops/platform/n8n-workflows');
}

// ── Unified Logs ────────────────────────────────────────

export async function getUnifiedLogs(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.source) qs.set('source', params.source);
  if (params.organization_id) qs.set('organization_id', params.organization_id);
  const q = qs.toString();
  return apiFetch(`/api/v1/ops/logs${q ? '?' + q : ''}`);
}

// ── WhatsApp Credentials (per clinic) ──────────────────

export async function getClinicWhatsapp(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/whatsapp`);
}

export async function updateClinicWhatsapp(orgId, data) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/whatsapp`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── WhatsApp Business Profile ──────────────────────────

export async function getWaProfile() {
  return apiFetch('/api/v1/clinic/whatsapp/profile');
}

export async function updateWaProfile(data) {
  return apiFetch('/api/v1/clinic/whatsapp/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function uploadWaProfilePhoto(imageData) {
  return apiFetch('/api/v1/clinic/whatsapp/profile/photo', {
    method: 'PUT',
    body: JSON.stringify({ imageData }),
  });
}

export async function saveWaProfileRequest(data) {
  return apiFetch('/api/v1/clinic/whatsapp/profile/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── WhatsApp Provisioning (operator) ──────────────────
export async function getWaProvisionStatus() {
  return apiFetch('/api/v1/ops/whatsapp/status');
}

export async function provisionWhatsApp(orgId) {
  return apiFetch('/api/v1/ops/whatsapp/provision', {
    method: 'POST',
    body: JSON.stringify({ orgId }),
  });
}

// ── Google OAuth (per clinic) ──────────────────────────

export async function getGoogleStatus(orgId) {
  return apiFetch(`/api/v1/auth/google/status?orgId=${orgId}`);
}

// SECURITY: Request a short-lived one-time code from the backend to avoid putting the
// full JWT in the URL. Falls back to JWT-in-URL if the backend doesn't support the
// /auth/google/connect-code endpoint yet.
export async function getGoogleConnectUrlSafe(orgId) {
  try {
    const { code } = await apiFetch('/api/v1/auth/google/connect-code', {
      method: 'POST',
      body: JSON.stringify({ orgId }),
    });
    return `${API_URL}/api/v1/auth/google/connect?orgId=${orgId}&code=${code}`;
  } catch {
    // Fallback: backend doesn't support one-time codes yet — use JWT (logged as known risk)
    console.warn('[security] Google connect falling back to JWT-in-URL — backend needs /auth/google/connect-code endpoint');
    const token = getAccessToken();
    return `${API_URL}/api/v1/auth/google/connect?orgId=${orgId}&token=${token}`;
  }
}

// Deprecated: exposes JWT in URL. Use getGoogleConnectUrlSafe() instead.
export function getGoogleConnectUrl(orgId) {
  const token = getAccessToken();
  return `${API_URL}/api/v1/auth/google/connect?orgId=${orgId}&token=${token}`;
}

export async function disconnectGoogle(orgId) {
  return apiFetch(`/api/v1/auth/google/disconnect?orgId=${orgId}`, { method: 'DELETE' });
}

// ── Admin Clinics ──────────────────────────────────────

export async function createClinic(data) {
  return apiFetch('/api/v1/admin/clinics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Applications (Bewerbungen) ─────────────────────────

export async function getApplications(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  const q = qs.toString();
  return apiFetch(`/api/v1/ops/applications${q ? '?' + q : ''}`);
}

export async function getApplicationStats() {
  return apiFetch('/api/v1/ops/applications/stats');
}

export async function approveApplication(id, data = {}) {
  return apiFetch(`/api/v1/ops/applications/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function rejectApplication(id, data = {}) {
  return apiFetch(`/api/v1/ops/applications/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── Outreach ───────────────────────────────────────────────

export async function getOutreachLeads(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  const q = qs.toString();
  return apiFetch(`/api/v1/ops/outreach${q ? '?' + q : ''}`);
}

export async function getOutreachStats() {
  return apiFetch('/api/v1/ops/outreach/stats');
}

export async function updateOutreachLead(id, data) {
  return apiFetch(`/api/v1/ops/outreach/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function createOutreachLead(data) {
  return apiFetch('/api/v1/ops/outreach', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteOutreachLead(id) {
  return apiFetch(`/api/v1/ops/outreach/${id}`, { method: 'DELETE' });
}

// ── Billing & Subscriptions ──────────────────────────────

export async function getMySubscription() {
  return apiFetch('/api/v1/ops/subscriptions/my');
}

export async function createBillingPortalSession() {
  return apiFetch('/api/v1/ops/subscriptions/billing-portal', { method: 'POST' });
}

export async function uploadClinicDocuments(formData) {
  const headers = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${API_URL}/api/v1/crm/clinic/documents`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function subscribeToPlan(planSlug) {
  return apiFetch('/api/v1/billing/change-plan', {
    method: 'POST',
    body: JSON.stringify({ plan: planSlug }),
  });
}

export async function openBillingPortal() {
  return apiFetch("/api/v1/billing/portal", {
    method: "POST",
  });
}
export async function getStripeInvoices() {
  return apiFetch('/api/v1/billing/invoices');
}


export async function addAddon(addonSlug) {
  return apiFetch('/api/v1/billing/add-addon', {
    method: 'POST',
    body: JSON.stringify({ addon: addonSlug }),
  });
}

export async function removeAddon(addonSlug) {
  return apiFetch('/api/v1/billing/remove-addon', {
    method: 'POST',
    body: JSON.stringify({ addon: addonSlug }),
  });
}

export async function cancelSubscription(immediately = false) {
  return apiFetch('/api/v1/ops/subscriptions/cancel', {
    method: 'POST',
    body: JSON.stringify({ immediately }),
  });
}

export async function reactivateSubscription() {
  return apiFetch('/api/v1/ops/subscriptions/reactivate', {
    method: 'POST',
  });
}

export async function sendCancellationEmail(clinicId, clinicName, email, activeUntil) {
  return apiFetch('/api/v1/ops/subscriptions/cancel-notify', {
    method: 'POST',
    body: JSON.stringify({ clinic_id: clinicId, clinic_name: clinicName, email, active_until: activeUntil }),
  });
}

export async function getStripePortalUrl() {
  return apiFetch('/api/v1/ops/subscriptions/portal', {
    method: 'POST',
  });
}

// ── Agent Config ─────────────────────────────────────────

export async function getAgentConfig(orgId) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/agent-config`);
}

export async function updateAgentConfig(orgId, data) {
  return apiFetch(`/api/v1/ops/clinic/${orgId}/agent-config`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Google Drive ──────────────────────────────────────────

export async function getDriveStatus(orgId) {
  return apiFetch(`/api/v1/google-drive/status?orgId=${orgId}`);
}

export async function setupDriveFolder(orgId) {
  return apiFetch(`/api/v1/google-drive/setup-folder?orgId=${orgId}`, { method: 'POST' });
}

export async function getDriveFiles(params = {}) {
  const qs = new URLSearchParams();
  if (params.orgId) qs.set('orgId', params.orgId);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.category) qs.set('category', params.category);
  if (params.patientId) qs.set('patientId', params.patientId);
  const q = qs.toString();
  return apiFetch(`/api/v1/google-drive/files${q ? '?' + q : ''}`);
}

export async function uploadToDrive(file, patientId, category) {
  const formData = new FormData();
  formData.append('file', file);
  if (patientId) formData.append('patientId', patientId);
  if (category) formData.append('category', category);

  const url = `${API_URL}/api/v1/google-drive/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed ${res.status}`);
  }
  return res.json();
}

export async function deleteDriveFile(id) {
  return apiFetch(`/api/v1/google-drive/files/${id}`, { method: 'DELETE' });
}

export async function syncPatientCardToDrive(patientId) {
  return apiFetch(`/api/v1/crm/pdf/patient-card/${patientId}/sync-to-drive`, { method: 'POST' });
}

// ── Google Sheets ────────────────────────────────────────

export async function exportPatientsToSheets() {
  return apiFetch('/api/v1/google-sheets/export/patients', { method: 'POST' });
}

export async function exportRevenueToSheets(month) {
  return apiFetch('/api/v1/google-sheets/export/revenue', {
    method: 'POST',
    body: JSON.stringify({ month }),
  });
}

// ── CRM: Patients ───────────────────────────────────────

export async function getPatients(params = {}) {
  const qs = new URLSearchParams();
  if (params.stage) qs.set('stage', params.stage);
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  const q = qs.toString();
  return apiFetch(`/api/v1/crm/patients${q ? '?' + q : ''}`);
}

export async function getPatient(id) {
  return apiFetch(`/api/v1/crm/patients/${id}`);
}

export async function createPatient(data) {
  return apiFetch('/api/v1/crm/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePatient(id, data) {
  return apiFetch(`/api/v1/crm/patients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function notifyDriverWhatsApp(patientId) {
  return apiFetch("/api/v1/crm/patients/" + patientId + "/notify-driver", { method: "POST" });
}

export async function toggleBotControl(patientId, mode) {
  const convStatus = mode === "bot" ? "ai_active" : "human_takeover";
  return apiFetch(`/api/v1/crm/patients/${patientId}`, {
    method: 'PATCH',
    body: JSON.stringify({ convStatus, control_mode: mode }),
  });
}

export async function addTimelineEntry(patientId, data) {
  return apiFetch(`/api/v1/crm/patients/${patientId}/timeline`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── CRM: Appointments ──────────────────────────────────

export async function getAppointments(params = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  const q = qs.toString();
  return apiFetch(`/api/v1/crm/appointments${q ? '?' + q : ''}`);
}

export async function createAppointment(data) {
  return apiFetch('/api/v1/crm/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAppointment(id, data) {
  return apiFetch(`/api/v1/crm/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAppointment(id) {
  return apiFetch(`/api/v1/crm/appointments/${id}`, { method: 'DELETE' });
}

// ── CRM: Doctors ──────────────────────────────────────

export async function getDoctors() {
  const data = await apiFetch('/api/v1/crm/clinic/staff');
  return (data.staff || []).filter(
    s => (s.role === 'doctor' || s.role === 'arzt') && s.sort_order !== 999
  ).map(s => {
    // Unpack surgery_duration_rules JSONB into flat fields for calendar/modal
    const sdr = s.surgery_duration_rules || {};
    return {
      ...s,
      duration_1500: sdr.duration_1500 || s.duration_1500 || 4,
      duration_3000: sdr.duration_3000 || s.duration_3000 || 6,
      duration_4500: sdr.duration_4500 || s.duration_4500 || 8,
      duration_4500_plus: sdr.duration_4500_plus || s.duration_4500_plus || 10,
      name: s.name || [s.title, s.first_name, s.last_name].filter(Boolean).join(' ').trim() || s.email || 'Arzt',
    };
  });
}

// ── CRM: Doctor Settings ──────────────────────────────

export async function updateDoctorSettings(settings) {
  // Map frontend settings to staff_members table columns
  // The API endpoint is PUT /api/v1/crm/clinic/staff/:id
  const payload = {};

  if (settings.workingHours !== undefined) {
    // Convert { mon: { start, end, enabled }, ... } → { mon: { start, end }, ... }
    // Only include enabled days
    const wh = {};
    for (const [day, val] of Object.entries(settings.workingHours)) {
      if (val?.enabled) {
        wh[day] = { start: val.start || '09:00', end: val.end || '18:00' };
      }
    }
    payload.working_hours = wh;
  }

  if (settings.capacity !== undefined) {
    if (settings.capacity.maxOpsPerDay !== undefined)
      payload.max_surgeries_per_day = settings.capacity.maxOpsPerDay;
    if (settings.capacity.maxGraftsPerDay !== undefined)
      payload.max_grafts_per_day = settings.capacity.maxGraftsPerDay;
    if (settings.capacity.maxLargeOps !== undefined)
      payload.max_large_ops_per_day = settings.capacity.maxLargeOps;
  }

  if (settings.treatments !== undefined) {
    payload.treatment_types_allowed = settings.treatments;
  }

  if (settings.fixedWorkDays !== undefined) {
    payload.work_days = settings.fixedWorkDays;
  }

  if (settings.autoReview !== undefined) {
    payload.auto_review_enabled = settings.autoReview;
  }

  if (settings.maxReviewsPerDay !== undefined) {
    payload.max_reviews_per_day = settings.maxReviewsPerDay;
  }

  // OP duration rules by graft count
  if (settings.duration_1500 !== undefined || settings.duration_3000 !== undefined) {
    payload.surgery_duration_rules = {
      duration_1500: settings.duration_1500 || 4,
      duration_3000: settings.duration_3000 || 6,
      duration_4500: settings.duration_4500 || 8,
      duration_4500_plus: settings.duration_4500_plus || 10,
    };
  }

  // Save main settings via staff update endpoint
  const result = await apiFetch(`/api/v1/crm/clinic/staff/${settings.doctorId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  // Handle vacations via doctor unavailability endpoints
  if (settings.vacations !== undefined) { try {
    // Fetch existing unavailability entries
    const existing = await apiFetch(`/api/v1/crm/doctors/${settings.doctorId}/unavailability`);
    const existingList = existing.unavailability || [];

    // Delete removed vacations
    for (const entry of existingList) {
      const stillExists = settings.vacations.some(
        v => v.start === entry.startDate && v.end === entry.endDate
      );
      if (!stillExists) {
        await apiFetch(`/api/v1/crm/doctors/${settings.doctorId}/unavailability/${entry.id}`, {
          method: 'DELETE',
        });
      }
    }

    // Add new vacations
    for (const vac of settings.vacations) {
      const alreadyExists = existingList.some(
        e => e.startDate === vac.start && e.endDate === vac.end
      );
      if (!alreadyExists) {
        await apiFetch(`/api/v1/crm/doctors/${settings.doctorId}/unavailability`, {
          method: 'POST',
          body: JSON.stringify({ startDate: vac.start, endDate: vac.end, reason: 'Urlaub' }),
        });
      }
    }
  } catch (e) { console.error("Vacation sync failed:", e.message); throw new Error("Urlaub konnte nicht gespeichert werden"); } }

  return result;
}

// ── CRM: Blocked Days ─────────────────────────────────

export async function getBlockedDays(params = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const q = qs.toString();
  return apiFetch(`/api/v1/crm/appointments/blocked-days${q ? '?' + q : ''}`);
}

export async function createBlockedDay(data) {
  return apiFetch('/api/v1/crm/appointments/blocked-days', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteBlockedDay(id) {
  return apiFetch(`/api/v1/crm/appointments/blocked-days/${id}`, { method: 'DELETE' });
}

// ── CRM: Conversations / Inbox ─────────────────────────

export async function getConversations(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  const q = qs.toString();
  return apiFetch(`/api/v1/crm/conversations${q ? '?' + q : ''}`);
}

export async function getMessages(conversationId, params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  const q = qs.toString();
  return apiFetch(`/api/v1/crm/conversations/${conversationId}/messages${q ? '?' + q : ''}`);
}

export async function sendCrmMessage(conversationId, data) {
  return apiFetch(`/api/v1/crm/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── CRM: Invoices ──────────────────────────────────────

export async function getInvoices(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.patientId) qs.set('patientId', params.patientId);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  const q = qs.toString();
  return apiFetch(`/api/v1/crm/invoices${q ? '?' + q : ''}`);
}

export async function createCrmInvoice(data) {
  return apiFetch('/api/v1/crm/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInvoice(id, data) {
  return apiFetch(`/api/v1/crm/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── CRM: Dashboard ─────────────────────────────────────

export async function getDashboard() {
  return apiFetch('/api/v1/crm/dashboard');
}

// ── CRM: Staff (Ärzte & Personal) ─────────────────────

export async function getStaff() {
  return apiFetch('/api/v1/crm/clinic/staff');
}

export async function createStaff(data) {
  return apiFetch('/api/v1/crm/clinic/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStaff(id, data) {
  return apiFetch(`/api/v1/crm/clinic/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStaff(id) {
  return apiFetch(`/api/v1/crm/clinic/staff/${id}`, {
    method: 'DELETE',
  });
}

// ── CRM: Treatments (Behandlungsarten) ────────────────

export async function getTreatments() {
  return apiFetch('/api/v1/crm/clinic/treatments');
}

export async function createTreatment(data) {
  return apiFetch('/api/v1/crm/clinic/treatments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTreatment(id, data) {
  return apiFetch(`/api/v1/crm/clinic/treatments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTreatment(id) {
  return apiFetch(`/api/v1/crm/clinic/treatments/${id}`, {
    method: 'DELETE',
  });
}

// ── CRM: Bot Configuration ────────────────────────────

export async function getBotConfig() {
  return apiFetch('/api/v1/crm/clinic/bot-config');
}

export async function updateBotConfig(data) {
  return apiFetch('/api/v1/crm/clinic/bot-config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── CRM: Automations ───────────────────────────────────

export async function getAutomations() {
  return apiFetch('/api/v1/crm/automations');
}

export async function updateAutomation(id, data) {
  return apiFetch(`/api/v1/crm/automations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── CRM: Settings ──────────────────────────────────────

export async function getClinicSettings() {
  return apiFetch('/api/v1/clinic/settings');
}

export async function updateClinicSettings(data) {
  return apiFetch('/api/v1/clinic/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── CRM: WhatsApp Template Submission ──────────────────────────
export async function submitWhatsAppTemplates() {
  return apiFetch('/api/v1/clinic/whatsapp/templates/submit', { method: 'POST' });
}

// ── CRM: Analytics Integration ──────────────────────────
export async function getAnalyticsConfig() {
  return apiFetch('/api/v1/crm/analytics/config');
}

export async function updateAnalyticsConfig(data) {
  return apiFetch('/api/v1/crm/analytics/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function disconnectAnalytics() {
  return apiFetch('/api/v1/crm/analytics/config', { method: 'DELETE' });
}

export async function getAnalyticsData(params = {}) {
  const qs = new URLSearchParams();
  if (params.period) qs.set('period', params.period);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const q = qs.toString();
  return apiFetch(`/api/v1/crm/analytics${q ? '?' + q : ''}`);
}

// ── CRM: Feature Flags ────────────────────────────────────

export async function getFeatureFlags() {
  return apiFetch('/api/v1/crm/feature-flags');
}

export async function updateFeatureFlag(flag, data) {
  return apiFetch(`/api/v1/crm/feature-flags/${flag}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── CRM: Rate Limits ──────────────────────────────────────

export async function getRateLimits() {
  return apiFetch('/api/v1/crm/rate-limits');
}

export async function consumeRateLimit(key, cost = 1) {
  return apiFetch('/api/v1/crm/rate-limits/consume', {
    method: 'POST',
    body: JSON.stringify({ key, cost }),
  });
}

// ── CRM: Usage ────────────────────────────────────────────

export async function getUsage() {
  return apiFetch('/api/v1/crm/usage');
}

export async function trackUsage(key, amount = 1) {
  return apiFetch('/api/v1/crm/usage/track', {
    method: 'POST',
    body: JSON.stringify({ key, amount }),
  });
}

// ── Recent Payments (Operator alerts) ───────────────────

export async function getRecentPayments(since) {
  return apiFetch(`/api/v1/ops/payments/recent?since=${encodeURIComponent(since)}`);
}

// ── Health ────────────────────────────────────────────────

export async function getHealth() {
  return apiFetch('/health');
}

// ── Magic Link & Auth ──────────────────────────────────

export async function requestMagicLink(email) {
  return apiFetch('/api/v1/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyMagicLink(token, email) {
  return apiFetch('/api/v1/auth/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ token, email }),
  });
}

export async function requestPasswordReset(email) {
  // No dedicated reset-password route exists — use magic link flow instead.
  // The magic link lets the user log in and then change their password via updatePassword().
  return apiFetch('/api/v1/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function updatePassword(newPassword, currentPassword) {
  return apiFetch('/api/v1/auth/update-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword, currentPassword }),
  });
}

// ── Clinic Self-Service ────────────────────────────────

export async function getMyClinic() {
  return apiFetch('/api/v1/clinic/settings');
}

export async function getClinicMode() {
  return apiFetch('/api/v1/clinic/mode');
}

export async function setClinicMode(mode) {
  return apiFetch('/api/v1/clinic/mode', {
    method: 'PUT',
    body: JSON.stringify({ mode }),
  });
}

export async function resetDemoData() {
  return apiFetch('/api/v1/demo/reset', { method: 'POST' });
}

export async function simulateDemoLead() {
  return apiFetch('/api/v1/demo/simulate-lead', { method: 'POST' });
}

export async function completeClinicOnboarding() {
  return apiFetch('/api/v1/clinic/onboarding-status', {
    method: 'PUT',
    body: JSON.stringify({ completed: true }),
  });
}

// ── Workspace State ──────────────────────────────────────

export async function getWorkspaceState() {
  return apiFetch('/api/v1/clinic/workspace/state');
}

export async function setWorkspaceState(state) {
  return apiFetch('/api/v1/clinic/workspace/state', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  });
}

export async function getTestInfo() {
  return apiFetch('/api/v1/clinic/workspace/test-info');
}

// ── Trial Subscription (reuses existing billing/subscribe) ──

export async function startTrialActivation(plan = 'pro', billingCycle = 'monthly') {
  return apiFetch('/api/v1/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify({ plan, billingCycle }),
  });
}

// ── Stripe Checkout ──────────────────────────────────────

export async function createStripeCheckoutLink(data) {
  return apiFetch('/api/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Plan Change ──────────────────────────────────────────

export async function changePlan(planSlug) {
  return apiFetch('/api/v1/billing/change-plan', {
    method: 'POST',
    body: JSON.stringify({ plan: planSlug }),
  });
}

// ── Translate ────────────────────────────────────────────

export async function translateBatch(messages, targetLang) {
  return apiFetch('/api/v1/crm/translate/batch', {
    method: 'POST',
    body: JSON.stringify({ messages, targetLang }),
  });
}

// ── Clinic Documents (Operator) ─────────────────────────

export async function listClinicDocumentsByOrg(orgId) {
  return apiFetch(`/api/v1/clinic/documents/by-org/${orgId}`);
}

export async function listMyDocuments() {
  return apiFetch('/api/v1/clinic/documents');
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${API_URL}/api/v1/clinic/documents`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function deleteClinicDocument(docId) {
  return apiFetch(`/api/v1/clinic/documents/${docId}`, { method: 'DELETE' });
}

// SECURITY FIX: Download via fetch+blob instead of exposing JWT in URL
export async function downloadDocument(docId, filename) {
  const url = `${API_URL}/api/v1/clinic/documents/${docId}/download`;
  const headers = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`Document download failed: ${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition');
  const resolvedName = filename || disposition?.match(/filename="?([^";\n]+)"?/)?.[1] || `document-${docId}`;
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = resolvedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objUrl);
}

// Deprecated: kept for backward compatibility, prefer downloadDocument()
export function getDocumentDownloadUrl(docId) {
  const token = getAccessToken();
  return `${API_URL}/api/v1/clinic/documents/${docId}/download?token=${token}`;
}

// ── Doctor Tasks ────────────────────────────────────────
export async function fetchTasks() {
  return apiFetch('/api/v1/tasks');
}

export async function sendHotelConfirmation(patientId) {
  return apiFetch('/api/v1/crm/patients/' + patientId + '/send-hotel-confirmation', {
    method: 'POST',
  });
}

export async function createTask(data) {
  return apiFetch('/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(taskId, data) {
  return apiFetch(`/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchTaskPhotos(taskId) {
  return apiFetch(`/api/v1/tasks/${taskId}/photos`);
}

// ── Team Management ─────────────────────────────────────
export async function fetchTeam() {
  return apiFetch('/api/v1/clinic/team');
}

export async function inviteTeamMember(data) {
  return apiFetch('/api/v1/clinic/team/invite', { method: 'POST', body: JSON.stringify(data) });
}

export async function removeTeamMember(userId) {
  return apiFetch(`/api/v1/clinic/team/${userId}`, { method: 'DELETE' });
}
export async function updateTeamMember(userId, data) {
  return apiFetch(`/api/v1/clinic/team/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function streamFetch(path, body) {
  const url = `${API_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  let res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
  if (res.status === 401 && refreshToken) {
    await doRefresh();
    headers['Authorization'] = `Bearer ${accessToken}`;
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

export async function aiSupportChat({ messages, context, lang }) {
  return apiFetch('/api/v1/clinic/ai-support/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, context, lang }),
  });
}

// ── Visitor Analytics ───────────────────────────────────
export const getVisitorStats = () => apiFetch('/api/v1/analytics/stats');

// ── Checkout Session ────────────────────────────────────

export async function createCheckoutSession(priceId, orgId) {
  return apiFetch('/api/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ priceId, orgId }),
  });
}

// ── Website Stats ───────────────────────────────────────

export async function getWebsiteStats(orgId) {
  return apiFetch(`/api/v1/crm/website-stats?orgId=${encodeURIComponent(orgId)}`);
}

// ── Operator Event + Action System ─────────────────────
export const getOperatorEvents = (params = {}) => apiFetch(`/api/v1/ops/operator-events?${new URLSearchParams(params)}`);
export const resolveOperatorEvent = (id) => apiFetch(`/api/v1/ops/operator-events/${id}/resolve`, { method: 'POST' });
export const getClinicActions = () => apiFetch('/api/v1/ops/clinic-actions');
export const activateClinic = (orgId) => apiFetch(`/api/v1/ops/clinic-actions/${orgId}/activate`, { method: 'POST' });
export const updateWaSetupStatus = (orgId, status) => apiFetch(`/api/v1/ops/clinic-actions/${orgId}/wa-status`, { method: 'POST', body: JSON.stringify({ status }) });
export const getBusinessMetrics = () => apiFetch('/api/v1/ops/platform/business-metrics');
