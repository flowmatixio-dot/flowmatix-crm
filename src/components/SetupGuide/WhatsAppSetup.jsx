import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Btn, Section } from "../shared/index";

const META_STEPS = [
  {
    id: "create_meta",
    num: 1,
    title: "Meta Business Account erstellen",
    titleEn: "Create Meta Business Account",
    time: "5 Min",
    instructions: [
      { text: "Gehen Sie zu business.facebook.com", link: "https://business.facebook.com" },
      { text: "Klicken Sie auf 'Konto erstellen'" },
      { text: "Geben Sie den offiziellen Namen Ihrer Praxis ein" },
      { text: "Tragen Sie Ihre Geschaeftsadresse und Kontaktdaten ein" },
      { text: "Bestaetigen Sie Ihre E-Mail-Adresse" },
    ],
    instructionsEn: [
      { text: "Go to business.facebook.com", link: "https://business.facebook.com" },
      { text: "Click 'Create Account'" },
      { text: "Enter your clinic's official business name" },
      { text: "Fill in your business address and contact details" },
      { text: "Verify your email address" },
    ],
    check: "meta_account_created",
    important: "Verwenden Sie den EXAKTEN offiziellen Namen aus Ihrem Gewerbeschein.",
    importantEn: "Use the EXACT official name from your business registration.",
  },
  {
    id: "verify_business",
    num: 2,
    title: "Unternehmen verifizieren",
    titleEn: "Verify Your Business",
    time: "10 Min + 1-5 Tage Wartezeit",
    instructions: [
      { text: "Im Meta Business Manager: Einstellungen > Unternehmensinfos > Verifizierung starten" },
      { text: "Laden Sie eines dieser Dokumente hoch:", bold: true },
      { text: "    - Gewerbeschein / Handelsregisterauszug" },
      { text: "    - Steuerbescheid oder IHK-Bescheinigung" },
      { text: "Laden Sie einen Adressnachweis hoch:", bold: true },
      { text: "    - Strom-/Telefonrechnung (max. 3 Monate alt)" },
      { text: "    - Oder Kontoauszug mit Adresse" },
      { text: "Waehlen Sie die Verifizierungsmethode (E-Mail oder Telefon)" },
      { text: "Warten Sie auf die Bestaetigung von Meta (1-5 Werktage)" },
    ],
    instructionsEn: [
      { text: "In Meta Business Manager: Settings > Business Info > Start Verification" },
      { text: "Upload one of these documents:", bold: true },
      { text: "    - Business registration / trade license" },
      { text: "    - Tax certificate or chamber of commerce document" },
      { text: "Upload proof of address:", bold: true },
      { text: "    - Utility bill (max 3 months old)" },
      { text: "    - Or bank statement with address" },
      { text: "Choose verification method (email or phone)" },
      { text: "Wait for Meta confirmation (1-5 business days)" },
    ],
    check: "meta_verified",
    important: "Laden Sie die gleichen Dokumente auch hier hoch (unten). Unser Team kann Sie bei Problemen unterstuetzen.",
    importantEn: "Also upload the same documents below. Our team can assist you if there are issues.",
    hasUpload: true,
  },
  {
    id: "invite_partner",
    num: 3,
    title: "Flowmatix als Partner einladen",
    titleEn: "Invite Flowmatix as Partner",
    time: "2 Min",
    instructions: [
      { text: "Im Meta Business Manager: Einstellungen > Partner" },
      { text: "Klicken Sie 'Partner hinzufuegen'" },
      { text: "Geben Sie diese Business ID ein:", bold: true },
      { text: "    FLOWMATIX_PARTNER_ID", mono: true, copyable: true },
      { text: "Aktivieren Sie diese Berechtigungen:", bold: true },
      { text: "    - WhatsApp-Konten verwalten" },
      { text: "    - Nachrichten senden und empfangen" },
      { text: "    - Telefonnummern verwalten" },
      { text: "Klicken Sie 'Einladung senden'" },
    ],
    instructionsEn: [
      { text: "In Meta Business Manager: Settings > Partners" },
      { text: "Click 'Add Partner'" },
      { text: "Enter this Business ID:", bold: true },
      { text: "    FLOWMATIX_PARTNER_ID", mono: true, copyable: true },
      { text: "Enable these permissions:", bold: true },
      { text: "    - Manage WhatsApp accounts" },
      { text: "    - Send and receive messages" },
      { text: "    - Manage phone numbers" },
      { text: "Click 'Send Invitation'" },
    ],
    check: "partner_invited",
    important: "Wir erhalten eine Benachrichtigung sobald Sie die Einladung senden. Unser Team nimmt sie innerhalb von 24 Stunden an.",
    importantEn: "We'll be notified when you send the invitation. Our team accepts it within 24 hours.",
  },
  {
    id: "register_number",
    num: 4,
    title: "WhatsApp-Nummer registrieren",
    titleEn: "Register WhatsApp Number",
    time: "5 Min",
    instructions: [
      { text: "Unser Team registriert Ihre Nummer nachdem die Partner-Einladung angenommen wurde" },
      { text: "Sie erhalten einen 6-stelligen SMS-Code auf Ihre Praxisnummer", bold: true },
      { text: "Geben Sie den Code unten ein" },
      { text: "Ihre Nummer ist danach sofort aktiv" },
    ],
    instructionsEn: [
      { text: "Our team registers your number after accepting the partner invitation" },
      { text: "You'll receive a 6-digit SMS code on your clinic number", bold: true },
      { text: "Enter the code below" },
      { text: "Your number will be active immediately after" },
    ],
    check: "number_registered",
    important: "Am besten abends machen - die Nummer ist waehrend der Registrierung kurz (~5 Min) nicht erreichbar.",
    importantEn: "Best done in the evening - the number is briefly unreachable (~5 min) during registration.",
    hasSmsInput: true,
  },
  {
    id: "test_connection",
    num: 5,
    title: "Verbindung testen",
    titleEn: "Test Connection",
    time: "1 Min",
    instructions: [
      { text: "Senden Sie eine Testnachricht an Ihre Praxisnummer" },
      { text: "Der AI-Assistent sollte automatisch antworten" },
      { text: "Fertig! Ihr WhatsApp-Kanal ist live." },
    ],
    instructionsEn: [
      { text: "Send a test message to your clinic number" },
      { text: "The AI assistant should respond automatically" },
      { text: "Done! Your WhatsApp channel is live." },
    ],
    check: "connection_tested",
    important: null,
  },
];

export default function WhatsAppSetup() {
  const { clinic, activeClinicId, setClinics, showT } = useApp();
  const [activeStep, setActiveStep] = useState(0);
  const [uploads, setUploads] = useState({});
  const [smsCode, setSmsCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(clinic?.phone || "");
  const lang = "de"; // could be dynamic

  const waSetup = clinic?.waSetupProgress || {};
  const completedSteps = META_STEPS.filter(s => waSetup[s.check]).length;
  const progress = Math.round((completedSteps / META_STEPS.length) * 100);

  const markDone = (checkKey) => {
    setClinics(cs => cs.map(c => c.id === activeClinicId ? {
      ...c,
      waSetupProgress: { ...(c.waSetupProgress || {}), [checkKey]: true, [`${checkKey}_at`]: new Date().toISOString() }
    } : c));
    showT("Step completed!");
    // Auto-advance
    const nextIdx = META_STEPS.findIndex(s => s.check === checkKey) + 1;
    if (nextIdx < META_STEPS.length) setActiveStep(nextIdx);
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploads(prev => ({ ...prev, docs: [...(prev.docs || []), ...files.map(f => f.name)] }));
    showT(`${files.length} document(s) uploaded`);
    // TODO: actual upload to API
  };

  return <div style={{ padding: "28px 32px", maxWidth: 800 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>WhatsApp Setup</h1>
      <span style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: progress === 100 ? "rgba(16,185,129,0.1)" : "rgba(76,201,255,0.08)", color: progress === 100 ? "#10b981" : "#4cc9ff" }}>
        {completedSteps}/{META_STEPS.length} Steps
      </span>
    </div>
    <p style={{ fontSize: 14, color: "rgba(167,177,195,0.5)", margin: "0 0 20px" }}>
      Schritt-fuer-Schritt Anleitung um WhatsApp Business API mit Ihrer Praxis zu verbinden.
    </p>

    {/* Progress bar */}
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 24 }}>
      <div style={{ height: 8, borderRadius: 4, background: progress === 100 ? "#10b981" : "linear-gradient(90deg, #4cc9ff, #2da8ff)", width: `${progress}%`, transition: "width .5s ease" }} />
    </div>

    {/* Phone number input */}
    <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 8 }}>WhatsApp-Nummer Ihrer Praxis</div>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+49 30 1234567" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "inherit", fontSize: 15, outline: "none" }} />
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", color: "#10b981", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          Vorhandene Nummer empfohlen
        </div>
      </div>
    </div>

    {/* Steps */}
    {META_STEPS.map((step, idx) => {
      const isDone = waSetup[step.check];
      const isActive = idx === activeStep;
      const isLocked = idx > 0 && !waSetup[META_STEPS[idx - 1].check] && !isDone;
      const instructions = lang === "de" ? step.instructions : step.instructionsEn;
      const important = lang === "de" ? step.important : step.importantEn;
      const title = lang === "de" ? step.title : step.titleEn;

      return <div key={step.id} style={{ marginBottom: 12 }}>
        <div
          onClick={() => !isLocked && setActiveStep(isActive ? -1 : idx)}
          style={{
            padding: "14px 18px", borderRadius: isActive ? "14px 14px 0 0" : 14,
            background: isDone ? "rgba(16,185,129,0.04)" : isActive ? "rgba(76,201,255,0.04)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${isDone ? "rgba(16,185,129,0.15)" : isActive ? "rgba(76,201,255,0.15)" : "rgba(255,255,255,0.06)"}`,
            borderBottom: isActive ? "none" : undefined,
            cursor: isLocked ? "not-allowed" : "pointer",
            opacity: isLocked ? 0.4 : 1,
            display: "flex", alignItems: "center", gap: 14,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: isDone ? "#10b981" : isActive ? "#4cc9ff" : "rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: (isDone || isActive) ? "#fff" : "rgba(167,177,195,0.5)",
          }}>
            {isDone ? "✓" : step.num}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: isDone ? "#10b981" : "rgba(232,238,252,0.88)" }}>{title}</div>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", marginTop: 2 }}>{step.time}</div>
          </div>
          {isDone && <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", padding: "3px 10px", borderRadius: 6, background: "rgba(16,185,129,0.08)" }}>Erledigt</span>}
          {!isDone && !isLocked && <span style={{ fontSize: 16, color: "rgba(167,177,195,0.3)" }}>{isActive ? "▲" : "▼"}</span>}
        </div>

        {/* Expanded step content */}
        {isActive && !isLocked && <div style={{
          padding: 20, borderRadius: "0 0 14px 14px",
          background: "rgba(76,201,255,0.02)",
          border: "1px solid rgba(76,201,255,0.15)", borderTop: "none",
        }}>
          <ol style={{ margin: "0 0 16px", padding: "0 0 0 20px", lineHeight: 2 }}>
            {instructions.map((inst, i) => <li key={i} style={{
              fontSize: 13,
              fontWeight: inst.bold ? 700 : 400,
              color: inst.bold ? "rgba(232,238,252,0.88)" : "rgba(167,177,195,0.7)",
              fontFamily: inst.mono ? "monospace" : "inherit",
              listStyleType: inst.text.startsWith("    ") ? "none" : undefined,
            }}>
              {inst.link
                ? <a href={inst.link} target="_blank" rel="noopener noreferrer" style={{ color: "#4cc9ff", textDecoration: "underline" }}>{inst.text}</a>
                : inst.text}
              {inst.copyable && <button onClick={() => { navigator.clipboard.writeText("YOUR_META_BUSINESS_ID"); showT("Copied!"); }} style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Copy</button>}
            </li>)}
          </ol>

          {/* Important note */}
          {important && <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,138,42,0.05)", border: "1px solid rgba(255,138,42,0.12)", fontSize: 12, color: "rgba(255,138,42,0.8)", marginBottom: 16, lineHeight: 1.6 }}>
            <strong>Wichtig:</strong> {important}
          </div>}

          {/* Document upload for verification step */}
          {step.hasUpload && <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 8 }}>Dokumente hochladen (fuer unseren Support)</div>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} style={{ fontSize: 12, color: "rgba(167,177,195,0.5)" }} />
            {(uploads.docs || []).length > 0 && <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {uploads.docs.map((f, i) => <span key={i} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", fontSize: 11, color: "#10b981" }}>{f}</span>)}
            </div>}
          </div>}

          {/* SMS code input for number registration */}
          {step.hasSmsInput && <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.5)", marginBottom: 8 }}>SMS-Verifizierungscode</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={smsCode} onChange={e => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-stelliger Code" maxLength={6} style={{ width: 160, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "monospace", fontSize: 20, letterSpacing: 8, textAlign: "center", outline: "none" }} />
              <button onClick={() => { if (smsCode.length === 6) { showT("Code submitted — verifying..."); } }} disabled={smsCode.length !== 6} style={{ padding: "10px 20px", borderRadius: 10, background: smsCode.length === 6 ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.04)", border: "none", color: smsCode.length === 6 ? "#fff" : "rgba(167,177,195,0.3)", fontWeight: 700, fontSize: 13, cursor: smsCode.length === 6 ? "pointer" : "not-allowed", fontFamily: "inherit" }}>Verifizieren</button>
            </div>
          </div>}

          {/* Mark as done button */}
          {!isDone && <button onClick={() => markDone(step.check)} style={{
            padding: "10px 24px", borderRadius: 10,
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Schritt abgeschlossen
          </button>}
        </div>}
      </div>;
    })}

    {/* All done */}
    {progress === 100 && <div style={{ padding: 20, borderRadius: 14, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", textAlign: "center", marginTop: 12 }}>
      <span style={{ fontSize: 32 }}>🎉</span>
      <div style={{ fontWeight: 800, fontSize: 17, color: "#10b981", marginTop: 8 }}>WhatsApp ist live!</div>
      <div style={{ fontSize: 13, color: "rgba(167,177,195,0.5)", marginTop: 6 }}>Ihr AI-Assistent antwortet jetzt automatisch auf Patientenanfragen.</div>
    </div>}
  </div>;
}
