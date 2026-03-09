import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";

/* ── Step definitions aligned with SetupView journey order ── */
const STEPS_DEF = (t) => ({
  required: [
    { id: "profile", icon: "🏥", label: t("sg_step_clinic_profile") || "Klinikprofil", desc: t("sg_step_clinic_profile_desc") || "Stammdaten Ihrer Klinik hinterlegen", check: c => !!(c.name && c.address && c.phone && c.clinicEmail), action: "setup", time: "2 Min." },
    { id: "treatments", icon: "💉", label: t("sg_step_treatments") || "Behandlungsarten", desc: t("sg_step_treatments_desc") || "Definieren Sie Ihre angebotenen Behandlungen", check: c => (c.aiConfig?.services?.length || 0) >= 1, action: "setup", time: "3 Min." },
    { id: "team", icon: "👥", label: t("sg_step_team") || "Team & Personal", desc: t("sg_step_team_desc") || "Fügen Sie Ihre Ärzte und Mitarbeiter hinzu", check: c => (c.team?.length || 0) >= 1, action: "setup", time: "2 Min." },
    { id: "calendar", icon: "📅", label: t("sg_step_calendar") || "Kalender & Termine", desc: t("sg_step_calendar_desc") || "Verbinden Sie Ihren Kalender und definieren Sie Verfügbarkeiten", check: c => !!(c.aiConfig?.bookingRules), action: "setup", time: "2 Min." },
    { id: "whatsapp", icon: "💬", label: t("sg_step_whatsapp_setup") || "WhatsApp-Verbindung", desc: t("sg_step_whatsapp_setup_desc") || "Verbinden Sie Ihre offizielle WhatsApp Business Nummer", check: c => !!(c.waSetupProgress?.connection_tested), action: "whatsapp_setup", time: "5 Min." },
    { id: "bot_config", icon: "⚙️", label: t("sg_step_bot_config") || "Bot-Konfiguration", desc: t("sg_step_bot_config_desc") || "Konfigurieren Sie den Intake-Flow und Terminlogik", check: c => !!(c.aiConfig?.clinicDesc), action: "setup", time: "5 Min." },
  ],
  recommended: [
    { id: "wa_profile", icon: "🤖", label: t("sg_step_wa_profile") || "WhatsApp-Bot-Profil", desc: t("sg_step_wa_profile_desc") || "Name und Persönlichkeit Ihres AI Assistants", check: c => !!(c.waProfile?.botName && c.waProfile?.infoText), action: "setup", time: "3 Min." },
    { id: "templates", icon: "📝", label: t("sg_step_templates") || "Nachrichtenvorlagen", desc: t("sg_step_templates_desc") || "Bestätigungen und Reminder Nachrichten", check: c => !!(c.logisticsConfig?.pickupTemplateEn), action: "settings", time: "2 Min." },
    { id: "automations", icon: "⚙️", label: t("sg_step_automations") || "Automatisierungen", desc: t("sg_step_automations_desc") || "Follow-ups und automatische Workflows", check: c => (c.automations?.filter(a => a.active)?.length || 0) >= 2, action: "automations", time: "2 Min." },
    { id: "invoicing", icon: "🧾", label: t("sg_step_invoicing") || "Rechnung", desc: t("sg_step_invoicing_desc") || "Rechnungsdaten und Zahlungseinstellungen", check: c => !!(c.bankName && c.iban), action: "setup", time: "2 Min." },
  ],
  optional: [
    { id: "languages", icon: "🌐", label: t("sg_step_languages") || "Mehrsprachige KI", desc: t("sg_step_languages_desc") || "Weitere Sprachen für internationale Patienten", check: c => (c.aiConfig?.allowedLangs?.length || 0) >= 3, action: "setup", time: "1 Min." },
    { id: "flights", icon: "✈️", label: t("sg_step_flights") || "Flugverfolgung", desc: t("sg_step_flights_desc") || "Flughafentransfer für internationale Patienten", check: c => c.logisticsConfig?.autoNotifyDriver === true, action: "setup", time: "1 Min." },
  ],
});

const CATEGORY_META_DEF = (t) => ({
  required: { label: t("sg_cat_required") || "Erforderlich", color: "#4cc9ff", icon: "🔵", desc: t("sg_cat_required_desc") || "Diese Schritte sind notwendig" },
  recommended: { label: t("sg_cat_recommended") || "Empfohlen", color: "#ff8a2a", icon: "🟠", desc: t("sg_cat_recommended_desc") || "Für den vollen Funktionsumfang" },
  optional: { label: t("sg_cat_optional") || "Optional", color: "rgba(167,177,195,0.6)", icon: "⚪", desc: t("sg_cat_optional_desc") || "Zusätzliche Funktionen" },
});

export default function SetupGuide() {
  const { clinic, setView, showT, t } = useApp();
  const [expanded, setExpanded] = useState(false);

  const STEPS = useMemo(() => STEPS_DEF(t), [t]);
  const CATEGORY_META = useMemo(() => CATEGORY_META_DEF(t), [t]);

  const progress = useMemo(() => {
    if (!clinic) return { total: 0, done: 0, pct: 0, byCategory: {} };
    const allSteps = [...STEPS.required, ...STEPS.recommended, ...STEPS.optional];
    const total = allSteps.length;
    const done = allSteps.filter(s => s.check(clinic)).length;
    const byCategory = {};
    for (const [cat, steps] of Object.entries(STEPS)) {
      const catDone = steps.filter(s => s.check(clinic)).length;
      byCategory[cat] = { total: steps.length, done: catDone, pct: Math.round((catDone / steps.length) * 100) };
    }
    return { total, done, pct: Math.round((done / total) * 100), byCategory };
  }, [clinic, STEPS]);

  if (!clinic) return null;

  const stepsRemaining = progress.total - progress.done;

  const handleStepClick = (step) => {
    if (step.check(clinic)) {
      showT(t("sg_already_configured") || "Bereits konfiguriert");
    } else {
      setView(step.action);
    }
  };

  // Compact dashboard widget
  if (!expanded) {
    return <div style={{ padding: 18, borderRadius: 16, background: progress.pct === 100 ? "rgba(16,185,129,0.04)" : "rgba(76,201,255,0.03)", border: `1px solid ${progress.pct === 100 ? "rgba(16,185,129,0.15)" : "rgba(76,201,255,0.1)"}`, marginBottom: 22, cursor: "pointer" }} onClick={() => setExpanded(true)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{progress.pct === 100 ? "✅" : "🛠️"}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{progress.pct === 100 ? (t("sg_setup_complete") || "Einrichtung abgeschlossen") : (t("sg_clinic_setup_guide") || "Klinik einrichten")}</div>
            <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 2 }}>
              {progress.pct === 100
                ? (t("sg_ai_live") || "Ihr AI Assistant ist bereit.")
                : (progress.done + " " + (t("sg_of") || "von") + " " + progress.total + " " + (t("sg_steps_completed") || "Schritten abgeschlossen"))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: progress.pct === 100 ? "#10b981" : "#4cc9ff" }}>{progress.pct}%</span>
          <span style={{ fontSize: 11, color: "rgba(167,177,195,0.4)" }}>▼</span>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ height: 6, borderRadius: 3, background: progress.pct === 100 ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)", width: `${progress.pct}%`, transition: "width .5s ease" }} />
      </div>
      {/* Calm remaining message */}
      {progress.pct < 100 && <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 8 }}>
        {stepsRemaining <= 3
          ? (t("sg_almost_there") || "Fast geschafft! Noch " + stepsRemaining + " Schritte.")
          : (t("sg_steps_to_go_prefix") || "Noch ") + stepsRemaining + (t("sg_steps_to_go_suffix") || " Schritte bis Ihr AI Assistant live ist")}
      </div>}
    </div>;
  }

  // Expanded full guide
  return <div style={{ padding: 22, borderRadius: 16, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.1)", marginBottom: 22 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🛠️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{t("sg_clinic_setup_guide") || "Klinik einrichten"}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 2 }}>
            {progress.done} {t("sg_of") || "von"} {progress.total} {t("sg_steps_completed") || "Schritten abgeschlossen"}
          </div>
        </div>
      </div>
      <button onClick={() => setExpanded(false)} style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>▲ {t("sg_collapse") || "Einklappen"}</button>
    </div>

    {/* Progress bar */}
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 6 }}>
      <div style={{ height: 8, borderRadius: 4, background: progress.pct === 100 ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)", width: `${progress.pct}%`, transition: "width .5s ease" }} />
    </div>
    {progress.pct < 100 && <div style={{ fontSize: 12, color: "rgba(167,177,195,0.4)", marginBottom: 18 }}>
      {stepsRemaining <= 3
        ? (t("sg_almost_done") || "Fast geschafft! Noch " + stepsRemaining + " Schritte bis Ihr AI Assistant live ist.")
        : (t("sg_steps_to_go_prefix") || "Noch ") + stepsRemaining + (t("sg_steps_to_go_suffix") || " Schritte bis Ihr AI Assistant live ist")}
    </div>}

    {/* Step categories */}
    {Object.entries(STEPS).map(([cat, steps]) => {
      const meta = CATEGORY_META[cat];
      const cp = progress.byCategory[cat];
      return <div key={cat} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12 }}>{meta.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{meta.label}</span>
          <span style={{ fontSize: 11, color: "rgba(167,177,195,0.3)" }}>— {meta.desc}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: cp?.done === cp?.total ? "#10b981" : "rgba(167,177,195,0.4)" }}>{cp?.done}/{cp?.total}</span>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {steps.map(step => {
            const done = step.check(clinic);
            return <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: done ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${done ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", transition: "all .15s" }} onMouseEnter={e => { if (!done) { e.currentTarget.style.borderColor = "rgba(76,201,255,0.2)"; e.currentTarget.style.background = "rgba(76,201,255,0.04)"; } }} onMouseLeave={e => { if (!done) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; } }} onClick={() => handleStepClick(step)}>
              <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{done ? "✓" : step.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: done ? "#10b981" : "rgba(232,238,252,0.88)" }}>{step.label}</div>
                <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 1 }}>{step.desc}</div>
              </div>
              {!done && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {step.time && <span style={{ fontSize: 10, color: "rgba(167,177,195,0.3)" }}>ca. {step.time}</span>}
                <button onClick={e => { e.stopPropagation(); handleStepClick(step); }} style={{ padding: "5px 12px", borderRadius: 7, background: `${meta.color}15`, border: `1px solid ${meta.color}30`, color: meta.color, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("sg_set_up") || "Einrichten"} →</button>
              </div>}
              {done && <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>{t("done") || "Fertig"}</span>}
            </div>;
          })}
        </div>
      </div>;
    })}

    {progress.pct === 100 && <div style={{ padding: 14, borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", textAlign: "center", marginTop: 8 }}>
      <span style={{ fontSize: 24 }}>🎉</span>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#10b981", marginTop: 4 }}>{t("sg_all_set_message") || "Alles eingerichtet!"}</div>
      <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 4 }}>{t("sg_ai_ready") || "Ihr AI Assistant ist jetzt live und bereit, Patienten zu betreuen."}</div>
    </div>}
  </div>;
}
