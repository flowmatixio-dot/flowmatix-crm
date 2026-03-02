/**
 * Flowmatix API Client
 * Handles JWT auth, auto-refresh, and all operator console API calls.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.flowmatix.io';

let accessToken = localStorage.getItem('fm_access_token');
let refreshToken = localStorage.getItem('fm_refresh_token');
let refreshPromise = null;

// ── Token Management ──────────────────────────────────────

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('fm_access_token', access);
  localStorage.setItem('fm_refresh_token', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('fm_access_token');
  localStorage.removeItem('fm_refresh_token');
  localStorage.removeItem('fm_api_user');
}

export function getAccessToken() {
  return accessToken;
}

export function isAuthenticated() {
  return !!accessToken;
}

// ── Core Fetch Wrapper ────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && refreshToken && !options._isRetry) {
    await doRefresh();
    // Retry original request with new token
    headers['Authorization'] = `Bearer ${accessToken}`;
    res = await fetch(url, { ...options, headers, _isRetry: true });
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
  localStorage.setItem('fm_api_user', JSON.stringify(data.user));
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
  return apiFetch('/api/v1/auth/me');
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
  return apiFetch(`/api/v1/ops/audit${q ? '?' + q : ''}`);
}

export async function getAuditStats() {
  return apiFetch('/api/v1/ops/audit/stats');
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

export function getDatevExportUrl(from, to) {
  const token = getAccessToken();
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  return `${API_URL}/api/v1/ops/billing/datev-export?${qs}`;
}

// ── Platform Stats ──────────────────────────────────────

export async function getPlatformStats() {
  return apiFetch('/api/v1/ops/platform/stats');
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

// ── Google OAuth (per clinic) ──────────────────────────

export async function getGoogleStatus(orgId) {
  return apiFetch(`/api/v1/auth/google/status?orgId=${orgId}`);
}

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

// ── Health ────────────────────────────────────────────────

export async function getHealth() {
  return apiFetch('/health');
}
