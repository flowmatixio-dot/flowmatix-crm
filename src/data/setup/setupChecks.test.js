import { describe, it, expect } from 'vitest';
import { SETUP_CHECKS, computeSetupProgress, getHiddenStepsByPlan, checkNeedsOnboarding } from './setupChecks.js';

// ── Individual SETUP_CHECKS ──

describe('SETUP_CHECKS', () => {
  it('profile: requires name, address, phone, clinicEmail', () => {
    expect(SETUP_CHECKS.profile({ name: 'Test', address: 'St 1', phone: '123', clinicEmail: 'a@b.c' })).toBe(true);
    expect(SETUP_CHECKS.profile({ name: 'Test' })).toBe(false);
    expect(SETUP_CHECKS.profile({})).toBe(false);
  });

  it('treatments: requires at least 1 service', () => {
    expect(SETUP_CHECKS.treatments({ aiConfig: { services: ['FUE'] } })).toBe(true);
    expect(SETUP_CHECKS.treatments({ aiConfig: { services: [] } })).toBe(false);
    expect(SETUP_CHECKS.treatments({})).toBe(false);
  });

  it('team: requires at least 1 member', () => {
    expect(SETUP_CHECKS.team({ team: [{ name: 'Dr. A' }] })).toBe(true);
    expect(SETUP_CHECKS.team({ team: [] })).toBe(false);
  });

  it('calendar: requires bookingRules', () => {
    expect(SETUP_CHECKS.calendar({ aiConfig: { bookingRules: {} } })).toBe(true);
    expect(SETUP_CHECKS.calendar({})).toBe(false);
  });

  it('whatsapp: requires connection_tested', () => {
    expect(SETUP_CHECKS.whatsapp({ waSetupProgress: { connection_tested: true } })).toBe(true);
    expect(SETUP_CHECKS.whatsapp({})).toBe(false);
  });

  it('bot_config: requires clinicDesc', () => {
    expect(SETUP_CHECKS.bot_config({ aiConfig: { clinicDesc: 'We are...' } })).toBe(true);
    expect(SETUP_CHECKS.bot_config({})).toBe(false);
  });

  it('invoicing: requires bankName and iban', () => {
    expect(SETUP_CHECKS.invoicing({ bankName: 'DB', iban: 'DE...' })).toBe(true);
    expect(SETUP_CHECKS.invoicing({ bankName: 'DB' })).toBe(false);
  });
});

// ── computeSetupProgress ──

describe('computeSetupProgress', () => {
  it('returns 0% for null clinic', () => {
    expect(computeSetupProgress(null)).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('returns 0% for empty clinic', () => {
    const result = computeSetupProgress({});
    expect(result.done).toBe(0);
    expect(result.total).toBe(Object.keys(SETUP_CHECKS).length);
    expect(result.pct).toBe(0);
  });

  it('counts completed steps', () => {
    const clinic = {
      name: 'Test', address: 'St', phone: '123', clinicEmail: 'a@b.c',
      aiConfig: { services: ['FUE'], clinicDesc: 'desc', bookingRules: {} },
    };
    const result = computeSetupProgress(clinic);
    expect(result.done).toBeGreaterThan(0);
    expect(result.pct).toBeGreaterThan(0);
  });

  it('excludes hidden steps', () => {
    const full = computeSetupProgress({});
    const hidden = computeSetupProgress({}, { hiddenStepIds: ['languages'] });
    expect(hidden.total).toBe(full.total - 1);
  });

  it('includes dashboard extras when requested', () => {
    const normal = computeSetupProgress({});
    const withExtras = computeSetupProgress({}, { includeDashboardExtras: true });
    expect(withExtras.total).toBeGreaterThan(normal.total);
  });
});

// ── getHiddenStepsByPlan ──

describe('getHiddenStepsByPlan', () => {
  it('always returns ["languages"]', () => {
    expect(getHiddenStepsByPlan('core')).toEqual(['languages']);
    expect(getHiddenStepsByPlan('pro')).toEqual(['languages']);
    expect(getHiddenStepsByPlan('enterprise')).toEqual(['languages']);
  });
});

// ── checkNeedsOnboarding ──

describe('checkNeedsOnboarding', () => {
  it('returns false for null', () => {
    expect(checkNeedsOnboarding(null)).toBe(false);
  });

  it('returns true when clinicEmail is missing', () => {
    expect(checkNeedsOnboarding({})).toBe(true);
  });

  it('returns true for default email', () => {
    expect(checkNeedsOnboarding({ clinicEmail: 'info@hairclinicturkiye.com' })).toBe(true);
  });

  it('returns true when waName is missing', () => {
    expect(checkNeedsOnboarding({ clinicEmail: 'real@clinic.com' })).toBe(true);
  });

  it('returns false when all set', () => {
    expect(checkNeedsOnboarding({ clinicEmail: 'real@clinic.com', waName: 'Bot' })).toBe(false);
  });
});
