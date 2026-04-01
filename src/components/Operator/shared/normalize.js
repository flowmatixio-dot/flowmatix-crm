// ── Centralized API response normalizers for Operator CRM ──

// Extract a percentage value from various API shapes
export function extractPct(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') { const n = parseFloat(val); return isNaN(n) ? null : n; }
  if (typeof val === 'object') {
    // API returns { usagePercent: 45.2 } or { usage: 45 } or { percent: 45 } or { value: 45 }
    for (const key of ['usagePercent', 'usage_percent', 'percent', 'usage', 'value', 'pct']) {
      if (typeof val[key] === 'number') return val[key];
      if (typeof val[key] === 'string') { const n = parseFloat(val[key]); if (!isNaN(n)) return n; }
    }
  }
  return null;
}

// Normalize infrastructure response
export function normalizeInfra(res) {
  if (!res || typeof res !== 'object') return { cpu: null, memory: null, disk: null, uptimeSeconds: null, containers: [] };
  const root = res.data || res;
  return {
    cpu: extractPct(root.cpu),
    memory: extractPct(root.memory),
    disk: extractPct(root.disk),
    uptimeSeconds: typeof root.uptimeSeconds === 'number' ? root.uptimeSeconds : typeof root.uptime === 'number' ? root.uptime : null,
    load: root.load || null,
    containers: normalizeContainers(root.containers),
  };
}

// Normalize container list
export function normalizeContainers(containers) {
  if (!Array.isArray(containers)) return [];
  return containers.map(c => ({
    name: c.name || c.container_name || c.service || c.job || c.Names || c.id || 'unknown',
    status: normalizeContainerStatus(c.status || c.state || c.health || 'unknown'),
    instance: c.instance || '',
    memory: formatMemory(c.memoryBytes || c.memory_bytes || c.memory),
  }));
}

function normalizeContainerStatus(status) {
  if (typeof status !== 'string') return 'unknown';
  const s = status.toLowerCase();
  if (s === 'up' || s === 'running' || s.startsWith('up')) return 'running';
  if (s === 'down' || s === 'exited' || s === 'stopped') return 'stopped';
  return s;
}

function formatMemory(bytes) {
  if (typeof bytes === 'string') return bytes; // already formatted
  if (typeof bytes !== 'number' || bytes === 0) return null;
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

// Normalize clinics list from any API response shape
export function normalizeClinics(res) {
  if (Array.isArray(res)) return res;
  if (res?.clinics && Array.isArray(res.clinics)) return res.clinics;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (res?.items && Array.isArray(res.items)) return res.items;
  return [];
}

// Extract clinic display fields with fallbacks
export function clinicField(clinic, field) {
  const maps = {
    name: ['name', 'clinic_name', 'organization_name'],
    email: ['email'],
    whatsapp: ['whatsapp_connected', 'wa_connected', 'whatsapp_active'],
    google: ['google_connected', 'google_calendar_connected'],
    readiness: ['readiness_score', 'readiness', 'onboarding_progress'],
    plan: ['plan_name', 'plan_slug', 'plan'],
    status: ['workspace_state', 'status'],
    subscription: ['subscription_status'],
  };
  const keys = maps[field] || [field];
  for (const k of keys) {
    if (clinic[k] !== undefined && clinic[k] !== null) return clinic[k];
  }
  return null;
}
