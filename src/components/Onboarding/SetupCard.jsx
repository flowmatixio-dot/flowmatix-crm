/**
 * SetupCard — detailed dashboard variant of the onboarding progress.
 * Reads /api/v1/clinic/onboarding-status .minimal.* fields.
 *
 * Pair with SetupBanner: banner is the compact summary across all pages,
 * card is the detailed action area on the dashboard only. Card shows the
 * full checklist + a single dynamic primary CTA targeting the next missing
 * step ("Arzt hinzufügen", "Behandlung hinzufügen", etc).
 *
 * The "whatsapp" item explicitly means PRODUCTION WhatsApp (own number),
 * not the trial test number — backend logic excludes pool aliases.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";
import { navigateToSetupSection } from "../../lib/setupNav";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

// Required setup steps shown in the SetupCard.
//
// NOTE: the WhatsApp step is conditionally hidden in trial mode. Trial
// users cannot see "Eigene WhatsApp-Nummer" anywhere — they're on the
// shared test number and there is nothing to connect. Only after a
// purchase (workspace_state === 'active') does whatsapp become a real
// setup step. Filtering happens below in the component, not here.
const ALL_STEP_DEFS = [
  {
    key: "clinic",
    section: "clinic",
    icon: "🏥",
    label:    { de: "Klinikdaten",          en: "Clinic data",        tr: "Klinik bilgileri" },
    sublabel: { de: "Name, Adresse, Land",  en: "Name, address, country", tr: "İsim, adres, ülke" },
    cta:      { de: "Klinikdaten ergänzen", en: "Complete clinic info", tr: "Klinik bilgilerini tamamla" },
    trialOnly: false,
    paidOnly: false,
  },
  {
    key: "treatment",
    section: "treatment",
    icon: "💉",
    label:    { de: "Behandlung",            en: "Treatment",          tr: "Tedavi" },
    sublabel: { de: "Mind. 1 Behandlung",   en: "At least 1 treatment", tr: "En az 1 tedavi" },
    cta:      { de: "Behandlung hinzufügen", en: "Add treatment",      tr: "Tedavi ekle" },
    trialOnly: false,
    paidOnly: false,
  },
  {
    key: "doctor",
    section: "doctor",
    icon: "👨‍⚕️",
    label:    { de: "Arzt",            en: "Doctor",       tr: "Doktor" },
    sublabel: { de: "Mind. 1 Arzt",   en: "At least 1 doctor", tr: "En az 1 doktor" },
    cta:      { de: "Arzt hinzufügen", en: "Add doctor",   tr: "Doktor ekle" },
    trialOnly: false,
    paidOnly: false,
  },
  {
    key: "whatsapp",
    section: "whatsapp",
    icon: "💬",
    label:    { de: "Eigene WhatsApp-Nummer", en: "Own WhatsApp number",       tr: "Kendi WhatsApp numarası" },
    sublabel: { de: "Produktive Verbindung",  en: "Production connection",      tr: "Üretim bağlantısı" },
    cta:      { de: "WhatsApp verbinden",     en: "Connect WhatsApp",           tr: "WhatsApp bağla" },
    paidOnly: true,  // hidden in trial — trial uses the shared test number
  },
];

export default function SetupCard() {
  const { setView, workspaceState } = useApp();
  const lang = localStorage.getItem("fm_lang") || "de";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // plan_active: true after the customer has paid and the workspace
  // is fully active. Trial users are in 'live_test', activation_pending,
  // demo, or trial_expired — none of those should see "Eigene WhatsApp".
  const planActive = workspaceState === 'active';

  // Filter steps based on trial vs paid:
  //  - paidOnly  steps are hidden until plan_active
  //  - trialOnly steps would be hidden after activation (none currently)
  const STEP_DEFS = useMemo(
    () => ALL_STEP_DEFS.filter((s) => {
      if (s.paidOnly && !planActive) return false;
      if (s.trialOnly && planActive) return false;
      return true;
    }),
    [planActive]
  );

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/onboarding-status");
      setStatus(res?.minimal || null);
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

  // Completed → subtle "system ready" tile (intentionally low-emphasis,
  // no green celebration — the user did not actually complete setup,
  // saying "Setup complete" felt fake).
  if (status.completed) {
    return (
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "#10b981", flexShrink: 0 }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(232,238,252,0.75)" }}>
          {T("System ready", "System ist bereit", "Sistem hazır")}
        </div>
      </div>
    );
  }

  const steps = status.steps || {};

  return (
    <div
      style={{
        padding: "20px 22px",
        borderRadius: 14,
        // Dezenter Look — keine Pressure mehr, keine Accent-Borders
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 16,
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,238,252,0.85)", marginBottom: 4, letterSpacing: -0.1 }}>
          {T(
            "Optional: optimize your system further",
            "Optional: System weiter optimieren",
            "İsteğe bağlı: sisteminizi daha da optimize edin"
          )}
        </div>
        <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", lineHeight: 1.5 }}>
          {T(
            "Add more details to get even better results.",
            "Füge weitere Details hinzu, um noch bessere Ergebnisse zu erzielen.",
            "Daha iyi sonuçlar için daha fazla ayrıntı ekleyin."
          )}
        </div>
      </div>

      {/* Detailed checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {STEP_DEFS.map((s) => {
          const done = !!steps[s.key];
          return (
            <button
              key={s.key}
              onClick={() => navigateToSetupSection(setView, s.section)}
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
                if (!done) e.currentTarget.style.borderColor = "rgba(76,201,255,0.25)";
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
                  background: done ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.05)",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : s.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{s.label[lang] || s.label.de}</div>
                {!done && (
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.55)", fontWeight: 500, marginTop: 1 }}>
                    {s.sublabel[lang] || s.sublabel.de}
                  </div>
                )}
              </div>
              {s.optional && !done && (
                <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)" }}>
                  {T("OPTIONAL", "OPTIONAL", "İSTEĞE BAĞLI")}
                </span>
              )}
              {!done && <span style={{ opacity: 0.4, fontSize: 12 }}>→</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
