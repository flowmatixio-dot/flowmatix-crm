import { useState, useMemo, useCallback, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { updateClinicSettings, inviteTeamMember, updateTeamMember, removeTeamMember } from "../../api/client";

import ClinicProfile from "../SetupGuide/ClinicProfile";
import TreatmentTypes from "../SetupGuide/TreatmentTypes";
import CalendarSettings from "../SetupGuide/CalendarSettings";
import WhatsAppConnectStep from "./WhatsAppConnectStep";

/* ═══════════════════════════════════════════════════════════
 * ONBOARDING WIZARD — Premium SaaS Onboarding
 * ═══════════════════════════════════════════════════════════ */

const STEPS = [
  {
    id: "profile",
    icon: "🏥",
    // FIX #4 + #5: emotional headers + context
    headline: { de: "Erzähl uns von deiner Klinik", en: "Tell us about your clinic", tr: "Kliniğiniz hakkında bilgi verin" },
    subtitle: { de: "Diese Daten werden in WhatsApp-Nachrichten, Terminbestätigungen und Rechnungen verwendet.", en: "This data is used in WhatsApp messages, booking confirmations and invoices.", tr: "Bu bilgiler WhatsApp mesajlarında, randevu onaylarında ve faturalarda kullanılır." },
    label: { de: "Klinikprofil", en: "Clinic Profile", tr: "Klinik Profili" },
    required: true,
    check: (c) => !!(c.name && c.address && c.phone && c.clinicEmail),
  },
  {
    id: "treatments",
    icon: "💉",
    headline: { de: "Welche Behandlungen bietest du an?", en: "What treatments do you offer?", tr: "Hangi tedavileri sunuyorsunuz?" },
    subtitle: { de: "Der KI-Bot verwendet diese Informationen um Patienten automatisch zu beraten und Preise zu nennen.", en: "The AI bot uses this to advise patients and provide pricing automatically.", tr: "Yapay zeka botu, hastaları otomatik olarak bilgilendirmek için bu bilgileri kullanır." },
    label: { de: "Behandlungen", en: "Treatments", tr: "Tedaviler" },
    required: true,
    check: (c) => (c.aiConfig?.services?.length || 0) >= 1 || (c.treatments?.length || 0) >= 1,
    asyncCheck: true,
  },
  {
    id: "team",
    icon: "👥",
    headline: { de: "Wer gehört zu deinem Team?", en: "Who is on your team?", tr: "Ekibinizde kimler var?" },
    subtitle: { de: "Ärzte erhalten automatisch Patienten zur Bewertung. Koordinatoren verwalten den Ablauf.", en: "Doctors automatically receive patients for review. Coordinators manage the workflow.", tr: "Doktorlar otomatik olarak değerlendirme için hasta alır. Koordinatörler iş akışını yönetir." },
    label: { de: "Team", en: "Team", tr: "Ekip" },
    required: true,
    check: (c) => (c.team?.length || 0) >= 1,
  },
  {
    id: "calendar",
    icon: "📅",
    headline: { de: "Kalender & Buchungsregeln", en: "Calendar & Booking Rules", tr: "Takvim & Rezervasyon Kuralları" },
    subtitle: { de: "Verknüpfe deinen Google-Kalender und lege Buchungsregeln wie Vorlaufzeit und Zeitfenster fest.", en: "Connect your Google Calendar and set booking rules like lead time and time slots.", tr: "Google Takviminizi bağlayın ve ön süre ve zaman aralıkları gibi rezervasyon kurallarını belirleyin." },
    label: { de: "Kalender", en: "Calendar", tr: "Takvim" },
    required: true,
    check: (c) => !!(c.aiConfig?.bookingRules),
  },
  {
    id: "whatsapp",
    icon: "💬",
    headline: { de: "WhatsApp verbinden — Ihr Hauptkanal", en: "Connect WhatsApp — Your main channel", tr: "WhatsApp'ı bağlayın — Ana kanalınız" },
    subtitle: { de: "Über WhatsApp kommuniziert der KI-Bot 24/7 mit deinen Patienten.", en: "The AI bot communicates 24/7 with your patients via WhatsApp.", tr: "Yapay zeka botu WhatsApp üzerinden 7/24 hastalarınızla iletişim kurar." },
    label: { de: "WhatsApp", en: "WhatsApp", tr: "WhatsApp" },
    required: true,
    check: (c) => !!(c.waSetupProgress?.connection_tested || c.connection_status === "connected"),
  },
  {
    id: "automations",
    icon: "⚡",
    headline: { de: "Automatisierungen aktivieren", en: "Enable automations", tr: "Otomasyonları etkinleştirin" },
    subtitle: { de: "Erinnerungen, Follow-ups und Nachsorge laufen automatisch — du musst nichts tun.", en: "Reminders, follow-ups and aftercare run automatically — no action needed.", tr: "Hatırlatmalar, takipler ve bakım sonrası otomatik çalışır." },
    label: { de: "Automationen", en: "Automations", tr: "Otomasyonlar" },
    required: false,
    check: () => true,
  },
  {
    id: "extras",
    icon: "🔧",
    headline: { de: "Erweiterte Funktionen", en: "Advanced Features", tr: "Gelişmiş Özellikler" },
    subtitle: { de: "Optional — jederzeit später in den Einstellungen konfigurierbar.", en: "Optional — configure anytime later in Settings.", tr: "İsteğe bağlı — daha sonra Ayarlar'dan yapılandırılabilir." },
    label: { de: "Extras", en: "Extras", tr: "Ekstralar" },
    required: false,
    check: () => true,
    isExtras: true,
  },
  {
    id: "review",
    icon: "🚀",
    headline: { de: "Alles bereit — leg los!", en: "All set — let's go!", tr: "Her şey hazır — başlayalım!" },
    subtitle: { de: "Überprüfe deine Einstellungen und starte deinen KI-Assistenten.", en: "Review your settings and launch your AI assistant.", tr: "Ayarlarınızı gözden geçirin ve yapay zeka asistanınızı başlatın." },
    label: { de: "Start", en: "Launch", tr: "Başlat" },
    required: false,
    check: () => true,
    isReview: true,
  },
];

const EXTRAS_ITEMS = [
  { id: "drivers", icon: "🚗", title: { de: "Fahrer & Transfers", en: "Drivers & Transfers", tr: "Şoförler" }, desc: { de: "Flughafentransfer organisieren", en: "Organize airport transfers", tr: "Havalimanı transferleri" } },
  { id: "payments", icon: "💳", title: { de: "Zahlungen", en: "Payments", tr: "Ödemeler" }, desc: { de: "Stripe, Anzahlungen, Online-Zahlungen", en: "Stripe, deposits, online payments", tr: "Stripe, depozitolar" } },
  { id: "invoicing", icon: "🧾", title: { de: "Rechnungen", en: "Invoicing", tr: "Faturalar" }, desc: { de: "IBAN, Bankdaten, PDF-Rechnungen", en: "IBAN, bank details, PDF invoices", tr: "IBAN, banka bilgileri" } },
  { id: "flights", icon: "✈️", title: { de: "Flug-Tracking", en: "Flight Tracking", tr: "Uçuş Takibi" }, desc: { de: "Automatische Flug-Updates", en: "Automatic flight updates", tr: "Otomatik uçuş güncellemeleri" } },
  { id: "notifications", icon: "🔔", title: { de: "Benachrichtigungen", en: "Notifications", tr: "Bildirimler" }, desc: { de: "Push & E-Mail Alerts", en: "Push & email alerts", tr: "Push ve e-posta" } },
];

const WELCOME_TEXT = {
  de: { greeting: "Herzlich willkommen!", thanks: "Vielen Dank für Ihr Vertrauen.", desc: "In den nächsten Schritten richten wir gemeinsam Ihr System ein — Schritt für Schritt. Das dauert ca. 10 Minuten.", bullets: ["Klinikprofil & Behandlungen anlegen", "Team einladen & Rollen vergeben", "WhatsApp verbinden & KI-Bot konfigurieren"], cta: "Setup starten" },
  en: { greeting: "Welcome to Flowmatix!", thanks: "Thank you for your trust.", desc: "In the next steps, we'll set up your system together — step by step. This takes about 10 minutes.", bullets: ["Set up clinic profile & treatments", "Invite team & assign roles", "Connect WhatsApp & configure AI bot"], cta: "Start Setup" },
  tr: { greeting: "Flowmatix'e hoş geldiniz!", thanks: "Güveniniz için teşekkür ederiz.", desc: "Sonraki adımlarda sisteminizi birlikte kuracağız — adım adım. Bu yaklaşık 10 dakika sürer.", bullets: ["Klinik profili ve tedavileri oluşturun", "Ekibi davet edin ve roller atayın", "WhatsApp'ı bağlayın ve yapay zeka botunu yapılandırın"], cta: "Kuruluma Başla" },
};

export default function OnboardingWizard({ onComplete, onSkip }) {
  const { clinic, activeClinicId, setClinics, showT, setView, t, lang } = useApp();
  const [wizardLang, setWizardLang] = useState(null);
  const [introPhase, setIntroPhase] = useState("lang"); // "lang" → "welcome" → "steps"
  const [step, setStep] = useState(0);
  const [localData, setLocalData] = useState({});
  const [completing, setCompleting] = useState(false);
  const [treatmentsExist, setTreatmentsExist] = useState(false);

  useEffect(() => {
    import("../../api/client").then(m => m.getTreatments()).then(res => {
      if (res?.treatments?.length > 0) setTreatmentsExist(true);
    }).catch(() => {});
  }, []);

  const l = wizardLang || lang || "de";
  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;

  const progress = useMemo(() => {
    if (!clinic) return { done: 0, total: 0, pct: 0, requiredDone: 0, requiredTotal: 0, allRequiredDone: false };
    const required = STEPS.filter(s => s.required);
    const requiredDone = required.filter(s => s.id === "treatments" ? (s.check(clinic) || treatmentsExist) : s.check(clinic)).length;
    return {
      requiredDone,
      requiredTotal: required.length,
      allRequiredDone: requiredDone === required.length,
    };
  }, [clinic, treatmentsExist]);

  const isDone = useCallback((stepObj) => {
    if (stepObj.id === "treatments") return stepObj.check(clinic) || treatmentsExist;
    return stepObj.check(clinic);
  }, [clinic, treatmentsExist]);

  let _saveTimer = null;
  const updateClinic = (patch) => {
    setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, ...patch } : c));
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => { updateClinicSettings(patch).catch(() => {}); }, 800);
  };

  const canProceed = currentStep.required ? isDone(currentStep) : true;

  // FIX #1: auto-save on "Weiter" click
  const goNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else setIntroPhase("welcome");
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await updateClinicSettings({ onboarding_completed: true });
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, onboarding_completed: true } : c));
      if (onComplete) onComplete();
    } catch { /* ignore */ }
    setCompleting(false);
  };

  if (!clinic) return null;

  /* ── INTRO: Language Selection ── */
  if (introPhase === "lang") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 520, padding: "0 24px" }}>
          <span style={{ fontSize: 32, fontWeight: 800, background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block", marginBottom: 40 }}>FLOWMATIX</span>
          <div style={{ fontSize: 15, color: "rgba(167,177,195,0.5)", marginBottom: 48 }}>Please select your language</div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
            {[
              { code: "de", flag: "🇩🇪", label: "Deutsch" },
              { code: "en", flag: "🇬🇧", label: "English" },
              { code: "tr", flag: "🇹🇷", label: "Türkçe" },
            ].map(lng => (
              <button key={lng.code} onClick={() => { setWizardLang(lng.code); setIntroPhase("welcome"); }} style={{
                padding: "28px 36px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(232,238,252,0.85)", fontSize: 15, fontWeight: 700,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                transition: "all 0.2s", minWidth: 140,
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(76,201,255,0.08)"; e.currentTarget.style.borderColor = "rgba(76,201,255,0.3)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(76,201,255,0.15)"; }}
                 onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)"; }}>
                <span style={{ fontSize: 44 }}>{lng.flag}</span>
                <span>{lng.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── INTRO: Welcome Screen ── */
  if (introPhase === "welcome") {
    const w = WELCOME_TEXT[l];
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 520, padding: "0 24px" }}>
          <span style={{ fontSize: 32, fontWeight: 800, background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block", marginBottom: 28 }}>FLOWMATIX</span>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#fff", margin: "0 0 10px", lineHeight: 1.3 }}>{w.greeting}</h1>
          <p style={{ fontSize: 16, color: "rgba(167,177,195,0.6)", margin: "0 0 24px" }}>{w.thanks}</p>
          <p style={{ fontSize: 14, color: "rgba(167,177,195,0.45)", margin: "0 0 32px", lineHeight: 1.7 }}>{w.desc}</p>
          <div style={{ display: "inline-flex", flexDirection: "column", gap: 14, marginBottom: 40, textAlign: "left" }}>
            {w.bullets.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(232,238,252,0.75)" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#4cc9ff", flexShrink: 0 }}>{i + 1}</div>
                {b}
              </div>
            ))}
          </div>
          <div>
            <button onClick={() => setIntroPhase("steps")} style={{
              padding: "16px 52px", borderRadius: 14, fontSize: 16, fontWeight: 800, fontFamily: "inherit",
              cursor: "pointer", border: "none",
              background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", color: "#fff",
              boxShadow: "0 6px 32px rgba(76,201,255,0.3)", transition: "all 0.2s",
            }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 40px rgba(76,201,255,0.4)"; }}
               onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 32px rgba(76,201,255,0.3)"; }}>
              {w.cta} →
            </button>
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setIntroPhase("lang")} style={{ background: "none", border: "none", color: "rgba(167,177,195,0.35)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(167,177,195,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(167,177,195,0.35)"; }}>
              ← {l === "de" ? "Sprache ändern" : l === "tr" ? "Dili değiştir" : "Change language"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shared = { clinic, isDone: () => false, updateClinic, showT, setView, t };

  const renderStepContent = () => {
    switch (currentStep.id) {
      case "profile": return <ClinicProfile {...shared} localData={localData} setLocalData={setLocalData} autoSave />;
      case "treatments": return <TreatmentTypes />;
      case "team": return <WizardTeamAccess clinic={clinic} showT={showT} t={t} />;
      case "calendar": return <CalendarSettings {...shared} wizardMode />;
      case "whatsapp": return <WhatsAppConnectStep />;
      case "automations": return <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(232,238,252,0.85)", marginBottom: 8 }}>
            {l === "de" ? "Automatisierungen sind vorkonfiguriert" : l === "tr" ? "Otomasyonlar önceden yapılandırıldı" : "Automations are pre-configured"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(167,177,195,0.5)", lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>
            {l === "de" ? "Follow-up Nachrichten, Terminerinnerungen und Nachsorge-Workflows sind bereits aktiviert. Du kannst diese nach dem Setup in den Einstellungen anpassen." : l === "tr" ? "Takip mesajları, randevu hatırlatmaları ve bakım sonrası iş akışları zaten etkin. Kurulumdan sonra Ayarlar'dan düzenleyebilirsiniz." : "Follow-up messages, appointment reminders and aftercare workflows are already enabled. You can customize them after setup in Settings."}
          </div>
        </div>;
      case "extras": return <ExtrasStep lang={l} />;
      case "review": return <ReviewStep steps={STEPS} clinic={clinic} lang={l} isDone={isDone} onGoToStep={setStep} treatmentsExist={treatmentsExist} />;
      default: return null;
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0a0f1a", display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── TOP BAR with step labels (FIX #6) ── */}
      <div style={{ padding: "14px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800, background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FLOWMATIX</span>
          <span style={{ fontSize: 12, color: "rgba(167,177,195,0.3)", fontWeight: 600 }}>Setup</span>
        </div>

        {/* Step dots with labels */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {STEPS.map((s, i) => (
            <div key={s.id} onClick={() => { if (i <= step || isDone(s)) setStep(i); }}
              style={{ display: "flex", alignItems: "center", gap: 4, cursor: (i <= step || isDone(s)) ? "pointer" : "default", padding: "4px 6px", borderRadius: 6, background: i === step ? "rgba(76,201,255,0.08)" : "transparent", transition: "all .2s" }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                background: i === step ? "#4cc9ff" : isDone(s) ? "#10b981" : "rgba(255,255,255,0.1)",
                transition: "all 0.3s",
              }} />
              <span style={{ fontSize: 10, fontWeight: i === step ? 700 : 500, color: i === step ? "#4cc9ff" : isDone(s) ? "#10b981" : "rgba(167,177,195,0.3)", whiteSpace: "nowrap", transition: "all .2s" }}>
                {s.label[l] || s.label.de}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: "rgba(167,177,195,0.3)" }}>
            {progress.requiredDone}/{progress.requiredTotal}
          </span>
          {onSkip && <button onClick={onSkip} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 12px", color: "rgba(167,177,195,0.4)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(167,177,195,0.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(167,177,195,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            {l === "de" ? "Überspringen" : l === "tr" ? "Atla" : "Skip"}
          </button>}
        </div>
      </div>

      {/* ── STEP HEADER — emotional + context (FIX #4 + #5) ── */}
      <div style={{ padding: "36px 48px 0", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 6 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: isDone(currentStep) ? "rgba(16,185,129,0.1)" : "rgba(76,201,255,0.08)",
            border: `1px solid ${isDone(currentStep) ? "rgba(16,185,129,0.2)" : "rgba(76,201,255,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>
            {/* FIX #2: just checkmark, no "Fertig" text */}
            {isDone(currentStep) ? "✓" : currentStep.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#fff", lineHeight: 1.3 }}>
              {currentStep.headline[l] || currentStep.headline.de}
            </h1>
            <p style={{ fontSize: 13, color: "rgba(167,177,195,0.5)", margin: "6px 0 0", lineHeight: 1.5 }}>
              {currentStep.subtitle[l] || currentStep.subtitle.de}
            </p>
          </div>
        </div>
      </div>

      {/* ── STEP CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 48px 120px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <style>{`
          .fm-wizard-content > div > h1:first-child,
          .fm-wizard-content > div > h2:first-child,
          .fm-wizard-content > div > div:first-child > h1,
          .fm-wizard-content > div > div:first-child > h2 { display: none !important; }
          .fm-wizard-content > div > p:first-of-type { display: none !important; }
          .fm-wizard-content > div[style*="padding"] { padding: 0 !important; max-width: none !important; }
        `}</style>
        <div className="fm-wizard-content">
          {renderStepContent()}
        </div>
      </div>

      {/* ── BOTTOM NAV (FIX #1 + #3) ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 48px",
        background: "rgba(10,15,26,0.95)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* ← Back */}
        <button onClick={goBack} style={{
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit",
          cursor: "pointer", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(167,177,195,0.7)", transition: "all .2s", minWidth: 100,
        }}>
          ← {l === "de" ? "Zurück" : l === "tr" ? "Geri" : "Back"}
        </button>

        {/* Center: bigger progress (FIX #3) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, maxWidth: 300, margin: "0 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,238,252,0.8)" }}>
            {l === "de" ? "Schritt" : l === "tr" ? "Adım" : "Step"} {step + 1} / {totalSteps}
          </div>
          <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
            <div style={{
              height: 6, borderRadius: 3,
              background: progress.allRequiredDone ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)",
              width: `${((step + 1) / totalSteps) * 100}%`, transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {/* → Next / Skip / Complete */}
        {currentStep.isReview ? (
          <button onClick={handleComplete} disabled={!progress.allRequiredDone || completing} style={{
            padding: "10px 28px", borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: "inherit",
            cursor: progress.allRequiredDone ? "pointer" : "default", border: "none", minWidth: 160,
            background: progress.allRequiredDone ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.04)",
            color: progress.allRequiredDone ? "#fff" : "rgba(167,177,195,0.3)", transition: "all .2s",
            boxShadow: progress.allRequiredDone ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
          }}>
            {completing ? "..." : l === "de" ? "🚀 System starten" : l === "tr" ? "🚀 Sistemi Başlat" : "🚀 Launch System"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, minWidth: 160, justifyContent: "flex-end" }}>
            {!currentStep.required && (
              <button onClick={goNext} style={{
                padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(167,177,195,0.5)", transition: "all .2s",
              }}>
                {l === "de" ? "Überspringen" : l === "tr" ? "Atla" : "Skip"}
              </button>
            )}
            <button onClick={goNext} disabled={!canProceed} style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              cursor: canProceed ? "pointer" : "default", border: "none",
              background: canProceed ? "linear-gradient(135deg, #4cc9ff, #2da8ff)" : "rgba(255,255,255,0.04)",
              color: canProceed ? "#fff" : "rgba(167,177,195,0.3)", transition: "all .2s",
              boxShadow: canProceed ? "0 4px 20px rgba(76,201,255,0.2)" : "none",
            }}>
              {l === "de" ? "Weiter →" : l === "tr" ? "İleri →" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── EXTRAS STEP ── */
function ExtrasStep({ lang }) {
  const l = lang || "de";
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {EXTRAS_ITEMS.map(item => (
          <div key={item.id} style={{
            padding: "18px 20px", borderRadius: 14, background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", gap: 12,
            cursor: "default", transition: "all .15s",
          }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(76,201,255,0.15)"; e.currentTarget.style.background = "rgba(76,201,255,0.03)"; }}
             onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
            <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "rgba(232,238,252,0.85)", marginBottom: 3 }}>{item.title[l] || item.title.de}</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", lineHeight: 1.4 }}>{item.desc[l] || item.desc.de}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── WIZARD WHATSAPP ── */
function WizardWhatsApp({ clinic, t, l }) {
  const isConnected = clinic?.connection_status === "connected";

  return (
    <div>
      {/* Status */}
      <div style={{
        background: isConnected ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)",
        border: `1px solid ${isConnected ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
        borderRadius: 14, padding: "20px 24px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: isConnected ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>
            {isConnected ? "✅" : "❌"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "rgba(232,238,252,0.9)" }}>
              {isConnected ? "WhatsApp aktiv" : (l === "en" ? "Not connected" : l === "tr" ? "Bağlı değil" : "Nicht verbunden")}
            </div>
            {isConnected && clinic?.wa_phone_display && (
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 2 }}>
                {t("number") || "Nummer"}: <span style={{ color: "#4cc9ff", fontWeight: 600 }}>{clinic.wa_phone_display}</span>
              </div>
            )}
          </div>
          {isConnected && (
            <div style={{ fontSize: 11, color: "rgba(16,185,129,0.5)", fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)" }}>AKTIV</div>
          )}
        </div>
      </div>

      {/* Setup CTA if not connected */}
      {!isConnected && <WhatsAppEmbeddedSignup />}

      {/* Warning */}
      <div style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 12, padding: "16px 20px", marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: 12, color: "rgba(200,215,240,0.45)", lineHeight: 1.7 }}>
            {l === "en" ? "This WhatsApp number can no longer be used in the WhatsApp app after connection. Messages will then run directly through Flowmatix." : l === "tr" ? "Bu WhatsApp numarası bağlantıdan sonra WhatsApp uygulamasında kullanılamaz. Mesajlar doğrudan Flowmatix üzerinden yürütülür." : "Diese WhatsApp-Nummer kann nach der Verbindung nicht mehr gleichzeitig in der WhatsApp App genutzt werden. Nachrichten laufen ab dann direkt über Flowmatix."}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)", borderRadius: 12, padding: "16px 20px", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <div style={{ fontSize: 12, color: "rgba(200,215,240,0.4)", lineHeight: 1.7 }}>
            {l === "en" ? "After setup, your WhatsApp communication is managed centrally in Flowmatix. All incoming messages are automatically processed by the bot and recorded in the CRM." : l === "tr" ? "Kurulumdan sonra WhatsApp iletişiminiz Flowmatix'te merkezi olarak yönetilir. Tüm gelen mesajlar otomatik olarak bot tarafından işlenir ve CRM'de kaydedilir." : "Nach der Einrichtung wird deine WhatsApp-Kommunikation zentral in Flowmatix verwaltet. Alle eingehenden Nachrichten werden automatisch vom Bot bearbeitet und im CRM erfasst."}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── WIZARD TEAM ACCESS (with roles) ── */
function WizardTeamAccess({ clinic, showT, t }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState("coordinator");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");

  const team = clinic?.team || [];

  const ROLE_META = {
    admin:       { label: "Admin", color: "#4cc9ff", icon: "👑", desc: t("role_full_access") || "Voller Zugriff" },
    coordinator: { label: t("role_coordinator") || "Koordinator", color: "#a78bfa", icon: "📋", desc: t("role_coordinator_desc") || "Patienten & Abläufe" },
    doctor:      { label: t("role_doctor") || "Arzt", color: "#10b981", icon: "⚕️", desc: t("role_doctor_desc") || "Bewertungen & Termine" },
    finance:     { label: t("role_finance") || "Finanzen", color: "#f59e0b", icon: "💰", desc: t("role_finance_desc") || "Rechnungen & Zahlungen" },
  };

  const mapApiRole = (r) => {
    if (r === "clinic_admin" || r === "admin" || r === "platform_owner") return "admin";
    if (r === "clinic_doctor") return "doctor";
    if (r === "clinic_finance") return "finance";
    return "coordinator";
  };

  const handleInvite = async () => {
    if (!invEmail.trim()) { showT(t("settings_enter_email") || "Enter e-mail"); return; }
    setSending(true);
    try {
      await inviteTeamMember({ email: invEmail, name: invName, role: `clinic_${invRole}` });
      showT(`${t("settings_invite_sent") || "Invitation sent to"} ${invEmail}`);
      setInviteOpen(false); setInvEmail(""); setInvName(""); setInvRole("coordinator");
    } catch (e) { showT(e.message || (t("settings_invite_error") || "Error inviting")); }
    setSending(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateTeamMember(userId, { role: `clinic_${newRole}` });
      showT(t("ob_role_changed") || "Role changed");
      setEditingId(null);
    } catch (e) { showT(e.message || (t("auto_error") || "Error")); }
  };

  const handleDeactivate = async (userId, userName) => {
    if (!window.confirm(`${userName} ${t("settings_deactivate_confirm") || "really deactivate?"}`)) return;
    try {
      await removeTeamMember(userId);
      showT(`${userName} ${t("ob_deactivated") || "deactivated"}`);
    } catch (e) { showT(e.message || (t("auto_error") || "Error")); }
  };

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div>
      {/* Invite button (full-width dashed) */}
      <button onClick={() => setInviteOpen(!inviteOpen)} style={{
        marginBottom: 14, padding: "12px 24px", borderRadius: 12, width: "100%",
        background: inviteOpen ? "rgba(76,201,255,0.1)" : "rgba(76,201,255,0.06)",
        border: `1px dashed ${inviteOpen ? "rgba(76,201,255,0.5)" : "rgba(76,201,255,0.3)"}`,
        color: "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s",
      }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(76,201,255,0.1)"; e.currentTarget.style.borderColor = "rgba(76,201,255,0.5)"; }}
         onMouseLeave={e => { if (!inviteOpen) { e.currentTarget.style.background = "rgba(76,201,255,0.06)"; e.currentTarget.style.borderColor = "rgba(76,201,255,0.3)"; } }}>
        + {t("invite_member") || "Mitglied einladen"}
      </button>
      <div style={{ fontSize: 12, color: "rgba(167,177,195,0.4)", marginBottom: 14 }}>
        {team.length} {team.length !== 1 ? (t("ob_team_members_pl") || "Team members") : (t("ob_team_member_sg") || "Team member")}
      </div>

      {/* Invite form */}
      {inviteOpen && (
        <div style={{ padding: 18, borderRadius: 12, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.1)", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#4cc9ff" }}>{t("ob_invite_new_member") || "Invite new team member"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 4 }}>Name</div>
              <input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Max Mustermann" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 4 }}>E-Mail</div>
              <input value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="max@klinik.de" type="email" style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.4)", marginBottom: 8 }}>{t("role_label") || "Rolle"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {Object.entries(ROLE_META).map(([key, meta]) => (
                <div key={key} onClick={() => setInvRole(key)} style={{
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                  background: invRole === key ? `${meta.color}10` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${invRole === key ? `${meta.color}30` : "rgba(255,255,255,0.05)"}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{meta.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: invRole === key ? meta.color : "rgba(232,238,252,0.6)" }}>{meta.label}</div>
                  <div style={{ fontSize: 9, color: "rgba(167,177,195,0.35)", marginTop: 2, lineHeight: 1.3 }}>{meta.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleInvite} disabled={sending} style={{
              padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff",
            }}>
              {sending ? (t("sending") || "Sending...") : (t("ob_send_invitation") || "Send invitation")}
            </button>
            <button onClick={() => setInviteOpen(false)} style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.5)",
            }}>
              {t("cancel") || "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Team table */}
      {team.length > 0 && (
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr auto", gap: 8,
            padding: "8px 16px", background: "rgba(255,255,255,0.02)",
            fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.3)", textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            <div>Name</div><div>E-Mail</div><div>Rolle</div><div>Status</div><div></div>
          </div>
          {team.map(member => {
            const role = mapApiRole(member.role);
            const meta = ROLE_META[role] || ROLE_META.coordinator;
            const isEditing = editingId === member.id;
            const isCurrentUser = member.email === clinic?.clinicEmail;
            return (
              <div key={member.id} style={{
                display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr auto", gap: 8,
                padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.03)",
                alignItems: "center", fontSize: 13,
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: "rgba(232,238,252,0.85)" }}>{member.name || "—"}</div>
                  {isCurrentUser && <span style={{ fontSize: 9, color: "#4cc9ff", fontWeight: 700 }}>{t("ob_you_label") || "You"}</span>}
                </div>
                <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", overflow: "hidden", textOverflow: "ellipsis" }}>{member.email}</div>
                <div>
                  {isEditing ? (
                    <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ ...inp, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>
                      {Object.entries(ROLE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                    </select>
                  ) : (
                    <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${meta.color}12`, color: meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                  )}
                </div>
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: member.lastLogin ? "rgba(16,185,129,0.08)" : "rgba(167,177,195,0.06)",
                    color: member.lastLogin ? "#10b981" : "rgba(167,177,195,0.35)",
                  }}>
                    {member.lastLogin ? (t("ob_active_status") || "Active") : (t("ob_invited_status") || "Invited")}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {!isCurrentUser && !isEditing && (
                    <>
                      <button onClick={() => { setEditingId(member.id); setEditRole(role); }} style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.5)",
                      }}>{t("ob_role_btn") || "Role"}</button>
                      <button onClick={() => handleDeactivate(member.id, member.name)} style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.5)",
                      }}>{t("ob_remove_btn") || "Remove"}</button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <button onClick={() => handleRoleChange(member.id, editRole)} style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", color: "#10b981",
                      }}>{t("save")}</button>
                      <button onClick={() => setEditingId(null)} style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.4)",
                      }}>{t("cancel")}</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {team.length === 0 && (
        <div style={{ padding: "30px 20px", textAlign: "center", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 13, color: "rgba(167,177,195,0.35)" }}>{t("ob_no_team_yet")||"No team members yet. Invite your team."}</div>
        </div>
      )}
    </div>
  );
}

/* ── REVIEW STEP ── */
function ReviewStep({ steps, clinic, lang, isDone, onGoToStep, treatmentsExist }) {
  const l = lang || "de";
  const required = steps.filter(s => s.required);
  const allRequiredDone = required.every(s => isDone(s));

  return (
    <div>
      {allRequiredDone ? (
        <div style={{ padding: 36, borderRadius: 20, textAlign: "center", marginBottom: 24, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <div style={{ fontSize: 52 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981", marginTop: 12 }}>
            {l === "de" ? "Setup abgeschlossen!" : l === "tr" ? "Kurulum tamamlandı!" : "Setup Complete!"}
          </div>
          <div style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", marginTop: 8, lineHeight: 1.6 }}>
            {l === "de" ? "Dein KI-Assistent ist bereit. Klicke auf \"System starten\" um loszulegen." : l === "tr" ? "Yapay zeka asistanınız hazır. Başlamak için \"Sistemi Başlat\" butonuna tıklayın." : "Your AI assistant is ready. Click \"Launch System\" to get started."}
          </div>
        </div>
      ) : (
        <div style={{ padding: 20, borderRadius: 14, marginBottom: 24, background: "rgba(255,138,42,0.04)", border: "1px solid rgba(255,138,42,0.12)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#ff8a2a" }}>
            {l === "de" ? "Einige Pflicht-Schritte sind noch offen" : l === "tr" ? "Bazı zorunlu adımlar henüz tamamlanmadı" : "Some required steps are not yet completed"}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {steps.filter(s => !s.isReview && !s.isExtras).map((s, i) => {
          const done = isDone(s);
          return (
            <div key={s.id} onClick={() => onGoToStep(i)} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 12,
              cursor: "pointer", transition: "all .15s",
              background: done ? "rgba(16,185,129,0.03)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${done ? "rgba(16,185,129,0.12)" : s.required ? "rgba(255,138,42,0.12)" : "rgba(255,255,255,0.06)"}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, fontSize: done ? 16 : 18,
                background: done ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center", color: done ? "#10b981" : "inherit",
              }}>
                {done ? "✓" : s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: done ? "#10b981" : "#fff" }}>
                  {s.label[l] || s.label.de}
                </div>
              </div>
              {!done && s.required && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 7, background: "rgba(255,138,42,0.08)", color: "#ff8a2a" }}>
                  {l === "de" ? "Offen" : l === "tr" ? "Açık" : "Open"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
