/**
 * Single source of truth for setup completion checks.
 *
 * Each check function takes a clinic object and returns boolean.
 * Keys match SETUP_STEPS[].id from setupDefinitions.js.
 *
 * Consumed by: SetupView, SetupGuide, DashboardView, CRM (onboarding)
 */

export const SETUP_CHECKS = {
  profile:     c => !!(c.name && c.address && c.phone && c.clinicEmail),
  treatments:  c => (c.aiConfig?.services?.length || 0) >= 1,
  team:        c => (c.team?.length || 0) >= 1,
  calendar:    c => !!(c.aiConfig?.bookingRules),
  whatsapp:    c => !!(c.waSetupProgress?.connection_tested),
  wa_profile:  c => !!(c.waProfile?.botName && c.waProfile?.infoText),
  bot_config:  c => !!(c.aiConfig?.clinicDesc),
  languages:   c => (c.aiConfig?.allowedLangs?.length || 0) >= 3,
  templates:   c => !!(c.logisticsConfig?.pickupTemplateEn),
  automations: c => (c.automations?.filter(a => a.active)?.length || 0) >= 2,
  flights:     c => c.logisticsConfig?.autoNotifyDriver === true,
  invoicing:   c => !!(c.bankName && c.iban),
};

/**
 * Additional checks used by the Dashboard's extended progress bar.
 * These are NOT setup steps but affect the dashboard progress %.
 * Keys must NOT collide with SETUP_CHECKS keys.
 */
export const DASHBOARD_EXTRA_CHECKS = {
  faq:     c => (c.aiConfig?.faq?.length || 0) >= 2,
  drivers: c => (c.drivers?.length || 0) >= 1,
};

/**
 * Operator-side clinic health checks.
 * These check server-side provisioning state (different from customer setup).
 */
export const OPERATOR_CLINIC_CHECKS = [
  { label: "Profil",       check: c => !!(c.name && c.email) },
  { label: "Aktiv",        check: c => c.is_active === true },
  { label: "Abo",          check: c => c.subscription_status === "active" },
  { label: "Provisioning", check: c => c.provisioning_status === "success" || c.provisioning_status === "complete" },
  { label: "WhatsApp",     check: c => !!(c.whatsapp_phone_id && c.whatsapp_active) },
  { label: "Plan",         check: c => !!c.plan_name },
];

/**
 * Compute setup progress for a given clinic.
 *
 * @param {object} clinic - The clinic object
 * @param {object} [options]
 * @param {string[]} [options.hiddenStepIds] - Step IDs to exclude from the count
 * @param {boolean} [options.includeDashboardExtras] - Include faq/drivers checks (for dashboard %)
 * @returns {{ done: number, total: number, pct: number }}
 */
export function computeSetupProgress(clinic, options = {}) {
  if (!clinic) return { done: 0, total: 0, pct: 0 };
  const { hiddenStepIds = [], includeDashboardExtras = false } = options;

  const checks = Object.entries(SETUP_CHECKS).filter(([k]) => !hiddenStepIds.includes(k));

  let allChecks = checks;
  if (includeDashboardExtras) {
    allChecks = [...checks, ...Object.entries(DASHBOARD_EXTRA_CHECKS)];
  }

  const total = allChecks.length;
  const done = allChecks.filter(([, fn]) => fn(clinic)).length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/**
 * Get hidden step IDs based on plan tier.
 * All plans include all languages — languages step always hidden.
 */
export function getHiddenStepsByPlan(plan) {
  return ["languages"];
}

/**
 * CRM-level "needs onboarding" check — determines if the onboarding banner appears.
 */
export function checkNeedsOnboarding(clinic) {
  if (!clinic) return false;
  return !clinic.clinicEmail || clinic.clinicEmail === "info@hairclinicturkiye.com" || !clinic.waName;
}

/**
 * CRM-level basic onboarding steps (the 3-step quick banner in CRM.jsx).
 */
export function getOnboardingSteps(clinic, t) {
  if (!clinic) return [];
  return [
    { key: "clinic", label: t("ob_clinic"), done: !!clinic.clinicEmail && !!clinic.address && !!clinic.phone },
    { key: "wa",     label: t("ob_whatsapp"), done: !!clinic.waName },
    { key: "ai",     label: t("ob_ai"),       done: !!clinic.aiConfig?.responseTone },
  ];
}

/**
 * Compute operator-side clinic health progress.
 */
export function computeOperatorClinicProgress(clinic) {
  const checks = OPERATOR_CLINIC_CHECKS.map(ch => ({ label: ch.label, done: ch.check(clinic) }));
  const done = checks.filter(ch => ch.done).length;
  return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
}
