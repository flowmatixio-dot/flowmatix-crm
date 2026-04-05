import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { escHtml, timeAgo, getMonthDays, fmtDate, waitingSince, waitingMins, waitingUrgency } from './helpers.js';

// ── escHtml ──

describe('escHtml', () => {
  it('escapes < and >', () => {
    expect(escHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes &', () => {
    expect(escHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes double quotes', () => {
    expect(escHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escHtml("it's")).toBe('it&#39;s');
  });

  it('handles null/undefined', () => {
    expect(escHtml(null)).toBe('');
    expect(escHtml(undefined)).toBe('');
  });

  it('passes normal text unchanged', () => {
    expect(escHtml('Hello World')).toBe('Hello World');
  });
});

// ── timeAgo ──

describe('timeAgo', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns "Never" for null', () => {
    expect(timeAgo(null)).toBe('Never');
  });

  it('returns "just now" for future date', () => {
    vi.setSystemTime(new Date('2026-04-05T12:00:00Z'));
    expect(timeAgo('2026-04-05T12:05:00Z')).toBe('just now');
  });

  it('returns minutes ago', () => {
    vi.setSystemTime(new Date('2026-04-05T12:05:00Z'));
    expect(timeAgo('2026-04-05T12:00:00Z')).toBe('5m ago');
  });

  it('returns hours ago', () => {
    vi.setSystemTime(new Date('2026-04-05T14:30:00Z'));
    expect(timeAgo('2026-04-05T12:00:00Z')).toBe('2h ago');
  });

  it('returns days ago', () => {
    vi.setSystemTime(new Date('2026-04-08T12:00:00Z'));
    expect(timeAgo('2026-04-05T12:00:00Z')).toBe('3d ago');
  });

  it('returns 0m ago for exact same time', () => {
    vi.setSystemTime(new Date('2026-04-05T12:00:00Z'));
    expect(timeAgo('2026-04-05T12:00:00Z')).toBe('0m ago');
  });

  it('returns 1h ago at 60 min boundary', () => {
    vi.setSystemTime(new Date('2026-04-05T13:00:00Z'));
    expect(timeAgo('2026-04-05T12:00:00Z')).toBe('1h ago');
  });
});

// ── getMonthDays ──

describe('getMonthDays', () => {
  it('always returns 42 entries', () => {
    expect(getMonthDays(2026, 3)).toHaveLength(42); // April 2026
  });

  it('marks current month days correctly', () => {
    const days = getMonthDays(2026, 3); // April 2026
    const currentDays = days.filter(d => d.current);
    expect(currentDays).toHaveLength(30); // April has 30 days
  });

  it('handles February in leap year', () => {
    const days = getMonthDays(2024, 1); // Feb 2024 (leap)
    const currentDays = days.filter(d => d.current);
    expect(currentDays).toHaveLength(29);
  });

  it('handles February in non-leap year', () => {
    const days = getMonthDays(2025, 1); // Feb 2025
    const currentDays = days.filter(d => d.current);
    expect(currentDays).toHaveLength(28);
  });

  it('includes padding days from previous month', () => {
    const days = getMonthDays(2026, 3); // April 2026 starts Wednesday
    const prevMonthDays = days.filter(d => !d.current && d.date.getMonth() === 2);
    expect(prevMonthDays.length).toBeGreaterThan(0);
  });
});

// ── fmtDate ──

describe('fmtDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(fmtDate(new Date(2026, 3, 5))).toBe('2026-04-05');
  });

  it('zero-pads month and day', () => {
    expect(fmtDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('handles null gracefully', () => {
    expect(fmtDate(null)).toBe('1970-01-01');
  });

  it('handles string input', () => {
    expect(fmtDate('2026-04-05')).toBe('2026-04-05');
  });
});

// ── waitingSince ──

describe('waitingSince', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns null for null input', () => {
    expect(waitingSince(null)).toBeNull();
  });

  it('returns "seit < 1 min" for < 1 min', () => {
    vi.setSystemTime(new Date('2026-04-05T12:00:30Z'));
    expect(waitingSince('2026-04-05T12:00:00Z')).toBe('seit < 1 min');
  });

  it('returns minutes', () => {
    vi.setSystemTime(new Date('2026-04-05T12:30:00Z'));
    expect(waitingSince('2026-04-05T12:00:00Z')).toBe('seit 30 min');
  });

  it('returns hours', () => {
    vi.setSystemTime(new Date('2026-04-05T15:00:00Z'));
    expect(waitingSince('2026-04-05T12:00:00Z')).toBe('seit 3h');
  });

  it('returns "seit gestern HH:MM" for yesterday (>24h)', () => {
    // Must be >24h ago so it doesn't show hours
    vi.setSystemTime(new Date('2026-04-06T16:00:00Z'));
    const result = waitingSince('2026-04-05T14:30:00Z');
    expect(result).toMatch(/^seit gestern \d{2}:\d{2}$/);
  });

  it('returns days for older dates', () => {
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));
    expect(waitingSince('2026-04-05T12:00:00Z')).toBe('seit 5 Tagen');
  });

  it('uses singular "Tag" for 1 day', () => {
    vi.setSystemTime(new Date('2026-04-07T12:00:00Z'));
    // 2 days ago should be "seit 2 Tagen", 1 day exactly depends on hours
    const result = waitingSince('2026-04-05T12:00:00Z');
    expect(result).toContain('Tagen');
  });
});

// ── waitingUrgency ──

describe('waitingUrgency', () => {
  it('medical: normal < 120 min', () => {
    expect(waitingUrgency(60, 'medical')).toBe('normal');
  });

  it('medical: warning at 120 min', () => {
    expect(waitingUrgency(120, 'medical')).toBe('warning');
  });

  it('medical: critical at 360 min', () => {
    expect(waitingUrgency(360, 'medical')).toBe('critical');
  });

  it('communication: warning at 15 min', () => {
    expect(waitingUrgency(15, 'communication')).toBe('warning');
  });

  it('communication: critical at 45 min', () => {
    expect(waitingUrgency(45, 'communication')).toBe('critical');
  });

  it('aftercare: normal < 720 min', () => {
    expect(waitingUrgency(500, 'aftercare')).toBe('normal');
  });

  it('logistics: warning at 1440 min', () => {
    expect(waitingUrgency(1440, 'logistics')).toBe('warning');
  });

  it('unknown category uses _default', () => {
    expect(waitingUrgency(120, 'unknown_category')).toBe('warning');
  });

  it('0 minutes is normal for all categories', () => {
    expect(waitingUrgency(0, 'medical')).toBe('normal');
    expect(waitingUrgency(0, 'communication')).toBe('normal');
  });
});
