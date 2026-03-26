// Shared constants and utility components for SetupGuide sub-pages

export const SETUP_CATS = [
  { id: "overview", icon: "📋", key: "setup_overview" },
  // ── Required (6) ──
  { id: "profile",    icon: "🏥", key: "sg_profile",     descKey: "sg_profile_desc",    time: "2 Min.", tier: "required",    step: 1 },
  { id: "treatments", icon: "💉", key: "sg_treatments",  descKey: "sg_treatments_desc", time: "3 Min.", tier: "required",    step: 2 },
  { id: "team",       icon: "👥", key: "sg_team",        descKey: "sg_team_desc",       time: "2 Min.", tier: "required",    step: 3 },
  { id: "calendar",   icon: "📅", key: "sg_calendar",    descKey: "sg_calendar_desc",   time: "2 Min.", tier: "required",    step: 4 },
  { id: "bot_config", icon: "⚙️", key: "sg_bot_config",  descKey: "sg_bot_desc",        time: "5 Min.", tier: "required",    step: 5 },
  // ── Recommended (4) ──
  { id: "wa_profile",  icon: "🤖", key: "sg_wa_profile",   descKey: "sg_wa_desc",       time: "3 Min.", tier: "recommended", step: 7 },
  { id: "templates",   icon: "📝", key: "sg_templates",    descKey: "sg_tpl_desc",      time: "2 Min.", tier: "recommended", step: 8 },
  { id: "automations", icon: "⚡", key: "sg_automations",  descKey: "sg_auto_desc",     time: "2 Min.", tier: "recommended", step: 9 },
  { id: "invoicing",   icon: "🧾", key: "sg_rechnung",     descKey: "sg_inv_desc",      time: "2 Min.", tier: "recommended", step: 10 },
  // ── Optional (2) ──
  { id: "languages",   icon: "🌐", key: "sg_languages",   descKey: "sg_lang_desc",     time: "1 Min.", tier: "optional",    step: 11 },
  { id: "flights",     icon: "✈️", key: "sg_flights",      descKey: "sg_flight_desc",   time: "1 Min.", tier: "optional",    step: 12 },
];

export const TEAM_LIMITS = { core: 1, pro: 3, operations: 5, enterprise: 999 };

export const CHECKS = {
  profile:    c => !!(c.name && c.address && c.phone && c.clinicEmail),
  treatments: c => (c.aiConfig?.services?.length || 0) >= 1,
  team:       c => (c.team?.length || 0) >= 1,
  calendar:   c => !!(c.aiConfig?.bookingRules),
  bot_config: c => !!(c.aiConfig?.clinicDesc),
  wa_profile: c => !!(c.waProfile?.botName && c.waProfile?.infoText),
  templates:  c => !!(c.logisticsConfig?.pickupTemplateEn),
  automations:c => (c.automations?.filter?.(a => a.active)?.length || 0) >= 2,
  invoicing:  c => !!(c.bankName && c.iban),
  languages:  c => (c.aiConfig?.allowedLangs?.length || 0) >= 3,
  flights:    c => !!(c.logisticsConfig?.autoNotifyDriver),
};

export const TIMEZONES = ["Europe/Berlin","Europe/Istanbul","Europe/London","Europe/Paris","Europe/Rome","Europe/Madrid","Europe/Lisbon","Europe/Amsterdam","Europe/Vienna","Europe/Zurich","Europe/Brussels","Europe/Warsaw","Europe/Prague","Europe/Budapest","Europe/Athens","Europe/Helsinki","Europe/Stockholm","Europe/Oslo","Europe/Copenhagen","America/New_York","America/Chicago","America/Los_Angeles","America/Sao_Paulo","Asia/Dubai","Asia/Riyadh","Asia/Tehran","Asia/Kolkata","Asia/Bangkok","Asia/Tokyo","Asia/Seoul","Australia/Sydney","Africa/Cairo","Africa/Johannesburg"];

export const LockedBanner = ({ t }) => (
  <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
    <span style={{ fontSize: 14, color: "#10b981" }}>✓</span>
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#10b981" }}>{t("setup_completed_label") || "Einrichtung abgeschlossen"}</div>
      <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)" }}>{t("setup_change_in_settings") || "Sie können diese Daten jederzeit in den Einstellungen ändern."}</div>
    </div>
  </div>
);

export const Field = ({ label, value, onChange, placeholder, type = "text", disabled }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
    {type === "textarea"
      ? <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: disabled ? "var(--bg-section)" : "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: disabled ? "var(--text-faint)" : "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
      : <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: disabled ? "var(--bg-section)" : "var(--bg-card-elevated)", border: "1px solid var(--border-strong)", color: disabled ? "var(--text-faint)" : "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" }} />}
  </div>
);

export const SaveBtn = ({ onClick, t }) => (
  <button onClick={onClick} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", border: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("save_changes")}</button>
);
