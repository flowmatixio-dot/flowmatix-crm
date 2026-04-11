/**
 * Single source of truth for all setup/onboarding step definitions.
 *
 * Consumed by: SetupView, SetupGuide, DashboardView, CRM (onboarding), OperatorPanel
 *
 * Each step has:
 *   id        — stable key, used across views (do NOT rename)
 *   icon      — emoji for display
 *   i18nKey   — key for t() in SetupView sidebar
 *   tier      — "required" | "recommended" | "optional"
 *   desc      — German fallback description
 *   time      — estimated time string
 *   action    — which view to navigate to when clicking the step
 *   order     — display order within tier
 */

export const SETUP_STEPS = [
  // ── Required ──
  { id: "profile",    icon: "🏥", i18nKey: "sg_profile",    tier: "required",    desc: "Stammdaten deiner Klinik hinterlegen",                               time: "2 Min.", action: "setup",          order: 1 },
  { id: "treatments", icon: "💉", i18nKey: "sg_treatments", tier: "required",    desc: "Definiere deine angebotenen Behandlungen",                           time: "3 Min.", action: "setup",          order: 2 },
  { id: "team",       icon: "👥", i18nKey: "sg_team",       tier: "required",    desc: "Füge deine Ärzte und Mitarbeiter hinzu",                             time: "2 Min.", action: "setup",          order: 3 },
  { id: "calendar",   icon: "📅", i18nKey: "sg_calendar",   tier: "required",    desc: "Verbinde deinen Kalender und definiere Verfügbarkeiten",              time: "2 Min.", action: "setup",          order: 4 },
  { id: "whatsapp",   icon: "💬", i18nKey: "setup_whatsapp", tier: "required",   desc: "Verbinde deine offizielle WhatsApp Business Nummer",                 time: "5 Min.", action: "whatsapp_setup", order: 5 },
  { id: "bot_config", icon: "⚙️", i18nKey: "sg_bot_config", tier: "required",   desc: "Konfiguriere den Intake-Flow und Terminlogik",                       time: "5 Min.", action: "setup",          order: 6 },
  // ── Recommended ──
  { id: "wa_profile",  icon: "🤖", i18nKey: "sg_wa_profile",  tier: "recommended", desc: "Definiere Name und Persönlichkeit deines AI Assistants",          time: "3 Min.", action: "setup",     order: 7 },
  { id: "templates",   icon: "📝", i18nKey: "sg_templates",   tier: "recommended", desc: "Bestätigungen und Reminder Nachrichten einrichten",                time: "2 Min.", action: "settings",  order: 8 },
  { id: "automations", icon: "⚙️", i18nKey: "sg_automations", tier: "recommended", desc: "Follow-ups und automatische Workflows aktivieren",                time: "2 Min.", action: "automations", order: 9 },
  { id: "invoicing",   icon: "🧾", i18nKey: "sg_rechnung",   tier: "recommended", desc: "Rechnungsdaten und Zahlungseinstellungen",                         time: "2 Min.", action: "setup",     order: 10 },
  // ── Optional ──
{ id: "flights",     icon: "✈️", i18nKey: "sg_flights",    tier: "optional",    desc: "Optional für internationale Patienten mit Flughafentransfer",       time: "1 Min.", action: "setup",     order: 12 },
];

/**
 * Tier metadata for display (labels, colors, icons).
 * Used by SetupGuide for category headers.
 */
export const TIER_META = {
  required:    { labelKey: "sg_cat_required",    fallback: "Erforderlich",  color: "#4cc9ff",                icon: "🔵", descKey: "sg_cat_required_desc",    descFallback: "Diese Schritte sind notwendig" },
  recommended: { labelKey: "sg_cat_recommended", fallback: "Empfohlen",     color: "#ff8a2a",                icon: "🟠", descKey: "sg_cat_recommended_desc", descFallback: "Für den vollen Funktionsumfang" },
  optional:    { labelKey: "sg_cat_optional",     fallback: "Optional",      color: "rgba(167,177,195,0.6)", icon: "⚪", descKey: "sg_cat_optional_desc",    descFallback: "Zusätzliche Funktionen" },
};

/**
 * Team member limits by plan tier.
 */
export const TEAM_LIMITS = { core: 999, pro: 999, operations: 999, enterprise: 999 };

/**
 * Dashboard quick-steps: the subset of setup steps shown on the dashboard.
 * Maps to SETUP_STEPS ids + adds dashboard-specific i18n keys.
 */
export const DASHBOARD_STEP_IDS = [
  { id: "profile",   labelKey: "setup_clinic_profile",    descKey: "setup_clinic_profile_desc" },
  { id: "whatsapp",  labelKey: "setup_connect_whatsapp",  descKey: "setup_connect_whatsapp_desc" },
  { id: "calendar",  labelKey: "setup_configure_ai",      descKey: "setup_configure_ai_desc" },
  { id: "team",      labelKey: "setup_add_team",          descKey: "setup_add_team_desc" },
  { id: "invoicing", labelKey: "setup_payment_details",   descKey: "setup_payment_details_desc" },
];

/**
 * WhatsApp sub-steps (the 5-step Meta Business setup wizard).
 * These are internal to the WhatsApp setup flow, not part of the main setup steps.
 */
export const WA_META_STEPS_DEF = (t) => [
  {
    id: "create_meta", num: 1, title: t("wa_step1_title"), time: t("wa_step1_time"),
    instructions: [
      { text: t("wa_step1_inst1"), link: "https://business.facebook.com" },
      { text: t("wa_step1_inst2") }, { text: t("wa_step1_inst3") },
      { text: t("wa_step1_inst4") }, { text: t("wa_step1_inst5") },
    ],
    check: "meta_account_created", important: t("wa_step1_important"),
  },
  {
    id: "verify_business", num: 2, title: t("wa_step2_title"), time: t("wa_step2_time"),
    instructions: [
      { text: t("wa_step2_inst1") }, { text: t("wa_step2_inst2"), bold: true },
      { text: t("wa_step2_inst3") }, { text: t("wa_step2_inst4") },
      { text: t("wa_step2_inst5"), bold: true }, { text: t("wa_step2_inst6") },
      { text: t("wa_step2_inst7") }, { text: t("wa_step2_inst8") }, { text: t("wa_step2_inst9") },
    ],
    check: "meta_verified", important: t("wa_step2_important"), hasUpload: true,
  },
  {
    id: "invite_partner", num: 3, title: t("wa_step3_title"), time: t("wa_step3_time"),
    instructions: [
      { text: t("wa_step3_inst1") }, { text: t("wa_step3_inst2") },
      { text: t("wa_step3_inst3"), bold: true },
      { text: "    FLOWMATIX_PARTNER_ID", mono: true, copyable: true },
      { text: t("wa_step3_inst5"), bold: true }, { text: t("wa_step3_inst6") },
      { text: t("wa_step3_inst7") }, { text: t("wa_step3_inst8") }, { text: t("wa_step3_inst9") },
    ],
    check: "partner_invited", important: t("wa_step3_important"),
  },
  {
    id: "register_number", num: 4, title: t("wa_step4_title"), time: t("wa_step4_time"),
    instructions: [
      { text: t("wa_step4_inst1") }, { text: t("wa_step4_inst2"), bold: true },
      { text: t("wa_step4_inst3") }, { text: t("wa_step4_inst4") },
    ],
    check: "number_registered", important: t("wa_step4_important"), hasSmsInput: true,
  },
  {
    id: "test_connection", num: 5, title: t("wa_step5_title"), time: t("wa_step5_time"),
    instructions: [
      { text: t("wa_step5_inst1") }, { text: t("wa_step5_inst2") }, { text: t("wa_step5_inst3") },
    ],
    check: "connection_tested", important: null,
  },
];
