// ── Centralized API response normalizers for Operator CRM ──

// Extract a percentage value from various API shapes
export function extractPct(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') { const n = Number.parseFloat(val); return Number.isNaN(n) ? null : n; }
  if (typeof val === 'object') {
    // API returns { usagePercent: 45.2 } or { usage: 45 } or { percent: 45 } or { value: 45 }
    for (const key of ['usagePercent', 'usage_percent', 'percent', 'usage', 'value', 'pct']) {
      if (typeof val[key] === 'number') return val[key];
      if (typeof val[key] === 'string') { const n = Number.parseFloat(val[key]); if (!Number.isNaN(n)) return n; }
    }
  }
  return null;
}

// Format bytes to human-readable GB/MB
export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !bytes) return null;
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  if (bytes > 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
}

// Extract capacity details from a metric object (memory/disk)
function extractCapacity(val) {
  if (!val || typeof val !== 'object') return { pct: extractPct(val), used: null, total: null, free: null };
  const pct = extractPct(val);
  const total = val.totalBytes || val.total_bytes || val.total_gb ? (val.total_gb || null) : null;
  const used = val.usedBytes || val.used_bytes || val.used_gb ? (val.used_gb || null) : null;
  const free = val.availableBytes || val.available_bytes || val.free_bytes || val.free_gb ? (val.free_gb || null) : null;
  // If we have bytes, convert to GB
  const totalGB = val.totalBytes ? val.totalBytes / 1e9 : val.total_gb || (total ? total / 1e9 : null);
  const usedGB = val.usedBytes ? val.usedBytes / 1e9 : val.used_gb || (used ? used / 1e9 : null);
  const freeGB = val.availableBytes ? val.availableBytes / 1e9 : val.free_gb || (free ? free / 1e9 : null);
  return { pct, usedGB, totalGB, freeGB };
}

// Normalize infrastructure response
export function normalizeInfra(res) {
  if (!res || typeof res !== 'object') return { cpu: null, memory: null, disk: null, uptimeSeconds: null, load: null, containers: [] };
  const root = res.data || res;

  const cpuObj = root.cpu;
  const cpu = {
    pct: extractPct(cpuObj),
    load1: root.load?.load1 ?? cpuObj?.load_1m ?? cpuObj?.load1 ?? null,
    load5: root.load?.load5 ?? cpuObj?.load_5m ?? cpuObj?.load5 ?? null,
    load15: root.load?.load15 ?? cpuObj?.load_15m ?? cpuObj?.load15 ?? null,
  };

  return {
    cpu,
    memory: extractCapacity(root.memory),
    disk: extractCapacity(root.disk),
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
