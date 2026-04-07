/**
 * setupNav — deep link helper for the onboarding setup cards.
 *
 * The CRM's settings page uses a local `settingsTab` state. To deep-link
 * into a specific tab from outside (e.g. from SetupCard's "Arzt
 * hinzufügen" button), we drop a small signal in sessionStorage that
 * SettingsView consumes on mount/update.
 *
 * Plus a `fromSetup` flag so the target page can render a "Back to
 * dashboard" pill, preventing dead ends after the user finishes the step.
 *
 * Usage:
 *   import { navigateToSetupSection } from "../../lib/setupNav";
 *   navigateToSetupSection(setView, "doctors");
 *
 * The helper picks the correct top-level view automatically based on
 * the section name.
 */

// Mapping: setup-section → { view, settingsTab? }
// Settings tabs (existing in SettingsView): general, clinic_treatments,
// payments, booking_rules, doctors, ai, integrations, team, automations,
// drivers, account, audit_log
const SECTION_TARGETS = {
  // Required setup
  clinic:    { view: "settings",       settingsTab: "general",            scrollAnchor: "fm-section-clinic" },
  treatment: { view: "settings",       settingsTab: "clinic_treatments",  scrollAnchor: "fm-section-treatments" },
  doctor:    { view: "settings",       settingsTab: "doctors",            scrollAnchor: "fm-section-doctors" },
  whatsapp:  { view: "whatsapp_setup", settingsTab: null,                 scrollAnchor: "fm-section-whatsapp" },

  // Advanced setup
  booking_rules:      { view: "settings",   settingsTab: "booking_rules", scrollAnchor: "fm-section-booking-rules" },
  doctor_assignment:  { view: "settings",   settingsTab: "doctors",       scrollAnchor: "fm-section-doctors" },
  payments:           { view: "payments",   settingsTab: null,            scrollAnchor: "fm-section-payments" },
  team:               { view: "settings",   settingsTab: "team",          scrollAnchor: "fm-section-team" },
  automations:        { view: "automations",settingsTab: null,            scrollAnchor: "fm-section-automations" },
  integrations:       { view: "settings",   settingsTab: "integrations",  scrollAnchor: "fm-section-integrations" },
  google_drive:       { view: "settings",   settingsTab: "integrations",  scrollAnchor: "fm-section-google" },
  drivers:            { view: "settings",   settingsTab: "drivers",       scrollAnchor: "fm-section-drivers" },
};

const SS_TAB_KEY = "fm_settings_target";
const SS_FROM_SETUP_KEY = "fm_from_setup";
const SS_HIGHLIGHT_KEY = "fm_highlight_section";

/**
 * Navigate to a setup section. Sets the right top-level view, drops a
 * sessionStorage signal for the settings tab + scroll anchor, and marks
 * the navigation as "from setup" so the target can render a back-pill.
 *
 * @param {Function} setView  — uiStore.setView
 * @param {string}   section  — setup-section name (e.g. "doctor")
 */
export function navigateToSetupSection(setView, section) {
  const target = SECTION_TARGETS[section];
  if (!target) {
    // Unknown section — just go to settings as fallback
    try { sessionStorage.setItem(SS_FROM_SETUP_KEY, "1"); } catch {}
    setView("settings");
    return;
  }

  try {
    if (target.settingsTab) {
      sessionStorage.setItem(SS_TAB_KEY, target.settingsTab);
    } else {
      sessionStorage.removeItem(SS_TAB_KEY);
    }
    if (target.scrollAnchor) {
      sessionStorage.setItem(SS_HIGHLIGHT_KEY, target.scrollAnchor);
    }
    sessionStorage.setItem(SS_FROM_SETUP_KEY, "1");
  } catch { /* sessionStorage may be unavailable */ }

  setView(target.view);
}

/**
 * Read the pending settings tab signal (if any) and clear it.
 * SettingsView calls this on mount and on view changes.
 */
export function consumePendingSettingsTab() {
  try {
    const tab = sessionStorage.getItem(SS_TAB_KEY);
    if (tab) {
      sessionStorage.removeItem(SS_TAB_KEY);
      return tab;
    }
  } catch {}
  return null;
}

/**
 * Read + clear the scroll-highlight anchor.
 */
export function consumeHighlightAnchor() {
  try {
    const a = sessionStorage.getItem(SS_HIGHLIGHT_KEY);
    if (a) {
      sessionStorage.removeItem(SS_HIGHLIGHT_KEY);
      return a;
    }
  } catch {}
  return null;
}

/**
 * Whether the current navigation came from a setup card.
 * Used by target pages to render a "Back to dashboard" pill.
 */
export function isFromSetup() {
  try {
    return sessionStorage.getItem(SS_FROM_SETUP_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Clear the from-setup flag (call when user manually navigates away
 * or completes the step and goes back).
 */
export function clearFromSetup() {
  try {
    sessionStorage.removeItem(SS_FROM_SETUP_KEY);
  } catch {}
}
