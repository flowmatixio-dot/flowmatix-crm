// Safe render — prevents React error #31 (rendering objects directly)
export function safe(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

// Safe number — extracts number from potentially nested API responses
export function safeNum(v, fallback = 0) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? fallback : n; }
  if (typeof v === 'object' && v !== null) {
    // API might return { value: 42 } or { usage: 42 } or { count: 42 }
    for (const key of ['value', 'usage', 'count', 'total', 'amount']) {
      if (typeof v[key] === 'number') return v[key];
    }
  }
  return fallback;
}

// Safe string
export function safeStr(v, fallback = '—') {
  if (typeof v === 'string') return v || fallback;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'object') return JSON.stringify(v);
  return fallback;
}
