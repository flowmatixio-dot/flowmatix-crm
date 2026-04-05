import { describe, it, expect } from 'vitest';
import { extractPct, formatBytes, normalizeContainers, normalizeClinics, clinicField } from './normalize.js';

// ── extractPct ──

describe('extractPct', () => {
  it('returns number directly', () => {
    expect(extractPct(45.2)).toBe(45.2);
  });

  it('parses string number', () => {
    expect(extractPct('45.2')).toBe(45.2);
  });

  it('extracts from { usagePercent }', () => {
    expect(extractPct({ usagePercent: 50 })).toBe(50);
  });

  it('extracts from { usage_percent }', () => {
    expect(extractPct({ usage_percent: 60 })).toBe(60);
  });

  it('extracts from { percent }', () => {
    expect(extractPct({ percent: 70 })).toBe(70);
  });

  it('extracts from { value }', () => {
    expect(extractPct({ value: 80 })).toBe(80);
  });

  it('returns null for null', () => {
    expect(extractPct(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(extractPct(undefined)).toBeNull();
  });

  it('returns null for invalid string', () => {
    expect(extractPct('abc')).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(extractPct({})).toBeNull();
  });

  it('parses string value in nested object', () => {
    expect(extractPct({ percent: '42.5' })).toBe(42.5);
  });
});

// ── formatBytes ──

describe('formatBytes', () => {
  it('formats GB', () => {
    expect(formatBytes(1.5e9)).toBe('1.5 GB');
  });

  it('formats MB', () => {
    expect(formatBytes(150e6)).toBe('150 MB');
  });

  it('formats KB', () => {
    expect(formatBytes(5000)).toBe('5 KB');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('returns null for 0', () => {
    expect(formatBytes(0)).toBeNull();
  });

  it('returns null for non-number', () => {
    expect(formatBytes('test')).toBeNull();
  });
});

// ── normalizeContainers ──

describe('normalizeContainers', () => {
  it('normalizes container list', () => {
    const result = normalizeContainers([
      { name: 'fm-api', status: 'Up 5 days', memoryBytes: 200e6 },
      { container_name: 'fm-worker', state: 'running' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('fm-api');
    expect(result[0].status).toBe('running');
    expect(result[0].memory).toBe('200 MB');
    expect(result[1].name).toBe('fm-worker');
    expect(result[1].status).toBe('running');
  });

  it('returns empty array for null', () => {
    expect(normalizeContainers(null)).toEqual([]);
  });

  it('returns empty array for non-array', () => {
    expect(normalizeContainers('not an array')).toEqual([]);
  });

  it('handles stopped containers', () => {
    const result = normalizeContainers([{ name: 'test', status: 'exited' }]);
    expect(result[0].status).toBe('stopped');
  });
});

// ── normalizeClinics ──

describe('normalizeClinics', () => {
  it('returns array directly', () => {
    const arr = [{ id: 1 }];
    expect(normalizeClinics(arr)).toBe(arr);
  });

  it('extracts from { clinics: [...] }', () => {
    expect(normalizeClinics({ clinics: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('extracts from { data: [...] }', () => {
    expect(normalizeClinics({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('extracts from { items: [...] }', () => {
    expect(normalizeClinics({ items: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('returns empty array for null', () => {
    expect(normalizeClinics(null)).toEqual([]);
  });
});

// ── clinicField ──

describe('clinicField', () => {
  it('gets name with fallback keys', () => {
    expect(clinicField({ clinic_name: 'Test Clinic' }, 'name')).toBe('Test Clinic');
    expect(clinicField({ name: 'My Clinic' }, 'name')).toBe('My Clinic');
  });

  it('gets plan with fallback keys', () => {
    expect(clinicField({ plan_slug: 'pro' }, 'plan')).toBe('pro');
    expect(clinicField({ plan_name: 'Pro' }, 'plan')).toBe('Pro');
  });

  it('gets status from workspace_state', () => {
    expect(clinicField({ workspace_state: 'active' }, 'status')).toBe('active');
  });

  it('returns null for missing field', () => {
    expect(clinicField({}, 'name')).toBeNull();
  });

  it('returns null for empty clinic', () => {
    expect(clinicField({}, 'nonexistent')).toBeNull();
  });
});
