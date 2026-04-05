import { describe, it, expect } from 'vitest';
import { isDemoMode, getNow, getNowMs, getDemoDate } from './demoTime.js';

describe('demoTime', () => {
  it('isDemoMode returns false by default', () => {
    expect(isDemoMode()).toBe(false);
  });

  it('getNow returns current time (not demo)', () => {
    const now = getNow();
    expect(Math.abs(now.getTime() - Date.now())).toBeLessThan(1000);
  });

  it('getNowMs returns current timestamp', () => {
    expect(Math.abs(getNowMs() - Date.now())).toBeLessThan(1000);
  });

  it('getDemoDate returns March 25 2026', () => {
    const d = getDemoDate();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(25);
  });
});
