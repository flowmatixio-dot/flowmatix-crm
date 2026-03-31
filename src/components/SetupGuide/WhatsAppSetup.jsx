import { useState } from "react";
import { uploadClinicDocuments } from "../../api/client.js";
import { useApp } from "../../context/AppContext";

const META_STEPS = [
  {
    id: "create_meta", num: 1,
    title: "Meta Business Account erstellen", titleEn: "Create Meta Business Account", titleTr: "Meta Business Hesabi Olustur",
    time: "5 Min",
    instructions: [
      { num: "1.", text: "Gehe zu business.facebook.com", link: "https://business.facebook.com" },
      { num: "2.", text: "Klicke auf 'Konto erstellen'" },
      { num: "3.", text: "Gib den offiziellen Namen deiner Praxis ein" },
      { num: "4.", text: "Trage deine Geschaeftsadresse und Kontaktdaten ein" },
      { num: "5.", text: "Bestaetige deine E-Mail-Adresse" },
    ],
    instructionsEn: [
      { num: "1.", text: "Go to business.facebook.com", link: "https://business.facebook.com" },
      { num: "2.", text: "Click 'Create Account'" },
      { num: "3.", text: "Enter your clinic's official business name" },
      { num: "4.", text: "Fill in your business address and contact details" },
      { num: "5.", text: "Verify your email address" },
    ],
    instructionsTr: [
      { num: "1.", text: "business.facebook.com adresine gidin", link: "https://business.facebook.com" },
      { num: "2.", text: "'Hesap Olustur' dugmesine tiklayin" },
      { num: "3.", text: "Kliniginizin resmi isletme adini girin" },
      { num: "4.", text: "Isletme adresinizi ve iletisim bilgilerinizi girin" },
      { num: "5.", text: "E-posta adresinizi dogrulayin" },
    ],
    check: "meta_account_created",
    important: "Verwende den EXAKTEN offiziellen Namen aus deinem Gewerbeschein.",
    importantEn: "Use the EXACT official name from your business registration.",
    importantTr: "Ticaret sicil belgenizden TAM resmi ismi kullanin.",
  },
  {
    id: "verify_business", num: 2,
    title: "Unternehmen verifizieren", titleEn: "Verify Your Business", titleTr: "Isletmenizi Dogrulayin",
    time: "10 Min + 1-5 Tage Wartezeit",
    instructions: [
      { num: "1.", text: "Im Meta Business Manager: Einstellungen > Unternehmensinfos > Verifizierung starten" },
      { num: "2.", text: "Laden Sie eines dieser Dokumente hoch:", bold: true },
      { num: "2.1", text: "    Gewerbeschein / Handelsregisterauszug" },
      { num: "2.2", text: "    Steuerbescheid oder IHK-Bescheinigung" },
      { num: "3.", text: "Laden Sie einen Adressnachweis hoch:", bold: true },
      { num: "3.1", text: "    Strom-/Telefonrechnung (max. 3 Monate alt)" },
      { num: "3.2", text: "    Oder Kontoauszug mit Adresse" },
      { num: "4.", text: "Waehle die Verifizierungsmethode (E-Mail oder Telefon)" },
      { num: "5.", text: "Warte auf die Bestaetigung von Meta (1-5 Werktage)" },
    ],
    instructionsEn: [
      { num: "1.", text: "In Meta Business Manager: Settings > Business Info > Start Verification" },
      { num: "2.", text: "Upload one of these documents:", bold: true },
      { num: "2.1", text: "    Business registration / trade license" },
      { num: "2.2", text: "    Tax certificate or chamber of commerce document" },
      { num: "3.", text: "Upload proof of address:", bold: true },
      { num: "3.1", text: "    Utility bill (max 3 months old)" },
      { num: "3.2", text: "    Or bank statement with address" },
      { num: "4.", text: "Choose verification method (email or phone)" },
      { num: "5.", text: "Wait for Meta confirmation (1-5 business days)" },
    ],
    instructionsTr: [
      { num: "1.", text: "Meta Business Manager'da: Ayarlar > Isletme Bilgileri > Dogrulamayi Baslat" },
      { num: "2.", text: "Bu belgelerden birini yukleyin:", bold: true },
      { num: "2.1", text: "    Ticaret sicil belgesi / isletme ruhsati" },
      { num: "2.2", text: "    Vergi levhasi veya ticaret odasi belgesi" },
      { num: "3.", text: "Adres kanitini yukleyin:", bold: true },
      { num: "3.1", text: "    Fatura (en fazla 3 ay oncesine ait)" },
      { num: "3.2", text: "    Veya adresli banka hesap oezeti" },
      { num: "4.", text: "Dogrulama yoentemini secin (e-posta veya telefon)" },
      { num: "5.", text: "Meta onayini bekleyin (1-5 is guenue)" },
    ],
    check: "meta_verified",
    important: "Lade die gleichen Dokumente auch hier hoch (unten). Unser Team kann dich bei Problemen unterstuetzen.",
    importantEn: "Also upload the same documents below. Our team can assist you if there are issues.",
    importantTr: "Ayni belgeleri asagiya da yukleyin. Sorun yasarsaniz ekibimiz size yardimci olabilir.",
    hasUpload: true,
  },
  {
    id: "invite_partner", num: 3,
    title: "Flowmatix als Partner einladen", titleEn: "Invite Flowmatix as Partner", titleTr: "Flowmatix'i Partner Olarak Davet Et",
    time: "2 Min",
    instructions: [
      { num: "1.", text: "Im Meta Business Manager: Einstellungen > Partner" },
      { num: "2.", text: "Klicke 'Partner hinzufuegen'" },
      { num: "3.", text: "Gib diese Business ID ein:", bold: true },
      { num: "3.1", text: "    FLOWMATIX_PARTNER_ID", mono: true, copyable: true },
      { num: "4.", text: "Aktiviere diese Berechtigungen:", bold: true },
      { num: "4.1", text: "    WhatsApp-Konten verwalten" },
      { num: "4.2", text: "    Nachrichten senden und empfangen" },
      { num: "4.3", text: "    Telefonnummern verwalten" },
      { num: "5.", text: "Klicke 'Einladung senden'" },
    ],
    instructionsEn: [
      { num: "1.", text: "In Meta Business Manager: Settings > Partners" },
      { num: "2.", text: "Click 'Add Partner'" },
      { num: "3.", text: "Enter this Business ID:", bold: true },
      { num: "3.1", text: "    FLOWMATIX_PARTNER_ID", mono: true, copyable: true },
      { num: "4.", text: "Enable these permissions:", bold: true },
      { num: "4.1", text: "    Manage WhatsApp accounts" },
      { num: "4.2", text: "    Send and receive messages" },
      { num: "4.3", text: "    Manage phone numbers" },
      { num: "5.", text: "Click 'Send Invitation'" },
    ],
    instructionsTr: [
      { num: "1.", text: "Meta Business Manager'da: Ayarlar > Partnerler" },
      { num: "2.", text: "'Partner Ekle' dugmesine tiklayin" },
      { num: "3.", text: "Bu Business ID'yi girin:", bold: true },
      { num: "3.1", text: "    FLOWMATIX_PARTNER_ID", mono: true, copyable: true },
      { num: "4.", text: "Bu izinleri etkinlestirin:", bold: true },
      { num: "4.1", text: "    WhatsApp hesaplarini yoenet" },
      { num: "4.2", text: "    Mesaj goender ve al" },
      { num: "4.3", text: "    Telefon numaralarini yoenet" },
      { num: "5.", text: "'Davet Goender' dugmesine tiklayin" },
    ],
    check: "partner_invited",
    important: "Wir erhalten eine Benachrichtigung sobald du die Einladung sendest. Unser Team nimmt sie innerhalb von 24 Stunden an.",
    importantEn: "We'll be notified when you send the invitation. Our team accepts it within 24 hours.",
    importantTr: "Daveti goenderdiginizde bilgilendirilecegiz. Ekibimiz 24 saat icinde kabul eder.",
  },
];

export default function WhatsAppSetup() {
  const { clinic, activeClinicId, setClinics, showT, t } = useApp();
  const [activeStep, setActiveStep] = useState(0);
  const [uploads, setUploads] = useState({});
  const [smsCode, setSmsCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(clinic?.phone || "");
  const [skipDismissed, setSkipDismissed] = useState(false);
  const lang = localStorage.getItem("fm_lang") || "de";

  const isAlreadyConnected = clinic?.connection_status === "connected";
  const waSetup = isAlreadyConnected
    ? { meta_account_created: true, meta_verified: true, partner_invited: true }
    : (clinic?.waSetupProgress || {});
  const completedSteps = META_STEPS.filter(s => waSetup[s.check]).length;
  const progress = Math.round((completedSteps / META_STEPS.length) * 100);
  const hasAnyProgress = completedSteps > 0 || skipDismissed;

  const skipTo = (level) => {
    const now = new Date().toISOString();
    const marks = {
      meta_account_created: level >= 1,
      meta_verified: level >= 2,
      partner_invited: level >= 3,
    };
    if (level >= 1) marks.meta_account_created_at = now;
    if (level >= 2) marks.meta_verified_at = now;
    if (level >= 3) marks.partner_invited_at = now;
    setClinics(cs => cs.map(c => c.id === activeClinicId ? {
      ...c, waSetupProgress: { ...(c.waSetupProgress || {}), ...marks }
    } : c));
    setActiveStep(Math.min(level, META_STEPS.length - 1));
  };

  const markDone = (checkKey) => {
    setClinics(cs => cs.map(c => c.id === activeClinicId ? {
      ...c,
      waSetupProgress: { ...(c.waSetupProgress || {}), [checkKey]: true, [`${checkKey}_at`]: new Date().toISOString() }
    } : c));
    showT(t("step_completed") || "Schritt abgeschlossen!");
    const nextIdx = META_STEPS.findIndex(s => s.check === checkKey) + 1;
    if (nextIdx < META_STEPS.length) setActiveStep(nextIdx);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploads(prev => ({ ...prev, docs: [...(prev.docs || []), ...files.map(f => f.name)] }));
    showT(`${files.length} ${t("documents_uploaded") || "Dokument(e) hochgeladen"}`);
    try {
      await uploadClinicDocuments(files);
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  return <div style={{ padding: "28px 32px", maxWidth: 800 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{t("wa_setup_title") || "WhatsApp Setup"}</h1>
      <span style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: progress === 100 ? "rgba(16,185,129,0.1)" : "rgba(76,201,255,0.08)", color: progress === 100 ? "#10b981" : "#4cc9ff" }}>
        {completedSteps}/{META_STEPS.length} {lang === "tr" ? "Adim" : lang === "en" ? "Steps" : "Schritte"}
      </span>
    </div>
    <p style={{ fontSize: 14, color: "rgba(167,177,195,0.7)", margin: "0 0 20px" }}>
      {t("wa_setup_desc") || "Schritt-fuer-Schritt Anleitung um WhatsApp Business API mit deiner Praxis zu verbinden."}
    </p>

    {/* Already connected banner */}
    {isAlreadyConnected && <div style={{ padding: 16, borderRadius: 14, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 24 }}>✅</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#10b981" }}>{t("wa_already_connected") || "WhatsApp ist bereits verbunden"}</div>
        <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>
          {clinic?.display_name && <span>{clinic.display_name} · </span>}
          {clinic?.phone || ""} · {t("wa_quality") || "Qualitaet"}: {clinic?.quality_rating || "GREEN"}
        </div>
      </div>
    </div>}

    {/* Progress bar */}
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 24 }}>
      <div style={{ height: 8, borderRadius: 4, background: progress === 100 ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)", width: `${progress}%`, transition: "width .5s ease" }} />
    </div>

    {/* Phone number request — country code selection */}
    <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 8 }}>{t("wa_clinic_number") || "WhatsApp-Nummer fuer deine Praxis"}</div>
      {isAlreadyConnected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#10b981", fontSize: 15, fontWeight: 700 }}>
            {clinic?.phone || clinic?.display_name || (lang === "tr" ? "Bagli" : lang === "en" ? "Connected" : "Verbunden")}
          </div>
        </div>
      ) : clinic?.numberRequestStatus === "assigned" && clinic?.assignedPhoneNumber ? (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, color: "#10b981", fontSize: 14 }}>{lang === "tr" ? "Atanan Numara" : lang === "en" ? "Assigned Number" : "Zugewiesene Nummer"}: {clinic.assignedPhoneNumber}</div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>{lang === "tr" ? "Ozel WhatsApp numaraniz hazir." : lang === "en" ? "Your dedicated WhatsApp number is ready." : "Deine dedizierte WhatsApp-Nummer ist bereit."}</div>
          </div>
        </div>
      ) : clinic?.numberRequestStatus === "pending" ? (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,138,42,0.06)", border: "1px solid rgba(255,138,42,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, color: "#ff8a2a", fontSize: 14 }}>{lang === "tr" ? "Numara hazirlaniyor" : lang === "en" ? "Number being provisioned" : "Nummer wird bereitgestellt"} ({clinic?.requestedCountryCode})</div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>{lang === "tr" ? "Flowmatix numaranizi organize ediyor. Aktif olunca bilgilendirileceksiniz." : lang === "en" ? "Flowmatix is organizing your number. You will be notified once it is active." : "Flowmatix organisiert deine Nummer. Du wirst benachrichtigt sobald sie aktiv ist."}</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", marginBottom: 10 }}>
            {lang === "tr" ? "Istediginiz ulke kodunu secin. Flowmatix botunuz icin ozel bir numara organize eder." : lang === "en" ? "Select your desired country code. Flowmatix will organize a dedicated number for your bot." : "Waehlen Sie die gewuenschte Laendervorwahl. Flowmatix organisiert eine dedizierte Nummer fuer Ihren Bot."}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { code: "+49", flag: "🇩🇪", label: lang === "tr" ? "Almanya" : lang === "en" ? "Germany" : "Deutschland" },
              { code: "+90", flag: "🇹🇷", label: lang === "tr" ? "Tuerkiye" : lang === "en" ? "Turkey" : "Tuerkei" },
              { code: "+34", flag: "🇪🇸", label: lang === "tr" ? "Ispanya" : lang === "en" ? "Spain" : "Spanien" },
              { code: "+44", flag: "🇬🇧", label: "UK" },
              { code: "+33", flag: "🇫🇷", label: lang === "tr" ? "Fransa" : lang === "en" ? "France" : "Frankreich" },
              { code: "+39", flag: "🇮🇹", label: lang === "tr" ? "Italya" : lang === "en" ? "Italy" : "Italien" },
              { code: "+351", flag: "🇵🇹", label: lang === "tr" ? "Portekiz" : "Portugal" },
              { code: "+1", flag: "🇺🇸", label: lang === "tr" ? "ABD / Kanada" : lang === "en" ? "USA / Canada" : "USA / Kanada" },
              { code: "+971", flag: "🇦🇪", label: lang === "tr" ? "BAE / Dubai" : lang === "en" ? "UAE / Dubai" : "VAE / Dubai" },
              { code: "+966", flag: "🇸🇦", label: lang === "tr" ? "Suudi Arabistan" : lang === "en" ? "Saudi Arabia" : "Saudi-Arabien" },
            ].map(c => {
              const isSelected = (clinic?.requestedCountryCode || "") === c.code;
              return <button key={c.code} onClick={() => {
                setClinics(cs => cs.map(cl => cl.id === activeClinicId ? { ...cl, requestedCountryCode: c.code } : cl));
              }} style={{
                padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: isSelected ? 700 : 500, border: "none",
                background: isSelected ? "rgba(76,201,255,0.15)" : "rgba(255,255,255,0.04)",
                color: isSelected ? "#4cc9ff" : "rgba(167,177,195,0.7)",
                outline: isSelected ? "2px solid rgba(76,201,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
              }}>
                {c.flag} {c.code} {c.label}
              </button>;
            })}
          </div>
          {clinic?.requestedCountryCode && (
            <button onClick={async () => {
              try {
                const mod = await import("../../api/client");
                await mod.updateClinicSettings({ requestedCountryCode: clinic.requestedCountryCode, numberRequestStatus: "pending" });
                setClinics(cs => cs.map(cl => cl.id === activeClinicId ? { ...cl, numberRequestStatus: "pending" } : cl));
                showT(lang === "tr" ? "Numara talebi gonderildi! Flowmatix hazirligi ueslenecek." : lang === "en" ? "Number request sent! Flowmatix will handle provisioning." : "Nummer-Anfrage gesendet! Flowmatix wird sich um die Bereitstellung kuemmern.");
              } catch (e) { showT((lang === "tr" ? "Hata: " : lang === "en" ? "Error: " : "Fehler: ") + e.message); }
            }} style={{
              padding: "10px 20px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              background: "linear-gradient(135deg, #4cc9ff, #2da8ff)", color: "#fff",
            }}>
              {lang === "tr" ? "Numara talep et" : lang === "en" ? "Request number" : "Nummer anfordern"} ({clinic.requestedCountryCode})
            </button>
          )}
        </>
      )}
    </div>
    {/* Flowmatix hint */}
    <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14 }}>ℹ️</span>
      <span style={{ fontSize: 11, color: "rgba(167,177,195,0.6)" }}>
        {t("wa_number_hint") || "Flowmatix organisiert und konfiguriert die Nummer fuer Sie. Erledigen Sie die Schritte 1-3 — den Rest uebernehmen wir."}
      </span>
    </div>

    {/* Quick-start: already verified? — always visible so user can correct */}
    {!isAlreadyConnected && <div style={{ padding: 16, borderRadius: 14, background: "rgba(167,134,255,0.04)", border: "1px solid rgba(167,134,255,0.12)", marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{t("wa_already_have_meta") || "Haben Sie bereits ein Meta Business Konto?"}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button onClick={() => skipTo(0)} style={{ padding: "7px 14px", borderRadius: 8, background: completedSteps === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${completedSteps === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`, color: "rgba(232,238,252,0.95)", fontWeight: completedSteps === 0 ? 700 : 500, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
          {t("wa_no_start_fresh") || "Nein — von vorne starten"}
        </button>
        <button onClick={() => skipTo(1)} style={{ padding: "7px 14px", borderRadius: 8, background: waSetup.meta_account_created && !waSetup.meta_verified ? "rgba(76,201,255,0.15)" : "rgba(76,201,255,0.05)", border: `1px solid rgba(76,201,255,0.15)`, color: "#4cc9ff", fontWeight: waSetup.meta_account_created && !waSetup.meta_verified ? 700 : 500, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
          {t("wa_yes_account_exists") || "Ja, Konto vorhanden"}
        </button>
        <button onClick={() => skipTo(2)} style={{ padding: "7px 14px", borderRadius: 8, background: waSetup.meta_verified && !waSetup.partner_invited ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.05)", border: `1px solid rgba(16,185,129,0.15)`, color: "#10b981", fontWeight: waSetup.meta_verified && !waSetup.partner_invited ? 700 : 500, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
          {t("wa_yes_verified") || "Ja, bereits verifiziert"}
        </button>
      </div>
    </div>}

    {/* Steps */}
    {META_STEPS.map((step, idx) => {
      const isDone = waSetup[step.check];
      const isActive = idx === activeStep && !isAlreadyConnected;
      const isLocked = !isAlreadyConnected && idx > 0 && !waSetup[META_STEPS[idx - 1].check] && !isDone;
      const instructions = lang === "tr" ? step.instructionsTr : lang === "en" ? step.instructionsEn : step.instructions;
      const important = lang === "tr" ? step.importantTr : lang === "en" ? step.importantEn : step.important;
      const title = lang === "tr" ? step.titleTr : lang === "en" ? step.titleEn : step.title;
      const isFlowmatixStep = false;

      return <div key={step.id} style={{ marginBottom: 12 }}>
        <div
          onClick={() => !isLocked && !isAlreadyConnected && setActiveStep(isActive ? -1 : idx)}
          style={{
            padding: "14px 18px", borderRadius: isActive ? "14px 14px 0 0" : 14,
            background: isDone ? "rgba(16,185,129,0.04)" : isActive ? "rgba(76,201,255,0.04)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${isDone ? "rgba(16,185,129,0.15)" : isActive ? "rgba(76,201,255,0.15)" : "rgba(255,255,255,0.06)"}`,
            borderBottom: isActive ? "none" : undefined,
            cursor: isLocked || isAlreadyConnected ? "default" : "pointer",
            opacity: isLocked ? 0.4 : 1,
            display: "flex", alignItems: "center", gap: 14,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: isDone ? "#10b981" : isActive ? "#4cc9ff" : "rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: (isDone || isActive) ? "#fff" : "rgba(167,177,195,0.7)",
          }}>
            {isDone ? "✓" : step.num}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: isDone ? "#10b981" : "rgba(232,238,252,0.88)" }}>{title}</div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", marginTop: 2 }}>
              {step.time}
              {isFlowmatixStep && !isDone && <span style={{ marginLeft: 8, color: "#4cc9ff", fontWeight: 600 }}>— Flowmatix</span>}
            </div>
          </div>
          {isDone && <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", padding: "3px 10px", borderRadius: 6, background: "rgba(16,185,129,0.08)" }}>{t("done") || "Erledigt"}</span>}
          {!isDone && !isLocked && !isAlreadyConnected && <span style={{ fontSize: 16, color: "rgba(167,177,195,0.7)" }}>{isActive ? "▲" : "▼"}</span>}
        </div>

        {isActive && !isLocked && <div style={{
          padding: 20, borderRadius: "0 0 14px 14px",
          background: "rgba(76,201,255,0.02)",
          border: "1px solid rgba(76,201,255,0.15)", borderTop: "none",
        }}>
          {isFlowmatixStep && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.1)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔧</span>
            <span style={{ fontSize: 12, color: "#4cc9ff", fontWeight: 600 }}>{t("flowmatix_handles") || "Dieser Schritt wird von Flowmatix fuer Sie erledigt."}</span>
          </div>}

          <div style={{ margin: "0 0 16px", lineHeight: 2 }}>
            {instructions.map((inst, i) => {
              const isSub = inst.text.startsWith("    ");
              const displayText = isSub ? inst.text.trimStart() : inst.text;
              return <div key={i} style={{
                fontSize: 13, display: "flex", gap: 6, alignItems: "baseline",
                paddingLeft: isSub ? 24 : 0,
                fontWeight: inst.bold ? 700 : 400,
                color: inst.bold ? "rgba(232,238,252,0.88)" : "rgba(167,177,195,0.7)",
                fontFamily: inst.mono ? "monospace" : "inherit",
              }}>
                {inst.num && <span style={{ color: "rgba(167,177,195,0.6)", fontWeight: 600, fontSize: 12, minWidth: 24, flexShrink: 0 }}>{inst.num}</span>}
                <span>
                  {inst.link
                    ? <a href={inst.link} target="_blank" rel="noopener noreferrer" style={{ color: "#4cc9ff", textDecoration: "underline" }}>{displayText}</a>
                    : displayText}
                  {inst.copyable && <button onClick={() => { navigator.clipboard.writeText("YOUR_META_BUSINESS_ID"); showT(t("wa_copied") || "Copied!"); }} style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{lang === "tr" ? "Kopyala" : lang === "en" ? "Copy" : "Kopieren"}</button>}
                </span>
              </div>;
            })}
          </div>

          {important && <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,138,42,0.05)", border: "1px solid rgba(255,138,42,0.12)", fontSize: 12, color: "rgba(255,138,42,0.8)", marginBottom: 16, lineHeight: 1.6 }}>
            <strong>{t("wa_important") || "Wichtig"}:</strong> {important}
          </div>}

          {step.hasUpload && <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 8 }}>{t("upload_documents") || "Dokumente hochladen (fuer unseren Support)"}</div>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} style={{ fontSize: 12, color: "rgba(167,177,195,0.7)" }} />
            {(uploads.docs || []).length > 0 && <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {uploads.docs.map((f, i) => <span key={i} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", fontSize: 11, color: "#10b981" }}>{f}</span>)}
            </div>}
          </div>}

          {step.hasSmsInput && <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 8 }}>{t("sms_verification_code") || "SMS-Verifizierungscode"}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={smsCode} onChange={e => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={lang === "tr" ? "6 haneli kod" : lang === "en" ? "6-digit code" : "6-stelliger Code"} maxLength={6} style={{ width: 160, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "monospace", fontSize: 20, letterSpacing: 8, textAlign: "center", outline: "none" }} />
              <button onClick={() => { if (smsCode.length === 6) { showT(t("code_verifying") || "Code wird verifiziert..."); } }} disabled={smsCode.length !== 6} style={{ padding: "10px 20px", borderRadius: 10, background: smsCode.length === 6 ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.04)", border: "none", color: smsCode.length === 6 ? "#fff" : "rgba(167,177,195,0.7)", fontWeight: 700, fontSize: 13, cursor: smsCode.length === 6 ? "pointer" : "not-allowed", fontFamily: "inherit" }}>{t("verify") || "Verifizieren"}</button>
            </div>
          </div>}

          {!isDone && <button onClick={() => markDone(step.check)} style={{
            padding: "10px 24px", borderRadius: 10,
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {t("step_completed_btn") || "Schritt abgeschlossen"}
          </button>}
        </div>}
      </div>;
    })}

    {progress === 100 && !isAlreadyConnected && <div style={{ padding: 20, borderRadius: 14, background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.12)", textAlign: "center", marginTop: 12 }}>
      <span style={{ fontSize: 32 }}>✅</span>
      <div style={{ fontWeight: 800, fontSize: 17, color: "#4cc9ff", marginTop: 8 }}>{t("wa_your_part_done") || "Ihr Teil ist erledigt!"}</div>
      <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginTop: 6, maxWidth: 400, margin: "6px auto 0" }}>{t("wa_flowmatix_takes_over") || "Flowmatix uebernimmt jetzt die Nummer-Registrierung und Konfiguration. Sie werden benachrichtigt, sobald WhatsApp aktiv ist."}</div>
    </div>}
    {isAlreadyConnected && <div style={{ padding: 20, borderRadius: 14, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", textAlign: "center", marginTop: 12 }}>
      <span style={{ fontSize: 32 }}>🎉</span>
      <div style={{ fontWeight: 800, fontSize: 17, color: "#10b981", marginTop: 8 }}>{t("wa_is_live") || "WhatsApp ist live!"}</div>
      <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginTop: 6 }}>{t("wa_live_desc") || "Ihr AI-Assistent antwortet jetzt automatisch auf Patientenanfragen."}</div>
    </div>}
  </div>;
}
