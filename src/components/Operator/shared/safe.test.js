import { describe, it, expect } from 'vitest';
import { safe, safeNum, safeStr } from './safe.js';

// ── safe ──

describe('safe', () => {
  it('returns dash for null', () => {
    expect(safe(null)).toBe('—');
  });

  it('returns dash for undefined', () => {
    expect(safe(undefined)).toBe('—');
  });

  it('stringifies objects', () => {
    expect(safe({ a: 1 })).toBe('{"a":1}');
  });

  it('returns string as-is', () => {
    expect(safe('hello')).toBe('hello');
  });

  it('returns number as-is', () => {
    expect(safe(42)).toBe(42);
  });

  it('returns 0 as-is (not dash)', () => {
    expect(safe(0)).toBe(0);
  });
});

// ── safeNum ──

describe('safeNum', () => {
  it('returns number directly', () => {
    expect(safeNum(42)).toBe(42);
  });

  it('parses string to number', () => {
    expect(safeNum('42')).toBe(42);
  });

  it('returns fallback for NaN string', () => {
    expect(safeNum('abc')).toBe(0);
  });

  it('uses custom fallback', () => {
    expect(safeNum('abc', 99)).toBe(99);
  });

  it('extracts from { value: N }', () => {
    expect(safeNum({ value: 42 })).toBe(42);
  });

  it('extracts from { count: N }', () => {
    expect(safeNum({ count: 5 })).toBe(5);
  });

  it('returns fallback for null', () => {
    expect(safeNum(null)).toBe(0);
  });

  it('returns fallback for empty object', () => {
    expect(safeNum({})).toBe(0);
  });
});

// ── safeStr ──

describe('safeStr', () => {
  it('returns string directly', () => {
    expect(safeStr('hello')).toBe('hello');
  });

  it('returns fallback for empty string', () => {
    expect(safeStr('')).toBe('—');
  });

  it('converts number to string', () => {
    expect(safeStr(42)).toBe('42');
  });

  it('converts boolean true to "Yes"', () => {
    expect(safeStr(true)).toBe('Yes');
  });

  it('converts boolean false to "No"', () => {
    expect(safeStr(false)).toBe('No');
  });

  it('returns fallback for null', () => {
    expect(safeStr(null)).toBe('—');
  });

  it('stringifies objects', () => {
    expect(safeStr({ a: 1 })).toBe('{"a":1}');
  });

  it('uses custom fallback', () => {
    expect(safeStr(null, 'N/A')).toBe('N/A');
  });
});
