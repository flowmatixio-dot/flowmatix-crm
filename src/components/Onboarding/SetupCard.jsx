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

import { useEffect, useState, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";
import { navigateToSetupSection } from "../../lib/setupNav";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

const STEP_DEFS = [
  {
    key: "clinic",
    section: "clinic",
    icon: "🏥",
    label:    { de: "Klinikdaten",          en: "Clinic data",        tr: "Klinik bilgileri" },
    sublabel: { de: "Name, Adresse, Land",  en: "Name, address, country", tr: "İsim, adres, ülke" },
    cta:      { de: "Klinikdaten ergänzen", en: "Complete clinic info", tr: "Klinik bilgilerini tamamla" },
  },
  {
    key: "treatment",
    section: "treatment",
    icon: "💉",
    label:    { de: "Behandlung",            en: "Treatment",          tr: "Tedavi" },
    sublabel: { de: "Mind. 1 Behandlung",   en: "At least 1 treatment", tr: "En az 1 tedavi" },
    cta:      { de: "Behandlung hinzufügen", en: "Add treatment",      tr: "Tedavi ekle" },
  },
  {
    key: "doctor",
    section: "doctor",
    icon: "👨‍⚕️",
    label:    { de: "Arzt",            en: "Doctor",       tr: "Doktor" },
    sublabel: { de: "Mind. 1 Arzt",   en: "At least 1 doctor", tr: "En az 1 doktor" },
    cta:      { de: "Arzt hinzufügen", en: "Add doctor",   tr: "Doktor ekle" },
  },
  {
    key: "whatsapp",
    section: "whatsapp",
    icon: "💬",
    label:    { de: "Eigene WhatsApp-Nummer", en: "Own WhatsApp number",       tr: "Kendi WhatsApp numarası" },
    sublabel: { de: "Produktive Verbindung",  en: "Production connection",      tr: "Üretim bağlantısı" },
    cta:      { de: "WhatsApp verbinden",     en: "Connect WhatsApp",           tr: "WhatsApp bağla" },
    optional: true,
  },
];

export default function SetupCard() {
  const { setView } = useApp();
  const lang = localStorage.getItem("fm_lang") || "de";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Completed → minimal celebratory tile
  if (status.completed) {
    return (
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(52,211,153,0.03))",
          border: "1px solid rgba(16,185,129,0.18)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 20 }}>✅</span>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>
          {T("Setup complete", "Setup abgeschlossen", "Kurulum tamamlandı")}
        </div>
      </div>
    );
  }

  const progress = status.progress || 0;
  const steps = status.steps || {};

  // Dynamic primary CTA — points at the next missing required step
  const nextDef = STEP_DEFS.find((s) => !steps[s.key] && !s.optional)
    || STEP_DEFS.find((s) => !steps[s.key]);
  const ctaLabel = nextDef ? (nextDef.cta[lang] || nextDef.cta.de) : (T("Continue setup", "Setup fortsetzen", "Kuruluma devam et"));

  return (
    <div
      style={{
        padding: "22px 24px",
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(76,201,255,0.05), rgba(255,138,42,0.025))",
        border: "1px solid rgba(76,201,255,0.18)",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 5, letterSpacing: -0.2 }}>
            {T(
              `Your system is ${progress}% set up`,
              `Dein System ist zu ${progress}% eingerichtet`,
              `Sisteminiz %${progress} kuruldu`
            )}
          </div>
          <div style={{ fontSize: 13, color: "rgba(200,215,240,0.65)", lineHeight: 1.5 }}>
            {T(
              "Complete the final steps so your bot works correctly.",
              "Schließe die letzten Schritte ab, damit dein Bot korrekt arbeitet.",
              "Botunuzun düzgün çalışması için son adımları tamamlayın."
            )}
          </div>
        </div>
        {nextDef && (
          <button
            onClick={() => navigateToSetupSection(setView, nextDef.section)}
            style={{
              padding: "11px 20px",
              background: "linear-gradient(135deg, #4cc9ff, #2892d7)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
              boxShadow: "0 4px 18px rgba(76,201,255,0.25)",
              transition: "transform .15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            {ctaLabel} →
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden", marginBottom: 18 }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: progress >= 75 ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #4cc9ff, #2892d7)",
            transition: "width .3s",
            borderRadius: 4,
          }}
        />
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
