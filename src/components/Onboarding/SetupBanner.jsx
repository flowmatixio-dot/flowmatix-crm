/**
 * SetupBanner — global progress banner shown above the main CRM content
 * when onboarding is incomplete. Reads /api/v1/clinic/onboarding-status,
 * uses the .minimal.* fields. Persistent across pages, never blocking.
 *
 * Hidden when minimal.completed === true.
 *
 * Click on a checklist item → jumps to the relevant settings page.
 *
 * Spec keys: clinic / treatment / doctor / whatsapp
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

const STEP_DEFS = [
  {
    key: "clinic",
    icon: "🏥",
    label: { de: "Klinikdaten", en: "Clinic data", tr: "Klinik bilgileri" },
    targetView: "settings",
  },
  {
    key: "treatment",
    icon: "💉",
    label: { de: "Behandlung", en: "Treatment", tr: "Tedavi" },
    targetView: "settings",
    targetSection: "treatments",
  },
  {
    key: "doctor",
    icon: "👨‍⚕️",
    label: { de: "Arzt", en: "Doctor", tr: "Doktor" },
    targetView: "settings",
    targetSection: "team",
  },
  {
    key: "whatsapp",
    icon: "💬",
    label: { de: "WhatsApp", en: "WhatsApp", tr: "WhatsApp" },
    targetView: "whatsapp_setup",
    optional: true,
  },
];

export default function SetupBanner() {
  const { setView } = useApp();
  const lang = localStorage.getItem("fm_lang") || "de";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/onboarding-status");
      setStatus(res?.minimal || null);
    } catch (e) {
      // Silent fail — banner just won't show
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Refresh every 30s so checklist updates without manual reload
    const iv = setInterval(fetchStatus, 30000);
    // Also refresh on window focus
    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchStatus]);

  const handleStepClick = useCallback((step) => {
    setView(step.targetView);
  }, [setView]);

  // Don't render anything until we know
  if (loading || !status) return null;
  // Hide if onboarding is complete
  if (status.completed) return null;

  const progress = status.progress || 0;
  const steps = status.steps || {};

  return (
    <div
      style={{
        flexShrink: 0,
        background: "linear-gradient(135deg, rgba(76,201,255,0.06), rgba(255,138,42,0.04))",
        borderBottom: "1px solid rgba(76,201,255,0.18)",
        padding: collapsed ? "10px 32px" : "16px 32px",
        transition: "padding .2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
        {/* Title + percentage */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
              {T("Setup not complete", "Einrichtung unvollständig", "Kurulum tamamlanmadı")} — {progress}%
            </div>
            {!collapsed && (
              <div style={{ fontSize: 11, color: "rgba(200,215,240,0.6)", marginTop: 2 }}>
                {T(
                  "Complete these steps so the bot can do its job",
                  "Schließe diese Schritte ab, damit der Bot seinen Job machen kann",
                  "Botun işini yapabilmesi için bu adımları tamamlayın"
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ flex: "1 1 200px", maxWidth: 300, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: progress >= 75 ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #4cc9ff, #2892d7)",
              transition: "width .3s",
            }}
          />
        </div>

        {/* Checklist (only when not collapsed) */}
        {!collapsed && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STEP_DEFS.map((s) => {
              const done = !!steps[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() => handleStepClick(s)}
                  title={s.label[lang] || s.label.de}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 8,
                    background: done ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)",
                    border: done ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(76,201,255,0.18)",
                    color: done ? "#10b981" : "rgba(200,215,240,0.85)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                  }}
                >
                  <span style={{ fontSize: 13 }}>{done ? "✓" : s.icon}</span>
                  <span>{s.label[lang] || s.label.de}</span>
                  {s.optional && !done && (
                    <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>
                      ({T("optional", "optional", "isteğe bağlı")})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(200,215,240,0.5)",
            cursor: "pointer",
            fontSize: 16,
            padding: 6,
            fontFamily: "inherit",
          }}
          title={collapsed ? T("Expand", "Erweitern", "Genişlet") : T("Collapse", "Einklappen", "Daralt")}
        >
          {collapsed ? "▼" : "▲"}
        </button>
      </div>
    </div>
  );
}
