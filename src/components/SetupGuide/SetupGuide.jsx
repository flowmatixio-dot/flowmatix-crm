import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";

const STEPS = {
  required: [
    { id: "profile", icon: "🏥", label: "sg_profile", desc: "sg_profile_desc", check: c => !!(c.name && c.address && c.phone && c.clinicEmail), action: "settings" },
    { id: "calendar", icon: "📅", label: "sg_calendar", desc: "sg_calendar_desc", check: c => !!(c.aiConfig?.bookingRules), action: "appointments" },
  ],
  recommended: [
    { id: "team", icon: "👥", label: "sg_team", desc: "sg_team_desc", check: c => (c.team?.length || 0) >= 2, action: "settings" },
    { id: "invoicing", icon: "🧾", label: "sg_invoice", desc: "sg_invoice_desc", check: c => !!(c.bankName && c.iban), action: "settings" },
    { id: "drivers", icon: "🚗", label: "sg_drivers", desc: "sg_drivers_desc", check: c => (c.drivers?.length || 0) >= 1, action: "settings" },
    { id: "automations", icon: "⚙️", label: "sg_automations", desc: "sg_automations_desc", check: c => (c.automations?.filter(a => a.active)?.length || 0) >= 2, action: "automations" },
  ],
  optional: [
    { id: "flights", icon: "✈️", label: "sg_flights", desc: "sg_flights_desc", check: c => c.logisticsConfig?.autoNotifyDriver === true, action: "settings" },
    { id: "templates", icon: "📝", label: "sg_templates", desc: "sg_templates_desc", check: c => !!(c.logisticsConfig?.pickupTemplateEn), action: "settings" },
    { id: "languages", icon: "🌐", label: "sg_languages", desc: "sg_languages_desc", check: c => (c.aiConfig?.allowedLangs?.length || 0) >= 3, action: "ai_control" },
    { id: "faq", icon: "❓", label: "sg_faq", desc: "sg_faq_desc", check: c => (c.aiConfig?.faq?.length || 0) >= 2, action: "ai_control" },
  ],
};

const CATEGORY_META = {
  required: { label: "sg_required", color: "#ef4444", icon: "🔴", desc: "sg_required_desc" },
  recommended: { label: "sg_recommended", color: "#fbbf24", icon: "🟡", desc: "sg_recommended_desc" },
  optional: { label: "sg_optional", color: "#10b981", icon: "🟢", desc: "sg_optional_desc" },
};

export default function SetupGuide() {
  const { clinic, setView, showT, t } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [detailStep, setDetailStep] = useState(null);

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
  }, [clinic]);

  if (!clinic) return null;
  // Hide if all done
  const dismissed = progress.pct === 100;

  const handleStepClick = (step) => {
    if (step.check(clinic)) {
      showT(`${t(step.label)} already configured`);
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
            <div style={{ fontWeight: 800, fontSize: 15 }}>{progress.pct === 100 ? "Setup Complete!" : t("sg_title")}</div>
            <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 2 }}>{progress.done} / {progress.total} {t("sg_steps_done")}</div>
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
      {/* Category indicators */}
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        {Object.entries(CATEGORY_META).map(([cat, meta]) => {
          const cp = progress.byCategory[cat];
          return <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <span>{meta.icon}</span>
            <span style={{ color: cp?.done === cp?.total ? "#10b981" : "rgba(167,177,195,0.5)", fontWeight: 600 }}>{t(meta.label)}</span>
            <span style={{ color: "rgba(167,177,195,0.3)" }}>{cp?.done}/{cp?.total}</span>
          </div>;
        })}
      </div>
    </div>;
  }

  // Expanded full guide
  return <div style={{ padding: 22, borderRadius: 16, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.1)", marginBottom: 22 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🛠️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Clinic Setup Guide</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 2 }}>{progress.done} / {progress.total} — {progress.pct}% {t("sg_pct_done")}</div>
        </div>
      </div>
      <button onClick={() => setExpanded(false)} style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>▲ {t("collapse")}</button>
    </div>

    {/* Progress bar */}
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 20 }}>
      <div style={{ height: 8, borderRadius: 4, background: progress.pct === 100 ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)", width: `${progress.pct}%`, transition: "width .5s ease" }} />
    </div>

    {/* Step categories */}
    {Object.entries(STEPS).map(([cat, steps]) => {
      const meta = CATEGORY_META[cat];
      const cp = progress.byCategory[cat];
      return <div key={cat} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12 }}>{meta.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{t(meta.label)}</span>
          <span style={{ fontSize: 11, color: "rgba(167,177,195,0.3)" }}>— {t(meta.desc)}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: cp?.done === cp?.total ? "#10b981" : "rgba(167,177,195,0.4)" }}>{cp?.done}/{cp?.total}</span>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {steps.map(step => {
            const done = step.check(clinic);
            const isDetail = detailStep === step.id;
            return <div key={step.id}>
              <div onClick={() => setDetailStep(isDetail ? null : step.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: done ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${done ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", transition: "all .15s" }} onMouseEnter={e => { if (!done) { e.currentTarget.style.borderColor = "rgba(76,201,255,0.2)"; e.currentTarget.style.background = "rgba(76,201,255,0.04)"; } }} onMouseLeave={e => { if (!done) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; } }}>
                <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{done ? "✅" : step.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: done ? "#10b981" : "rgba(232,238,252,0.88)", textDecoration: done ? "line-through" : "none" }}>{t(step.label)}</div>
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 1 }}>{t(step.desc)}</div>
                </div>
                {!done && <button onClick={e => { e.stopPropagation(); handleStepClick(step); }} style={{ padding: "5px 12px", borderRadius: 7, background: `${meta.color}12`, border: `1px solid ${meta.color}25`, color: meta.color, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("sg_setup")} →</button>}
                {done && <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>{t("done")}</span>}
              </div>
            </div>;
          })}
        </div>
      </div>;
    })}

    {progress.pct === 100 && <div style={{ padding: 14, borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", textAlign: "center", marginTop: 8 }}>
      <span style={{ fontSize: 24 }}>🎉</span>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#10b981", marginTop: 4 }}>{t("sg_all_set")}</div>
      <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 4 }}>{t("sg_ai_ready")}</div>
    </div>}
  </div>;
}
