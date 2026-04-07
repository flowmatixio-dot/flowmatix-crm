/**
 * SetupBanner — slim global progress bar shown above the main CRM content
 * when onboarding is incomplete. Reads /api/v1/clinic/onboarding-status,
 * uses the .minimal.* fields. Persistent across pages, never blocking.
 *
 * Compact summary only — the detailed checklist lives in the Dashboard
 * SetupCard. Banner shows: percentage + progress bar + ONE primary CTA
 * pointing at the next missing step.
 *
 * Hidden when minimal.completed === true.
 */

import { useEffect, useState, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

// Maps the next missing step → (label for CTA, target view)
const STEP_CTA = {
  clinic:    { label: { de: "Klinikdaten ergänzen",  en: "Complete clinic info", tr: "Klinik bilgilerini tamamla" }, view: "settings" },
  treatment: { label: { de: "Behandlung hinzufügen", en: "Add treatment",        tr: "Tedavi ekle" },                view: "settings" },
  doctor:    { label: { de: "Arzt hinzufügen",       en: "Add doctor",           tr: "Doktor ekle" },                view: "settings" },
  whatsapp:  { label: { de: "WhatsApp verbinden",    en: "Connect WhatsApp",     tr: "WhatsApp bağla" },             view: "whatsapp_setup" },
};

export default function SetupBanner() {
  const { setView } = useApp();

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
    const iv = setInterval(fetchStatus, 30000);
    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchStatus]);

  if (loading || !status) return null;
  if (status.completed) return null;

  const progress = status.progress || 0;
  const nextKey = status.nextStep;
  const cta = STEP_CTA[nextKey] || STEP_CTA.clinic;
  const lang = localStorage.getItem("fm_lang") || "de";

  return (
    <div
      style={{
        flexShrink: 0,
        background: "linear-gradient(135deg, rgba(76,201,255,0.05), rgba(255,138,42,0.03))",
        borderBottom: "1px solid rgba(76,201,255,0.15)",
        padding: "10px 32px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, maxWidth: 1400, margin: "0 auto" }}>
        {/* Title + percentage */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>⚙️</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(232,238,252,0.92)", whiteSpace: "nowrap" }}>
            {T("Setup", "Einrichtung", "Kurulum")} <span style={{ color: "#4cc9ff" }}>{progress}%</span>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden", maxWidth: 380 }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: progress >= 75 ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #4cc9ff, #2892d7)",
              transition: "width .3s",
            }}
          />
        </div>

        {/* Subtitle (only on wider screens) */}
        <div style={{ flex: 1, fontSize: 11.5, color: "rgba(167,177,195,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {T(
            "A few quick steps left to finish your setup.",
            "Nur noch wenige Schritte bis zum fertigen Setup.",
            "Kurulumu bitirmek için birkaç hızlı adım."
          )}
        </div>

        {/* Single dynamic CTA */}
        <button
          onClick={() => setView(cta.view)}
          style={{
            padding: "7px 16px",
            background: "rgba(76,201,255,0.1)",
            color: "#4cc9ff",
            fontWeight: 700,
            fontSize: 12,
            border: "1px solid rgba(76,201,255,0.25)",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
            transition: "all .15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(76,201,255,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(76,201,255,0.1)"; }}
        >
          {cta.label[lang] || cta.label.de} →
        </button>
      </div>
    </div>
  );
}
