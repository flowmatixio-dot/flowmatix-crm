/**
 * SetupCard — dashboard card variant of the onboarding progress.
 * Same data source as SetupBanner (/api/v1/clinic/onboarding-status).
 *
 * Hidden when minimal.completed === true. Replaced with a thin "setup
 * complete ✓" tile in that case.
 */

import { useEffect, useState, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

const STEP_DEFS = [
  { key: "clinic",    icon: "🏥", label: { de: "Klinikdaten",  en: "Clinic data", tr: "Klinik bilgileri" }, view: "settings" },
  { key: "treatment", icon: "💉", label: { de: "Behandlung",   en: "Treatment",   tr: "Tedavi" },           view: "settings" },
  { key: "doctor",    icon: "👨‍⚕️", label: { de: "Arzt",         en: "Doctor",      tr: "Doktor" },           view: "settings" },
  { key: "whatsapp",  icon: "💬", label: { de: "WhatsApp",     en: "WhatsApp",    tr: "WhatsApp" },         view: "whatsapp_setup", optional: true },
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
  const nextStep = STEP_DEFS.find((s) => !steps[s.key]);

  return (
    <div
      style={{
        padding: "20px 22px",
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(76,201,255,0.06), rgba(255,138,42,0.04))",
        border: "1px solid rgba(76,201,255,0.18)",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            {T("Complete your setup", "Setup abschließen", "Kurulumu tamamlayın")}
          </div>
          <div style={{ fontSize: 12, color: "rgba(200,215,240,0.6)" }}>
            {progress}% — {T("a few quick steps", "ein paar schnelle Schritte", "birkaç hızlı adım")}
          </div>
        </div>
        {nextStep && (
          <button
            onClick={() => setView(nextStep.view)}
            style={{
              padding: "10px 18px",
              background: "linear-gradient(135deg, #4cc9ff, #2892d7)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            {T("Continue setup", "Weiter", "Devam et")} →
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 14 }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: progress >= 75 ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #4cc9ff, #2892d7)",
            transition: "width .3s",
          }}
        />
      </div>

      {/* Checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {STEP_DEFS.map((s) => {
          const done = !!steps[s.key];
          return (
            <button
              key={s.key}
              onClick={() => setView(s.view)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: done ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)",
                border: done ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.06)",
                color: done ? "#10b981" : "rgba(200,215,240,0.85)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                width: "100%",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
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
              <span style={{ flex: 1 }}>{s.label[lang] || s.label.de}</span>
              {s.optional && !done && (
                <span style={{ fontSize: 10, opacity: 0.6 }}>
                  ({T("optional", "optional", "isteğe bağlı")})
                </span>
              )}
              {!done && <span style={{ opacity: 0.4, fontSize: 11 }}>→</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
