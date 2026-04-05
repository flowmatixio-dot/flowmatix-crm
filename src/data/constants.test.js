import { describe, it, expect } from 'vitest';
import { hasModuleAccess, hasPermission, getAllowedModules, MODULE_ACCESS, ACTION_PERMS } from './constants.js';

// ── hasModuleAccess ──

describe('hasModuleAccess', () => {
  it('admin has dashboard access', () => {
    expect(hasModuleAccess('admin', 'dashboard')).toBe(true);
  });

  it('doctor does NOT have dashboard access', () => {
    expect(hasModuleAccess('doctor', 'dashboard')).toBe(false);
  });

  it('coordinator has inbox access', () => {
    expect(hasModuleAccess('coordinator', 'inbox')).toBe(true);
  });

  it('finance has payments access', () => {
    expect(hasModuleAccess('finance', 'payments')).toBe(true);
  });

  it('doctor has doctor_portal access', () => {
    expect(hasModuleAccess('doctor', 'doctor_portal')).toBe(true);
  });

  it('normalizes clinic_admin to admin', () => {
    expect(hasModuleAccess('clinic_admin', 'dashboard')).toBe(true);
  });

  it('normalizes staff to coordinator', () => {
    expect(hasModuleAccess('staff', 'inbox')).toBe(true);
  });

  it('normalizes clinic_staff to coordinator', () => {
    expect(hasModuleAccess('clinic_staff', 'inbox')).toBe(true);
  });

  it('returns false for null role', () => {
    expect(hasModuleAccess(null, 'dashboard')).toBe(false);
  });

  it('returns false for null module', () => {
    expect(hasModuleAccess('admin', null)).toBe(false);
  });

  it('returns false for nonexistent module', () => {
    expect(hasModuleAccess('admin', 'nonexistent')).toBe(false);
  });

  it('finance does NOT have inbox access', () => {
    expect(hasModuleAccess('finance', 'inbox')).toBe(false);
  });
});

// ── hasPermission ──

describe('hasPermission', () => {
  it('admin can delete_leads', () => {
    expect(hasPermission('admin', 'delete_leads')).toBe(true);
  });

  it('coordinator cannot delete_leads', () => {
    expect(hasPermission('coordinator', 'delete_leads')).toBe(false);
  });

  it('doctor view_leads returns "assigned"', () => {
    expect(hasPermission('doctor', 'view_leads')).toBe('assigned');
  });

  it('finance can view_billing', () => {
    expect(hasPermission('finance', 'view_billing')).toBe(true);
  });

  it('doctor can do medical_review', () => {
    expect(hasPermission('doctor', 'medical_review')).toBe(true);
  });

  it('coordinator can send_messages', () => {
    expect(hasPermission('coordinator', 'send_messages')).toBe(true);
  });

  it('returns false for null role', () => {
    expect(hasPermission(null, 'view_leads')).toBe(false);
  });

  it('returns false for null action', () => {
    expect(hasPermission('admin', null)).toBe(false);
  });

  it('normalizes clinic_doctor to doctor', () => {
    expect(hasPermission('clinic_doctor', 'medical_review')).toBe(true);
  });

  it('normalizes staff to coordinator', () => {
    expect(hasPermission('staff', 'send_messages')).toBe(true);
  });
});

// ── getAllowedModules ──

describe('getAllowedModules', () => {
  it('admin gets all modules', () => {
    const modules = getAllowedModules('admin');
    expect(modules).toContain('dashboard');
    expect(modules).toContain('inbox');
    expect(modules).toContain('settings');
    expect(modules).toContain('billing');
    expect(modules.length).toBeGreaterThan(15);
  });

  it('doctor gets limited modules', () => {
    const modules = getAllowedModules('doctor');
    expect(modules).toContain('doctor_portal');
    expect(modules).toContain('appointments');
    expect(modules).not.toContain('inbox');
    expect(modules).not.toContain('settings');
  });

  it('finance gets finance modules', () => {
    const modules = getAllowedModules('finance');
    expect(modules).toContain('payments');
    expect(modules).toContain('analytics');
    expect(modules).not.toContain('inbox');
  });

  it('staff gets same as coordinator', () => {
    const staffModules = getAllowedModules('staff');
    const coordModules = getAllowedModules('coordinator');
    expect(staffModules).toEqual(coordModules);
  });

  it('returns empty array for null role', () => {
    expect(getAllowedModules(null)).toEqual([]);
  });
});
