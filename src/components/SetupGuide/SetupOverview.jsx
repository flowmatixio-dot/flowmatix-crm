import { SETUP_CATS, CHECKS } from "./setupShared";

const TIER_META = {
  required:    { label: { de: "Erforderlich", en: "Required", tr: "Gerekli" },         color: "#4cc9ff", bg: "rgba(76,201,255,0.04)", border: "rgba(76,201,255,0.1)",  icon: "🔵", desc: { de: "Diese Schritte müssen abgeschlossen sein", en: "These steps must be completed", tr: "Bu adımlar tamamlanmalıdır" } },
  recommended: { label: { de: "Empfohlen", en: "Recommended", tr: "Önerilen" },         color: "#ff8a2a", bg: "rgba(255,138,42,0.03)", border: "rgba(255,138,42,0.08)", icon: "🟠", desc: { de: "Für den vollen Funktionsumfang", en: "For full functionality", tr: "Tam işlevsellik için" } },
  optional:    { label: { de: "Optional", en: "Optional", tr: "İsteğe bağlı" },         color: "rgba(167,177,195,0.5)", bg: "rgba(255,255,255,0.015)", border: "rgba(255,255,255,0.05)", icon: "⚪", desc: { de: "Zusätzliche Funktionen", en: "Additional features", tr: "Ek özellikler" } },
};

export default function SetupOverview({ clinic, progress, isDone, setTab, t, lang }) {
  const l = lang || "de";
  const steps = SETUP_CATS.filter(c => c.id !== "overview");
  const tiers = ["required", "recommended", "optional"];

  const stepsRemaining = progress.total - progress.done;
  const pctColor = progress.pct === 100 ? "#10b981" : "#4cc9ff";

  return (
    <div>
      {/* ── Header with progress ring ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
        {/* Progress ring */}
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={pctColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress.pct / 100)}`}
              style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: pctColor }}>
            {progress.pct}%
          </div>
        </div>
        {/* Text */}
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "var(--text-primary)" }}>{t("setup_overview_title") || "Einrichtung"}</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            {progress.pct === 100
              ? (t("sg_setup_complete_desc") || "Deine Klinik ist vollständig eingerichtet.")
              : <>{progress.done} / {progress.total} {t("sg_steps_completed") || "Schritte abgeschlossen"} — {stepsRemaining <= 3
                ? (t("sg_almost_done_prefix") || "Fast geschafft!")
                : (t("setup_overview_desc_new") || "Schließe die Schritte ab, um loszulegen.")}</>}
          </p>
        </div>
      </div>

      {/* ── Tier sections ── */}
      {tiers.map(tier => {
        const tierSteps = steps.filter(s => s.tier === tier);
        if (tierSteps.length === 0) return null;
        const meta = TIER_META[tier];
        const tierDone = tierSteps.filter(s => isDone(s.id)).length;
        const allDone = tierDone === tierSteps.length;

        return <div key={tier} style={{ marginBottom: 24 }}>
          {/* Tier header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: allDone ? "#10b981" : meta.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", color: allDone ? "#10b981" : meta.color }}>{meta.label[l] || meta.label.de}</span>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>— {meta.desc[l] || meta.desc.de}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: allDone ? "#10b981" : "var(--text-faint)", padding: "2px 8px", borderRadius: 6, background: allDone ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)" }}>{tierDone}/{tierSteps.length}</span>
          </div>

          {/* Step cards */}
          <div style={{ display: "grid", gap: 8 }}>
            {tierSteps.map(cat => {
              const done = isDone(cat.id);
              return <div key={cat.id} onClick={() => setTab(cat.id)} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14, cursor: "pointer", transition: "all .2s",
                background: done ? "rgba(16,185,129,0.03)" : "var(--bg-section)",
                border: `1px solid ${done ? "rgba(16,185,129,0.12)" : "var(--border-default)"}`,
              }}
                onMouseEnter={e => { if (!done) { e.currentTarget.style.borderColor = meta.border; e.currentTarget.style.background = meta.bg; e.currentTarget.style.transform = "translateX(4px)"; } }}
                onMouseLeave={e => { if (!done) { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.background = "var(--bg-section)"; e.currentTarget.style.transform = "none"; } }}
              >
                {/* Icon */}
                <div style={{ width: 38, height: 38, borderRadius: 10, background: done ? "rgba(16,185,129,0.1)" : `${meta.color}10`, border: `1px solid ${done ? "rgba(16,185,129,0.2)" : `${meta.color}20`}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 16 : 18, flexShrink: 0, color: done ? "#10b981" : "inherit" }}>
                  {done ? "✓" : cat.icon}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: done ? "#10b981" : "var(--text-primary)", marginBottom: 2 }}>{t(cat.key) || cat.id}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{cat.desc}</div>
                </div>
                {/* Right: status + time */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {done
                    ? <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", padding: "3px 10px", borderRadius: 7, background: "rgba(16,185,129,0.08)" }}>{t("done") || "Fertig"}</span>
                    : <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, padding: "3px 10px", borderRadius: 7, background: `${meta.color}12` }}>{t("sg_open") || "Öffnen"}</span>}
                  {!done && cat.time && <span style={{ fontSize: 10, color: "var(--text-faint)" }}>⏱ {cat.time}</span>}
                </div>
              </div>;
            })}
          </div>
        </div>;
      })}

      {/* ── Completion celebration ── */}
      {progress.pct === 100 && <div style={{ padding: 24, borderRadius: 16, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", textAlign: "center", marginTop: 8 }}>
        <span style={{ fontSize: 36 }}>🎉</span>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#10b981", marginTop: 8 }}>{t("sg_all_set") || "Alles eingerichtet!"}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{t("sg_ai_ready") || "Ihr AI Assistant ist jetzt live und bereit."}</div>
      </div>}
    </div>
  );
}
