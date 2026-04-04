/**
 * Demo Time System
 * In demo mode, all time calculations use a fixed date (March 22, 2026 12:00)
 * so the UI stays consistent regardless of when the demo is viewed.
 */

const DEMO_DATE = new Date("2026-03-25T12:00:00");

let _isDemoMode = false;

export function setDemoMode(enabled) {
  _isDemoMode = enabled;
}

export function isDemoMode() {
  return false;
}

export function getNow() {
  if (isDemoMode()) return new Date(DEMO_DATE.getTime());
  return new Date();
}

export function getNowMs() {
  if (isDemoMode()) return DEMO_DATE.getTime();
  return Date.now();
}

export function getDemoDate() {
  return DEMO_DATE;
}
