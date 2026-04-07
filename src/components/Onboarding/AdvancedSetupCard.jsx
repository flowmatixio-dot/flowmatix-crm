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
import { navigateToSetupSection } from "../../lib/setupNav";

const T = (en, de, tr) => ({ en, de, tr }[localStorage.getItem("fm_lang") || "de"] || de);

// Order matches the SettingsView tabs (top to bottom): general → team
// → treatments → doctors → booking_rules → payments → drivers → ai →
// automations → account/2FA → integrations → whatsapp → google_drive.
// Each step has an optional `requires` (other key that must be true
// before this step is clickable) and an optional `lockedHint`.
const ADVANCED_STEPS = [
  {
    key: "general",
    section: "general",
    icon: "🏥",
    label:    { de: "Allgemein", en: "General", tr: "Genel" },
    sublabel: { de: "Klinik-Stammdaten, Adresse, Ansprechpartner", en: "Clinic basics, address, contact", tr: "Klinik bilgileri, adres, iletişim" },
    priority: "recommended",
  },
  {
    key: "team",
    section: "team",
    icon: "👥",
    label:    { de: "Team einrichten", en: "Set up team", tr: "Ekibi kur" },
    sublabel: { de: "Koordinatoren, Ärzte einladen", en: "Invite coordinators & doctors", tr: "Koordinatörleri ve doktorları davet et" },
  },
  {
    key: "treatments",
    section: "treatments",
    icon: "💉",
    label:    { de: "Behandlungsarten", en: "Treatment types", tr: "Tedavi türleri" },
    sublabel: { de: "Preise, Dauer, Anzahlungs-Logik", en: "Prices, duration, deposit logic", tr: "Fiyatlar, süre, depozito" },
    priority: "optional",
  },
  {
    key: "doctor_assignment",
    section: "doctor_assignment",
    icon: "👨‍⚕️",
    label:    { de: "Arzt-Zuweisung optimieren", en: "Optimize doctor assignment", tr: "Doktor atamasını optimize et" },
    sublabel: { de: "Round-Robin, Spezialisierung, Last", en: "Round-robin, specialty, load", tr: "Sırayla, uzmanlık, yük" },
  },
  {
    key: "booking_rules",
    section: "booking_rules",
    icon: "📅",
    label:    { de: "Buchungsregeln konfigurieren", en: "Configure booking rules", tr: "Rezervasyon kurallarını yapılandır" },
    sublabel: { de: "Vorlaufzeit, Zeitfenster, Pausen", en: "Lead time, slots, breaks", tr: "Ön süre, saatler, molalar" },
    priority: "optional",
  },
  {
    key: "payments",
    section: "payments",
    icon: "💳",
    label:    { de: "Zahlungen aktivieren", en: "Enable payments", tr: "Ödemeleri etkinleştir" },
    sublabel: { de: "Stripe, Anzahlungen, PayPal", en: "Stripe, deposits, PayPal", tr: "Stripe, depozitolar, PayPal" },
    priority: "optional",
  },
  {
    key: "drivers",
    section: "drivers",
    icon: "🚗",
    label:    { de: "Fahrer & Transfers einrichten", en: "Set up drivers & transfers", tr: "Sürücüler ve transferleri kur" },
    sublabel: { de: "Automatisiere Flughafen- und Hotel-Transfers", en: "Automate airport & hotel transfers", tr: "Havalimanı ve otel transferlerini otomatikleştir" },
  },
  {
    key: "ai_settings",
    section: "ai_settings",
    icon: "🤖",
    label:    { de: "KI-Bot Einstellungen", en: "AI bot settings", tr: "AI bot ayarları" },
    sublabel: { de: "Tonalität, Begrüßung, Sprachen, Foto-Anforderung", en: "Tone, greeting, languages, photo rules", tr: "Ton, karşılama, diller, fotoğraf kuralları" },
  },
  {
    key: "automations",
    section: "automations",
    icon: "⚡",
    label:    { de: "Automationen aktivieren", en: "Activate automations", tr: "Otomasyonları etkinleştir" },
    sublabel: { de: "Erinnerungen, Follow-ups, Nachsorge", en: "Reminders, follow-ups, aftercare", tr: "Hatırlatmalar, takipler, bakım" },
    requires: "whatsapp",
    // Special handling: this item must NEVER show as completed until
    // WhatsApp is connected (which only happens after purchase). Even
    // if backend reports automations.active = true, the renderer keeps
    // it in "needs WhatsApp" state.
    forceLockedUntilWhatsapp: true,
    lockedHint: { de: "Verfügbar nach WhatsApp-Verbindung (nach Kauf)", en: "Available after WhatsApp connection (post-purchase)", tr: "WhatsApp bağlandıktan sonra (satın alma sonrası) kullanılabilir" },
  },
  {
    key: "two_factor",
    section: "two_factor",
    icon: "🔐",
    label:    { de: "Zwei-Faktor-Authentifizierung", en: "Two-factor authentication", tr: "İki faktörlü kimlik doğrulama" },
    sublabel: { de: "Konto mit Authenticator-App schützen", en: "Protect your account with an authenticator app", tr: "Hesabınızı authenticator uygulaması ile koruyun" },
    priority: "optional",
  },
  {
    key: "whatsapp",
    section: "whatsapp",
    icon: "💬",
    label:    { de: "WhatsApp verbinden", en: "Connect WhatsApp", tr: "WhatsApp bağla" },
    sublabel: { de: "Eigene Nummer für den Live-Betrieb", en: "Own number for live operation", tr: "Canlı kullanım için kendi numara" },
    paidOnly: true,
  },
  {
    key: "google_drive",
    section: "google_drive",
    icon: "📁",
    label:    { de: "Google Drive verbinden", en: "Connect Google Drive", tr: "Google Drive'ı bağla" },
    sublabel: { de: "Patientenfotos automatisch sichern und organisieren", en: "Automatically save and organize patient photos", tr: "Hasta fotoğraflarını otomatik kaydet ve düzenle" },
    priority: "optional",
  },
];

export default function AdvancedSetupCard() {
  const { setView, workspaceState, showT } = useApp();
  const lang = localStorage.getItem("fm_lang") || "de";

  const [status, setStatus] = useState(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Collapsed by default — saves dashboard space and reduces setup
  // pressure on first impression. State persists in localStorage so
  // a user who expanded it once stays expanded across reloads.
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem("fm_advanced_setup_expanded") === "1"; } catch { return false; }
  });
  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem("fm_advanced_setup_expanded", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  const fetchStatus = useCallback(async () => {
    try {
      const [res, me] = await Promise.all([
        fmApi.apiFetch("/api/v1/clinic/onboarding-status"),
        fmApi.getMe().catch(() => null),
      ]);
      setStatus(res || null);
      setMfaEnabled(!!me?.mfa_enabled);
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

  // Build a unified done-flag map.
  //
  // IMPORTANT: backend "done" flags are mostly seed-defaults — every
  // signed-up clinic gets agent_configured=true, ≥1 treatment, Dr. Demo,
  // working_hours, etc. The user wants none of that to render as green
  // ("kunde muss alles selber machen"). So we ignore the seeded flags
  // and only mark something as done when the user has explicitly
  // completed it (tracked in localStorage `fm_setup_done_<key>`).
  // Real backend signals are still respected for items that genuinely
  // need an external action: whatsapp connection + 2FA toggle.
  const planActive = workspaceState === 'active';
  const userMarked = (key) => {
    try { return localStorage.getItem(`fm_setup_done_${key}`) === "1"; } catch { return false; }
  };
  const legacySteps = status.steps || {};
  const flags = {
    general:           userMarked("general"),
    treatments:        userMarked("treatments"),
    ai_settings:       userMarked("ai_settings"),
    booking_rules:     userMarked("booking_rules"),
    doctor_assignment: userMarked("doctor_assignment"),
    payments:          userMarked("payments"),
    two_factor:        mfaEnabled || userMarked("two_factor"),
    team:              userMarked("team"),
    // whatsapp_connected is a real external action — trust the backend
    whatsapp:          !!legacySteps.whatsapp_connected,
    automations:       userMarked("automations"),
    google_drive:      userMarked("google_drive"),
    drivers:           userMarked("drivers"),
  };

  // Filter: hide paidOnly steps (e.g. whatsapp) until the workspace is active
  const visibleSteps = ADVANCED_STEPS.filter((s) => !s.paidOnly || planActive);

  const handleClick = (s) => {
    // Locked if a prerequisite isn't met yet
    if (s.requires && !flags[s.requires]) {
      const hint = (s.lockedHint && (s.lockedHint[lang] || s.lockedHint.de)) || "Voraussetzung fehlt";
      try { showT && showT(hint); } catch {}
      return;
    }
    // Mark as user-initiated. The next render will show this item as
    // done. Two_factor / whatsapp also fall back to backend flags so
    // they update when the real action completes.
    try { localStorage.setItem(`fm_setup_done_${s.key}`, "1"); } catch {}
    navigateToSetupSection(setView, s.section);
  };

  return (
    <div
      style={{
        padding: "20px 22px",
        borderRadius: 14,
        // Dezenter — keine Pressure, keine Accent-Border
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 16,
      }}
    >
      {/* Collapsible header — clicking toggles the checklist below.
          Default state is collapsed so the dashboard stays focused on
          the demo as the primary action. No "X/Y" counter — that
          created a wizard / setup-progress feeling we want to avoid. */}
      <button
        onClick={toggleExpanded}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: 0,
          marginBottom: expanded ? 14 : 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(167,177,195,0.7)", letterSpacing: -0.05 }}>
              {T("🚀 Win more patients automatically", "🚀 Mehr Patienten automatisch gewinnen", "🚀 Otomatik olarak daha fazla hasta kazanın")}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
              background: "rgba(255,255,255,0.04)", color: "rgba(167,177,195,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              letterSpacing: 0.2, whiteSpace: "nowrap",
            }}>
              {T("Optional", "Optional", "İsteğe bağlı")}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.45)", lineHeight: 1.5 }}>
            {T(
              "Each upgrade increases bookings and automation.",
              "Jede Optimierung steigert Buchungen und Automatisierung.",
              "Her optimizasyon rezervasyonları ve otomasyonu artırır."
            )}
          </div>
        </div>
        <span style={{
          fontSize: 11, color: "rgba(167,177,195,0.55)",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform .2s",
          display: "inline-block",
          flexShrink: 0,
        }}>▶</span>
      </button>

      {/* Detailed checklist — only rendered when expanded.
          Three-tier priority styling (no red anywhere — would create
          pressure / "broken system" perception):
            COMPLETED   → green check, no badge
            RECOMMENDED → soft orange highlight + "Für bessere Ergebnisse"
            OPTIONAL    → neutral + "Optional" badge
            (default)   → neutral, no badge */}
      {expanded && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
        {visibleSteps.map((s) => {
          // forceLockedUntilWhatsapp: even if the backend reports the
          // item as done, keep it visually locked until WhatsApp is
          // actually connected (e.g. automations only really run after
          // the org has its own WhatsApp number post-purchase).
          const blockedByWhatsapp = !!s.forceLockedUntilWhatsapp && !flags.whatsapp;
          const done = !!flags[s.key] && !blockedByWhatsapp;
          const locked = !done && (blockedByWhatsapp || (!!s.requires && !flags[s.requires]));
          const isRecommended = !done && !locked && s.priority === "recommended";
          const isOptional = !done && !locked && s.priority === "optional";

          // Background / border by priority
          let bgColor = "rgba(255,255,255,0.03)";
          let borderColor = "rgba(255,255,255,0.06)";
          if (done) {
            bgColor = "rgba(16,185,129,0.05)";
            borderColor = "rgba(16,185,129,0.18)";
          } else if (isRecommended) {
            bgColor = "rgba(255,138,42,0.05)";
            borderColor = "rgba(255,138,42,0.18)";
          }

          return (
            <button
              key={s.key}
              onClick={() => handleClick(s)}
              title={locked ? (s.lockedHint?.[lang] || s.lockedHint?.de || "") : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 11,
                background: bgColor,
                border: `1px solid ${borderColor}`,
                color: done ? "#10b981" : locked ? "rgba(167,177,195,0.5)" : "rgba(232,238,252,0.85)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                width: "100%",
                height: "100%",
                minHeight: 64,
                boxSizing: "border-box",
                transition: "all .15s",
                opacity: locked ? 0.65 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(2px)";
                if (!done && !locked && !isRecommended) e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                if (!done && !locked && !isRecommended) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
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
                  background: done
                    ? "rgba(16,185,129,0.18)"
                    : isRecommended
                      ? "rgba(255,138,42,0.12)"
                      : "rgba(255,255,255,0.05)",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : locked ? "🔒" : s.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.label[lang] || s.label.de}
                  </span>
                  {isRecommended && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(255,138,42,0.12)", color: "#ff8a2a",
                      border: "1px solid rgba(255,138,42,0.25)",
                      letterSpacing: 0.2, textTransform: "none", whiteSpace: "nowrap",
                    }}>
                      {T("Recommended for better results", "Für bessere Ergebnisse", "Daha iyi sonuçlar için")}
                    </span>
                  )}
                  {isOptional && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(255,255,255,0.04)", color: "rgba(167,177,195,0.6)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      letterSpacing: 0.2, textTransform: "none", whiteSpace: "nowrap",
                    }}>
                      {T("Optional", "Optional", "İsteğe bağlı")}
                    </span>
                  )}
                  {locked && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(76,201,255,0.06)", color: "rgba(76,201,255,0.7)",
                      border: "1px solid rgba(76,201,255,0.18)",
                      letterSpacing: 0.2, textTransform: "none", whiteSpace: "normal",
                    }}>
                      {(s.lockedHint?.[lang] || s.lockedHint?.de || "")}
                    </span>
                  )}
                </div>
                {!done && !locked && (
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.55)", fontWeight: 500, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.sublabel[lang] || s.sublabel.de}
                  </div>
                )}
              </div>
              {!done && <span style={{ opacity: 0.4, fontSize: 12, flexShrink: 0 }}>{locked ? "" : "→"}</span>}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
