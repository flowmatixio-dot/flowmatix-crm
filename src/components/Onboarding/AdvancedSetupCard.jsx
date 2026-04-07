/**
 * AdvancedSetupCard — "Volles Potenzial freischalten"
 *
 * Second-layer onboarding card. Sits on the dashboard ONLY (no banner)
 * directly underneath the SetupCard. Visible regardless of whether the
 * required setup is finished — purpose is gradual optimization.
 *
 * Reads /api/v1/clinic/onboarding-status .advanced.* fields. Each item
 * is computed live by the backend from source-of-truth tables.
 *
 * Strict separation from required setup:
 *  - Different title/tone (optional optimization, not urgent setup)
 *  - Different visual treatment (warmer accent, less alarm)
 *  - No CTA bar — every checklist item is its own jump-target
 *
 * Spec items: booking_rules, doctor_assignment, payments, team,
 * automations, integrations.
 */

import { useEffect, useState, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

const ADVANCED_STEPS = [
  {
    key: "booking_rules",
    icon: "📅",
    label:    { de: "Buchungsregeln konfigurieren", en: "Configure booking rules", tr: "Rezervasyon kurallarını yapılandır" },
    sublabel: { de: "Vorlaufzeit, Zeitfenster, Pausen", en: "Lead time, slots, breaks", tr: "Ön süre, saatler, molalar" },
    view: "ai_control",
  },
  {
    key: "doctor_assignment",
    icon: "👨‍⚕️",
    label:    { de: "Arzt-Zuweisung optimieren", en: "Optimize doctor assignment", tr: "Doktor atamasını optimize et" },
    sublabel: { de: "Round-Robin, Spezialisierung, Last", en: "Round-robin, specialty, load", tr: "Sırayla, uzmanlık, yük" },
    view: "settings",
  },
  {
    key: "payments",
    icon: "💳",
    label:    { de: "Zahlungen aktivieren", en: "Enable payments", tr: "Ödemeleri etkinleştir" },
    sublabel: { de: "Stripe, Anzahlungen, PayPal", en: "Stripe, deposits, PayPal", tr: "Stripe, depozitolar, PayPal" },
    view: "payments",
  },
  {
    key: "team",
    icon: "👥",
    label:    { de: "Team einrichten", en: "Set up team", tr: "Ekibi kur" },
    sublabel: { de: "Koordinatoren, Ärzte einladen", en: "Invite coordinators & doctors", tr: "Koordinatörleri ve doktorları davet et" },
    view: "settings",
  },
  {
    key: "automations",
    icon: "⚡",
    label:    { de: "Automationen aktivieren", en: "Activate automations", tr: "Otomasyonları etkinleştir" },
    sublabel: { de: "Erinnerungen, Follow-ups, Nachsorge", en: "Reminders, follow-ups, aftercare", tr: "Hatırlatmalar, takipler, bakım" },
    view: "automations",
  },
  {
    key: "integrations",
    icon: "🔌",
    label:    { de: "Integrationen verbinden", en: "Connect integrations", tr: "Entegrasyonları bağla" },
    sublabel: { de: "Google Calendar, n8n, Telegram", en: "Google Calendar, n8n, Telegram", tr: "Google Calendar, n8n, Telegram" },
    view: "settings",
  },
];

export default function AdvancedSetupCard() {
  const { setView } = useApp();
  const lang = localStorage.getItem("fm_lang") || "de";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/onboarding-status");
      setStatus(res?.advanced || null);
    } catch (e) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchStatus]);

  if (loading || !status) return null;

  const progress = status.progress || 0;
  const steps = status.steps || {};

  return (
    <div
      style={{
        padding: "22px 24px",
        borderRadius: 16,
        // Warmer accent than required setup card — feels like opportunity, not urgency
        background: "linear-gradient(135deg, rgba(255,138,42,0.05), rgba(212,175,55,0.025))",
        border: "1px solid rgba(255,138,42,0.18)",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: -0.2 }}>
              {T("Unlock the full potential", "Volles Potenzial freischalten", "Tam potansiyeli ortaya çıkarın")}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "rgba(200,215,240,0.65)", lineHeight: 1.5 }}>
            {T(
              "Optimize your system for more bookings and automation.",
              "Optimiere dein System für mehr Buchungen und Automatisierung.",
              "Daha fazla rezervasyon ve otomasyon için sisteminizi optimize edin."
            )}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24", lineHeight: 1 }}>
            {progress}%
          </div>
          <div style={{ fontSize: 10, color: "rgba(167,177,195,0.55)", marginTop: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {T("Optimized", "Optimiert", "Optimize")}
          </div>
        </div>
      </div>

      {/* Progress bar — warm gradient distinct from required setup */}
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden", marginBottom: 18 }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #fbbf24, #ff8a2a)",
            transition: "width .3s",
            borderRadius: 3,
          }}
        />
      </div>

      {/* Detailed checklist — 2 columns on wider screens for better density */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
        {ADVANCED_STEPS.map((s) => {
          const done = !!steps[s.key];
          return (
            <button
              key={s.key}
              onClick={() => setView(s.view)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 11,
                background: done ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.03)",
                border: done ? "1px solid rgba(16,185,129,0.18)" : "1px solid rgba(255,255,255,0.06)",
                color: done ? "#10b981" : "rgba(232,238,252,0.85)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                width: "100%",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(2px)";
                if (!done) e.currentTarget.style.borderColor = "rgba(255,138,42,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                if (!done) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 99,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: done ? "rgba(16,185,129,0.18)" : "rgba(255,138,42,0.08)",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : s.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.label[lang] || s.label.de}
                </div>
                {!done && (
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.55)", fontWeight: 500, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.sublabel[lang] || s.sublabel.de}
                  </div>
                )}
              </div>
              {!done && <span style={{ opacity: 0.4, fontSize: 12, flexShrink: 0 }}>→</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
