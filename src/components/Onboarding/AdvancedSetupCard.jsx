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

// Each step has an optional `requires` (other key that must be true
// before this step is clickable) and an optional `lockedHint` (shown
// in the tooltip when the user clicks the locked card).
const ADVANCED_STEPS = [
  {
    key: "general",
    section: "general",
    icon: "🏥",
    label:    { de: "Allgemein", en: "General", tr: "Genel" },
    sublabel: { de: "Klinik-Stammdaten, Adresse, Ansprechpartner", en: "Clinic basics, address, contact", tr: "Klinik bilgileri, adres, iletişim" },
  },
  {
    key: "treatments",
    section: "treatments",
    icon: "💉",
    label:    { de: "Behandlungsarten", en: "Treatment types", tr: "Tedavi türleri" },
    sublabel: { de: "Preise, Dauer, Anzahlungs-Logik", en: "Prices, duration, deposit logic", tr: "Fiyatlar, süre, depozito" },
  },
  {
    key: "ai_settings",
    section: "ai_settings",
    icon: "🤖",
    label:    { de: "KI-Bot Einstellungen", en: "AI bot settings", tr: "AI bot ayarları" },
    sublabel: { de: "Tonalität, Begrüßung, Sprachen, Foto-Anforderung", en: "Tone, greeting, languages, photo rules", tr: "Ton, karşılama, diller, fotoğraf kuralları" },
  },
  {
    key: "booking_rules",
    section: "booking_rules",
    icon: "📅",
    label:    { de: "Buchungsregeln konfigurieren", en: "Configure booking rules", tr: "Rezervasyon kurallarını yapılandır" },
    sublabel: { de: "Vorlaufzeit, Zeitfenster, Pausen", en: "Lead time, slots, breaks", tr: "Ön süre, saatler, molalar" },
  },
  {
    key: "doctor_assignment",
    section: "doctor_assignment",
    icon: "👨‍⚕️",
    label:    { de: "Arzt-Zuweisung optimieren", en: "Optimize doctor assignment", tr: "Doktor atamasını optimize et" },
    sublabel: { de: "Round-Robin, Spezialisierung, Last", en: "Round-robin, specialty, load", tr: "Sırayla, uzmanlık, yük" },
  },
  {
    key: "payments",
    section: "payments",
    icon: "💳",
    label:    { de: "Zahlungen aktivieren", en: "Enable payments", tr: "Ödemeleri etkinleştir" },
    sublabel: { de: "Stripe, Anzahlungen, PayPal", en: "Stripe, deposits, PayPal", tr: "Stripe, depozitolar, PayPal" },
  },
  {
    key: "two_factor",
    section: "two_factor",
    icon: "🔐",
    label:    { de: "Zwei-Faktor-Authentifizierung", en: "Two-factor authentication", tr: "İki faktörlü kimlik doğrulama" },
    sublabel: { de: "Konto mit Authenticator-App schützen", en: "Protect your account with an authenticator app", tr: "Hesabınızı authenticator uygulaması ile koruyun" },
  },
  {
    key: "team",
    section: "team",
    icon: "👥",
    label:    { de: "Team einrichten", en: "Set up team", tr: "Ekibi kur" },
    sublabel: { de: "Koordinatoren, Ärzte einladen", en: "Invite coordinators & doctors", tr: "Koordinatörleri ve doktorları davet et" },
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
    key: "automations",
    section: "automations",
    icon: "⚡",
    label:    { de: "Automationen aktivieren", en: "Activate automations", tr: "Otomasyonları etkinleştir" },
    sublabel: { de: "Erinnerungen, Follow-ups, Nachsorge", en: "Reminders, follow-ups, aftercare", tr: "Hatırlatmalar, takipler, bakım" },
    requires: "whatsapp",
    lockedHint: { de: "Erst WhatsApp verbinden", en: "Connect WhatsApp first", tr: "Önce WhatsApp bağlayın" },
  },
  {
    key: "integrations",
    section: "integrations",
    icon: "🔌",
    label:    { de: "Integrationen verbinden", en: "Connect integrations", tr: "Entegrasyonları bağla" },
    sublabel: { de: "n8n, Telegram, Webhooks", en: "n8n, Telegram, webhooks", tr: "n8n, Telegram, webhook'lar" },
  },
  {
    key: "google_drive",
    section: "google_drive",
    icon: "📁",
    label:    { de: "Google Drive verbinden",     en: "Connect Google Drive",       tr: "Google Drive'ı bağla" },
    sublabel: {
      de: "Alle Patientenfotos und Daten werden automatisch gespeichert und organisiert – nichts geht verloren.",
      en: "All patient photos and data are automatically saved and organized — nothing gets lost.",
      tr: "Tüm hasta fotoğrafları ve verileri otomatik olarak kaydedilir ve düzenlenir — hiçbir şey kaybolmaz."
    },
  },
  {
    key: "drivers",
    section: "drivers",
    icon: "🚗",
    label:    {
      de: "Fahrer & Transfers einrichten",
      en: "Set up drivers & transfers",
      tr: "Sürücüler ve transferleri kur"
    },
    sublabel: {
      de: "Automatisiere Flughafen- und Hotel-Transfers für deine Patienten.",
      en: "Automate airport and hotel transfers for your patients.",
      tr: "Hastalarınız için havalimanı ve otel transferlerini otomatikleştirin."
    },
  },
];

export default function AdvancedSetupCard() {
  const { setView, workspaceState, showT } = useApp();
  const lang = localStorage.getItem("fm_lang") || "de";

  const [status, setStatus] = useState(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Build a unified done-flag map. Backend exposes:
  //   status.minimal.steps  — clinic, treatment, doctor (+ whatsapp if paid)
  //   status.advanced.steps — booking_rules, ..., drivers
  //   status.steps          — legacy flat map (whatsapp_connected, agent_configured, etc.)
  const minimalSteps = (status.minimal && status.minimal.steps) || {};
  const advancedSteps = (status.advanced && status.advanced.steps) || {};
  const legacySteps = status.steps || {};
  const planActive = workspaceState === 'active';
  const flags = {
    general:           !!minimalSteps.clinic,
    treatments:        !!minimalSteps.treatment,
    ai_settings:       !!legacySteps.agent_configured,
    booking_rules:     !!advancedSteps.booking_rules,
    doctor_assignment: !!advancedSteps.doctor_assignment,
    payments:          !!advancedSteps.payments,
    two_factor:        mfaEnabled,
    team:              !!advancedSteps.team,
    whatsapp:          !!legacySteps.whatsapp_connected,
    automations:       !!advancedSteps.automations,
    integrations:      !!advancedSteps.integrations,
    google_drive:      !!advancedSteps.google_drive,
    drivers:           !!advancedSteps.drivers,
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
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(167,177,195,0.7)", marginBottom: 3, letterSpacing: -0.05 }}>
          {T("Unlock the full potential", "Volles Potenzial freischalten", "Tam potansiyeli ortaya çıkarın")}
        </div>
        <div style={{ fontSize: 11, color: "rgba(167,177,195,0.45)", lineHeight: 1.5 }}>
          {T(
            "Optimize your system for more bookings and automation.",
            "Optimiere dein System für mehr Buchungen und Automatisierung.",
            "Daha fazla rezervasyon ve otomasyon için sisteminizi optimize edin."
          )}
        </div>
      </div>

      {/* Detailed checklist — 2 columns on wider screens for better density */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
        {visibleSteps.map((s) => {
          const done = !!flags[s.key];
          const locked = !done && !!s.requires && !flags[s.requires];
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
                background: done ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.03)",
                border: done ? "1px solid rgba(16,185,129,0.18)" : "1px solid rgba(255,255,255,0.06)",
                color: done ? "#10b981" : locked ? "rgba(167,177,195,0.5)" : "rgba(232,238,252,0.85)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                width: "100%",
                transition: "all .15s",
                opacity: locked ? 0.65 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(2px)";
                if (!done && !locked) e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                if (!done && !locked) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
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
                {done ? "✓" : locked ? "🔒" : s.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.label[lang] || s.label.de}
                </div>
                {!done && (
                  <div style={{ fontSize: 11, color: "rgba(167,177,195,0.55)", fontWeight: 500, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {locked
                      ? (s.lockedHint?.[lang] || s.lockedHint?.de || (s.sublabel[lang] || s.sublabel.de))
                      : (s.sublabel[lang] || s.sublabel.de)}
                  </div>
                )}
              </div>
              {!done && <span style={{ opacity: 0.4, fontSize: 12, flexShrink: 0 }}>{locked ? "" : "→"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
