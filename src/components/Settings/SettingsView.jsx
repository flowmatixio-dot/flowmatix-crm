import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useApp } from "../../context/AppContext";
import { Section, Field, Toggle } from "../shared/index";
import HintBox from "../shared/HintBox.jsx";
import { ROLES, PERM_LABELS, MODULE_ACCESS } from "../../data/constants";
import { consumePendingSettingsTab, consumeHighlightAnchor, isFromSetup, clearFromSetup } from "../../lib/setupNav";
import { getGoogleStatus, getGoogleConnectUrlSafe, disconnectGoogle, updateClinicSettings, isAuthenticated, inviteTeamMember, removeTeamMember, updateTeamMember, fetchTeam, updatePassword, setupMfa, verifyMfa, disableMfa, getMe } from "../../api/client";
import WhatsAppSetup from "../SetupGuide/WhatsAppSetup";
import BotProfile from "../SetupGuide/BotProfile";
import FAQKnowledgeBase from "../SetupGuide/FAQKnowledgeBase";
import TreatmentTypes from "../SetupGuide/TreatmentTypes";
import CalendarSettings from "../SetupGuide/CalendarSettings";
import DpaGeneratorModal from "./DpaGeneratorModal";
const AutomationsView = lazy(() => import("../Automations/AutomationsView"));
const SubscriptionView = lazy(() => import("../Subscription/SubscriptionView"));
const AnalyticsView = lazy(() => import("../Analytics/AnalyticsView"));
const RevenueView = lazy(() => import("../Revenue/RevenueView"));
const AuditLogView = lazy(() => import("../AuditLog/AuditLogView"));
const PaymentsView = lazy(() => import("../Finance/PaymentsView"));

function AccountSection({ t, showT, user }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!currentPw) { setError(t("current_pw_required") || "Aktuelles Passwort eingeben"); return; }
    if (newPw.length < 8) { setError(t("pw_min_8")); return; }
    if (newPw !== confirmPw) { setError(t("pw_mismatch")); return; }
    setSaving(true);
    try {
      await updatePassword(newPw, currentPw);
      showT(t("pw_changed"));
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setError("");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("incorrect")) setError(t("pw_incorrect") || "Aktuelles Passwort falsch");
      else setError(msg || (t("auto_error") || "Error"));
    }
    setSaving(false);
  };

  const inp = { width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated, rgba(255,255,255,0.04))", border: "1px solid var(--border-strong, rgba(255,255,255,0.08))", color: "var(--text-primary, #e8eefc)", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const roleLabel = { clinic_admin: "Admin", clinic_coordinator: t("role_coordinator") || "Coordinator", clinic_doctor: t("role_doctor") || "Doctor", clinic_finance: t("role_finance") || "Finance", platform_owner: "Platform Owner" }[user?.apiRole || user?.role] || user?.apiRole || "—";

  return <>
    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, color: "rgba(232,238,252,0.9)" }}>{t("account")}</div>

    <div style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{t("logged_in_as")}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(232,238,252,0.9)" }}>{user?.email || "—"}</div>
      <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", marginTop: 4 }}>{t("role")}: {roleLabel}</div>
    </div>

    <div style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,238,252,0.85)", marginBottom: 16 }}>{t("change_password")}</div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(167,177,195,0.7)", display: "block", marginBottom: 4 }}>{t("current_password") || "Aktuelles Passwort"}</label>
        <div style={{ position: "relative" }}>
          <input type={showPw ? "text" : "password"} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" style={{...inp, paddingRight: 40}} />
          <span onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 16, color: "rgba(167,177,195,0.6)", userSelect: "none" }}>{showPw ? "🙈" : "👁"}</span>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(167,177,195,0.7)", display: "block", marginBottom: 4 }}>{t("new_password")}</label>
        <div style={{ position: "relative" }}>
          <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" style={{...inp, paddingRight: 40}} />
          <span onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 16, color: "rgba(167,177,195,0.6)", userSelect: "none" }}>{showPw ? "🙈" : "👁"}</span>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(167,177,195,0.7)", display: "block", marginBottom: 4 }}>{t("confirm_password")}</label>
        <div style={{ position: "relative" }}>
          <input type={showPw ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" style={{...inp, paddingRight: 40}} />
          <span onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 16, color: "rgba(167,177,195,0.6)", userSelect: "none" }}>{showPw ? "🙈" : "👁"}</span>
        </div>
      </div>
      {error && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>{error}</div>}
      <button onClick={handleSave} disabled={saving || !newPw} style={{ padding: "10px 24px", borderRadius: 10, background: saving || !newPw ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#10b981,#059669)", border: "none", color: saving || !newPw ? "rgba(167,177,195,0.7)" : "#fff", fontWeight: 700, fontSize: 14, cursor: saving || !newPw ? "default" : "pointer", fontFamily: "inherit", boxShadow: saving || !newPw ? "none" : "0 4px 12px rgba(16,185,129,0.3)" }}>
        {saving ? t("saving") : t("change_password")}
      </button>
    </div>

    <MfaSection t={t} showT={showT} />

    <DataProcessingSection />
  </>;
}

function DataProcessingSection() {
  // Inline language map — these strings are launch-blocker copy and we
  // don't want to round-trip them through i18n.js for a single section.
  const lang = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
  const TR = (de, en, tr) => ({ de, en, tr }[lang] || de);
  const { clinic } = useApp();
  const [dpaModalOpen, setDpaModalOpen] = useState(false);

  // Pick the localized PDF. Turkish falls back to the English DPA file.
  const pdfHref = lang === "tr" ? "/legal/DPA-Turkisch.pdf" : lang === "en" ? "/legal/AVV-Englisch.pdf" : "/legal/AVV-Deutsch.pdf";
  const pdfLabel = lang === "tr" ? "DPA-Turkisch.pdf" : lang === "en" ? "AVV-Englisch.pdf" : "AVV-Deutsch.pdf";

  return <div id="fm-section-dpa" style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginTop: 20 }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,238,252,0.85)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 16 }}>📄</span>
      {TR("Auftragsverarbeitungsvertrag (AVV)", "Data Processing Agreement (DPA)", "Veri İşleme Sözleşmesi (DPA)")}
    </div>
    <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginBottom: 16, lineHeight: 1.5 }}>
      {TR(
        "Gemäß Art. 28 DSGVO verarbeitet Flowmatix personenbezogene Daten Ihrer Patienten in Ihrem Auftrag. Der AVV regelt diese Verarbeitung rechtsverbindlich.",
        "Under Art. 28 GDPR, Flowmatix processes your patients' personal data on your behalf. The DPA governs this processing in a legally binding manner.",
        "GDPR Madde 28 uyarınca, Flowmatix hastalarınızın kişisel verilerini sizin adınıza işler. DPA, bu işlemeyi yasal olarak bağlayıcı bir şekilde düzenler."
      )}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button
        onClick={() => setDpaModalOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 10,
          background: "linear-gradient(135deg,rgba(76,201,255,.18),rgba(45,168,255,.12))",
          border: "1px solid rgba(76,201,255,0.3)",
          color: "#4cc9ff",
          fontWeight: 800,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "inherit"
        }}
      >
        <span>✏️</span>
        {TR("AVV mit Klinik-Daten erstellen", "Generate DPA with clinic data", "Klinik verileriyle DPA oluştur")}
      </button>
      <a
        href={pdfHref}
        target="_blank"
        rel="noopener noreferrer"
        download
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(167,177,195,0.85)",
          fontWeight: 700,
          fontSize: 13,
          textDecoration: "none",
          fontFamily: "inherit"
        }}
      >
        <span>⬇</span>
        {TR("Leere Vorlage herunterladen", "Download blank template", "Boş şablonu indir")}
        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>({pdfLabel})</span>
      </a>
      <a
        href={lang === "tr" ? "/legal/DPIA-Turkisch.pdf" : lang === "en" ? "/legal/DPIA-English.pdf" : "/legal/DPIA-Deutsch.pdf"}
        target="_blank"
        rel="noopener noreferrer"
        download
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(167,177,195,0.85)",
          fontWeight: 700,
          fontSize: 13,
          textDecoration: "none",
          fontFamily: "inherit"
        }}
      >
        <span>📊</span>
        {TR("DPIA herunterladen", "Download DPIA", "DPIA İndir")}
      </a>
    </div>

    <DpaGeneratorModal
      open={dpaModalOpen}
      lang={lang}
      initialClinicName={clinic?.name || ""}
      onClose={() => setDpaModalOpen(false)}
    />
    <div style={{ fontSize: 11, color: "rgba(167,177,195,0.5)", marginTop: 12 }}>
      {TR(
        "Mit der Nutzung von Flowmatix gilt der AVV als anerkannt. Die DPIA dokumentiert die Datenschutz-Folgenabschätzung nach Art. 35 DSGVO. Bei Fragen: legal@flowmatix.io",
        "By using Flowmatix, the DPA is considered accepted. The DPIA documents the data protection impact assessment under Art. 35 GDPR. Questions: legal@flowmatix.io",
        "Flowmatix kullanılarak DPA kabul edilmiş sayılır. DPIA, GDPR Madde 35 kapsamında veri koruma etki değerlendirmesini belgeler. Sorularınız için: legal@flowmatix.io"
      )}
    </div>
  </div>;
}

function MfaSection({ t, showT }) {
  const [mfaEnabled, setMfaEnabled] = useState(null); // null = loading, true/false
  const [step, setStep] = useState("idle"); // idle | setup | verify | disable
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMe().then(u => {
      setMfaEnabled(!!(u?.mfa_enabled));
    }).catch(() => setMfaEnabled(false));
  }, []);

  const inp = { width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-card-elevated, rgba(255,255,255,0.04))", border: "1px solid var(--border-strong, rgba(255,255,255,0.08))", color: "var(--text-primary, #e8eefc)", fontFamily: "'Plus Jakarta Sans', monospace", fontSize: 20, fontWeight: 800, letterSpacing: "0.3em", textAlign: "center", outline: "none", boxSizing: "border-box" };

  const [qrUrl, setQrUrl] = useState("");

  const handleSetup = async () => {
    setLoading(true); setError("");
    try {
      const res = await setupMfa();
      setSecret(res.secret);
      if (res.otpauthUri) {
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.otpauthUri)}&bgcolor=0f1623&color=e8eefc`);
      }
      setStep("verify");
    } catch (e) {
      setError(e.message || "Error");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true); setError("");
    try {
      await verifyMfa(code);
      setMfaEnabled(true);
      setStep("idle");
      setSecret("");
      setCode("");
      showT(t("mfa_setup_complete"));
    } catch (e) {
      setError(e.message || "Invalid code");
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (code.length !== 6) return;
    setLoading(true); setError("");
    try {
      await disableMfa(code);
      setMfaEnabled(false);
      setStep("idle");
      setCode("");
      showT(t("mfa_disabled_success") || "2FA disabled");
    } catch (e) {
      setError(e.message || "Invalid code");
    }
    setLoading(false);
  };

  if (mfaEnabled === null) return null; // still loading

  return <div id="fm-section-mfa" style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginTop: 20 }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,238,252,0.85)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 16 }}>🔐</span>
      {t("mfa_title")}
    </div>

    {/* ── MFA is active ── */}
    {mfaEnabled && step === "idle" && <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <span style={{ color: "#10b981", fontWeight: 700, fontSize: 14 }}>&#10003;</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>{t("mfa_active")}</span>
      </div>
      <button onClick={() => { setStep("disable"); setCode(""); setError(""); }} style={{ padding: "8px 20px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("mfa_disable")}</button>
    </div>}

    {/* ── MFA not enabled ── */}
    {!mfaEnabled && step === "idle" && <div>
      <div style={{ fontSize: 13, color: "rgba(167,177,195,0.6)", marginBottom: 14 }}>{t("mfa_description") || t("mfa_enter_code")}</div>
      <button onClick={handleSetup} disabled={loading} style={{ padding: "10px 24px", borderRadius: 10, background: loading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,rgba(76,201,255,.12),rgba(45,168,255,.08))", border: "1px solid rgba(76,201,255,0.2)", color: loading ? "rgba(167,177,195,0.7)" : "#4cc9ff", fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", fontFamily: "inherit" }}>{loading ? "..." : t("mfa_enable")}</button>
    </div>}

    {/* ── Setup step: show secret + verify ── */}
    {step === "verify" && <div>
      {qrUrl && <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(167,177,195,0.7)", marginBottom: 8 }}>{t("mfa_scan_qr") || "Scan with Authenticator App"}</div>
        <div style={{ display: "inline-block", padding: 12, borderRadius: 12, background: "#fff", position: "relative" }}>
          <img src={qrUrl} alt="2FA QR Code" width={180} height={180} style={{ display: "block" }} />
          <img src="/Flowmatix-Logo-Round.png" alt="" width={36} height={36} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", borderRadius: "50%", background: "#fff", padding: 2 }} />
        </div>
      </div>}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(167,177,195,0.7)", marginBottom: 8 }}>{t("mfa_scan_secret")}</div>
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: "#4cc9ff", letterSpacing: "0.12em", wordBreak: "break-all", userSelect: "all", cursor: "text" }}>{secret}</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(167,177,195,0.7)", display: "block", marginBottom: 4 }}>{t("mfa_enter_code")}</label>
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" autoComplete="one-time-code" onKeyDown={e => e.key === "Enter" && handleVerify()} autoFocus style={inp} />
      </div>
      {error && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleVerify} disabled={loading || code.length !== 6} style={{ padding: "8px 20px", borderRadius: 10, background: code.length === 6 ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.06)", border: "none", color: code.length === 6 ? "#fff" : "rgba(167,177,195,0.7)", fontWeight: 700, fontSize: 13, cursor: code.length === 6 ? "pointer" : "default", fontFamily: "inherit", boxShadow: code.length === 6 ? "0 4px 12px rgba(16,185,129,0.3)" : "none" }}>{loading ? "..." : t("mfa_enable")}</button>
        <button onClick={() => { setStep("idle"); setSecret(""); setCode(""); setError(""); }} style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("cancel") || "Cancel"}</button>
      </div>
    </div>}

    {/* ── Disable step: enter code to confirm ── */}
    {step === "disable" && <div>
      <div style={{ fontSize: 13, color: "rgba(167,177,195,0.6)", marginBottom: 12 }}>{t("mfa_enter_code")}</div>
      <div style={{ marginBottom: 12 }}>
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" autoComplete="one-time-code" onKeyDown={e => e.key === "Enter" && handleDisable()} autoFocus style={inp} />
      </div>
      {error && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleDisable} disabled={loading || code.length !== 6} style={{ padding: "8px 20px", borderRadius: 10, background: code.length === 6 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)", border: code.length === 6 ? "1px solid rgba(239,68,68,0.3)" : "none", color: code.length === 6 ? "#ef4444" : "rgba(167,177,195,0.7)", fontWeight: 700, fontSize: 13, cursor: code.length === 6 ? "pointer" : "default", fontFamily: "inherit" }}>{loading ? "..." : t("mfa_disable")}</button>
        <button onClick={() => { setStep("idle"); setCode(""); setError(""); }} style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.7)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{t("cancel") || "Cancel"}</button>
      </div>
    </div>}
  </div>;
}

function IntegrationsSection({ t, clinic, showT }) {
  const [gStatus, setGStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const orgId = clinic?.orgId || clinic?.id;

  useEffect(() => {
    if (isAuthenticated() && orgId) {
      getGoogleStatus(orgId).then(setGStatus).catch(() => {});
    }
  }, [orgId]);

  const handleConnect = async () => {
    if (!orgId) return;
    window.location.href = await getGoogleConnectUrlSafe(orgId);
  };

  const handleDisconnect = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      await disconnectGoogle(orgId);
      setGStatus(prev => ({ ...prev, connected: false }));
      showT(t("google_disconnected"));
    } catch { showT(t("error_disconnecting")); }
    setLoading(false);
  };

  const isLive = isAuthenticated() && gStatus;
  const googleConnected = isLive && gStatus.connected;

  // Analytics-Anbieter section was removed: the backend stored the
  // GA4/Plausible/Matomo IDs in organizations.metadata but nothing
  // ever read them — no tracking script injection, no API fetch, no
  // display in AnalyticsView. Keeping a UI section that doesn't do
  // anything is misleading. Bring it back as a real feature when
  // there's an actual reader (GA4 Reporting API or tag injection).
  const integrations = [
    { name: "WhatsApp", status: clinic?.connection_status === "connected", icon: "💬" },
    { name: "Google Calendar", status: googleConnected && gStatus.hasCalendar, icon: "📅" },
    { name: "Google Drive", status: googleConnected && gStatus.hasDrive, icon: "📁" },
    { name: "Google Sheets", status: googleConnected && gStatus.hasSheets, icon: "📝" },
    { name: "Stripe Payments", status: false, icon: "💳" },
  ];

  return <Section title={t("integrations") || "Integrationen"}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
      {integrations.map((int,i)=>
        <div key={i} style={{padding:14,borderRadius:12,background:int.status?"rgba(16,185,129,0.04)":"var(--bg-section)",border:`1px solid ${int.status?"rgba(16,185,129,0.15)":"var(--border-default)"}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:18}}>{int.icon}</span><span style={{fontWeight:600,fontSize:14}}>{int.name}</span></div>
          <span style={{padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:int.status?"rgba(16,185,129,0.12)":"var(--border-default)",color:int.status?"#10b981":"var(--text-muted)"}}>{int.status?(t("connected")||"Verbunden"):(t("not_connected")||"Nicht verbunden")}</span>
        </div>
      )}
    </div>
    {isLive && <div style={{display:"flex",gap:8}}>
      {!googleConnected && <button onClick={handleConnect} disabled={loading} style={{padding:"8px 18px",borderRadius:10,background:"rgba(76,201,255,0.08)",border:"1px solid rgba(76,201,255,0.2)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("connect_google")}</button>}
      {googleConnected && <button onClick={handleDisconnect} disabled={loading} style={{padding:"8px 18px",borderRadius:10,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("disconnect_google") || "Google trennen"}</button>}
    </div>}
    {isLive && gStatus.lastError && <div style={{marginTop:8,fontSize:12,color:"#ef4444"}}>{gStatus.lastError}</div>}

    {/* ═══ GDPR Opt-In: Auto-Upload zu Google Drive — always shown for transparency ═══
        Inline TR helper instead of t() because t() returns the key string itself
        when missing, which makes `t(key) || fallback` useless (key is truthy). */}
    {isLive && (() => {
      const ll = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
      const TR = (de, en, tr) => ({ de, en, tr }[ll] || de);
      return <div style={{marginTop:16,padding:14,borderRadius:10,background:"rgba(251,191,36,0.03)",border:"1px solid rgba(251,191,36,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:6}}>
          <div style={{fontSize:12,fontWeight:800,color:"#fbbf24",display:"flex",alignItems:"center",gap:6}}>⚠️ {TR("Auto-Upload zu Google Drive", "Auto-upload to Google Drive", "Google Drive'a otomatik yükleme")}</div>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:googleConnected?"pointer":"not-allowed",opacity:googleConnected?1:0.5}}>
            <input
              type="checkbox"
              checked={!!gStatus?.driveAutoUpload}
              disabled={loading || !googleConnected}
              onChange={async (e) => {
                const enabled = e.target.checked;
                setLoading(true);
                try {
                  const { apiFetch } = await import("../../api/client");
                  await apiFetch("/api/v1/auth/google/drive-auto-upload", { method: "PATCH", body: JSON.stringify({ enabled }) });
                  setGStatus(prev => ({ ...prev, driveAutoUpload: enabled }));
                  showT(enabled ? TR("Auto-Upload aktiviert", "Auto-upload enabled", "Otomatik yükleme etkinleştirildi") : TR("Auto-Upload deaktiviert", "Auto-upload disabled", "Otomatik yükleme devre dışı"));
                } catch (err) {
                  showT(err?.message || TR("Fehler", "Error", "Hata"), "error");
                }
                setLoading(false);
              }}
              style={{width:16,height:16,accentColor:"#10b981",cursor:googleConnected?"pointer":"not-allowed"}}
            />
            <span style={{fontSize:12,fontWeight:700,color:gStatus?.driveAutoUpload?"#10b981":"rgba(167,177,195,0.7)"}}>{gStatus?.driveAutoUpload?TR("AN","ON","AÇIK"):TR("AUS","OFF","KAPALI")}</span>
          </label>
        </div>
        <div style={{fontSize:11,color:"rgba(167,177,195,0.65)",lineHeight:1.5}}>
          {googleConnected
            ? TR(
                "Wenn AN: Patientenfotos werden automatisch in Google Drive hochgeladen. Google ist ein US-Dienst — Sie brauchen einen DPA mit Google Workspace. Standard: AUS.",
                "When ON: patient photos are automatically uploaded to Google Drive. Google is a US service — you need a DPA with Google Workspace. Default: OFF.",
                "AÇIK olduğunda: hasta fotoğrafları otomatik olarak Google Drive'a yüklenir. Google bir ABD hizmetidir — Google Workspace ile bir DPA'ya ihtiyacınız var. Varsayılan: KAPALI."
              )
            : TR(
                "Google ist nicht verbunden — Auto-Upload nicht möglich. Erst Google verbinden.",
                "Google is not connected — auto-upload not available. Connect Google first.",
                "Google bağlı değil — otomatik yükleme kullanılamıyor. Önce Google'ı bağlayın."
              )}
        </div>
      </div>;
    })()}

  </Section>;
}

/* ═══ Team & Access Management ═══ */
function TeamAccessSection({ clinic, showT, t, setClinics }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState("coordinator");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [team, setTeam] = useState(clinic?.team || []);

  const plan = clinic?.plan || "core";
  const hasRbac = true; // All plans have team access — only patient limits differ

  // Load team from API on mount
  useEffect(() => {
    if (!hasRbac) return;
    fetchTeam().then(res => {
      const members = res?.members || res?.team || [];
      setTeam(members);
      if (setClinics && clinic?.id) {
        setClinics(prev => prev.map(c => c.id === clinic.id ? { ...c, team: members } : c));
      }
    }).catch(() => {});
  }, [hasRbac]);

  const refreshTeam = async () => {
    try {
      const res = await fetchTeam();
      const members = res?.members || res?.team || [];
      setTeam(members);
      if (setClinics && clinic?.id) {
        setClinics(prev => prev.map(c => c.id === clinic.id ? { ...c, team: members } : c));
      }
    } catch {}
  };

  const ROLE_META = {
    admin:       { label: "Admin", color: "#4cc9ff", icon: "👑", desc: t("role_full_access") },
    coordinator: { label: t("role_coordinator"), color: "#a78bfa", icon: "📋", desc: t("role_coordinator_desc") },
    doctor:      { label: t("role_doctor"), color: "#10b981", icon: "⚕️", desc: t("role_doctor_desc") },
    finance:     { label: t("role_finance"), color: "#f59e0b", icon: "💰", desc: t("role_finance_desc") },
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
      await refreshTeam();
    } catch (e) { showT(e.message || (t("settings_invite_error") || "Error inviting")); }
    setSending(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateTeamMember(userId, { role: `clinic_${newRole}` });
      showT(t("settings_role_updated") || "Role updated");
      setEditingId(null);
      await refreshTeam();
    } catch (e) { showT(e.message || (t("auto_error") || "Error")); }
  };

  const handleDeactivate = async (userId, userName) => {
    if (!window.confirm(`${userName} ${t("settings_deactivate_confirm") || "really deactivate?"}`)) return;
    try {
      await removeTeamMember(userId);
      showT(`${userName} ${t("deactivated_toast") || "deaktiviert"}`);
      await refreshTeam();
    } catch (e) { showT(e.message || t("error_generic") || "Fehler"); }
  };

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" };

  // Plan gate: only Operations + Enterprise
  if (!hasRbac) {
    return (
      <Section title={`👥 ${t("team_access") || "Team & Zugriff"}`}>
        <div style={{ padding: "30px 20px", textAlign: "center", borderRadius: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "rgba(232,238,252,0.95)" }}>{t("ops_plan_required") || "Operations oder Enterprise Plan erforderlich"}</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.75)", marginTop: 6, maxWidth: 340, margin: "6px auto 0", lineHeight: 1.5 }}>
            {t("team_mgmt_desc") || "Team-Verwaltung und Rollenverteilung sind ab dem Operations-Plan verfügbar. Damit kannst du Koordinatoren, Ärzte und Finanzmitarbeiter mit eigenen Zugriffsrechten hinzufügen."}
          </div>
          <div style={{ marginTop: 16 }}>
            <span style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(255,138,42,0.08)", border: "1px solid rgba(255,138,42,0.12)", color: "#ff8a2a" }}>
              {t("current_plan_prefix") || "Aktueller Plan:"} {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title={`👥 ${t("team_access") || "Team & Zugriff"}`}>
      {/* Team list header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "rgba(167,177,195,0.6)" }}>
          {team.length} {team.length !== 1 ? (t("team_members_count") || "Teammitglieder") : (t("team_member_count") || "Teammitglied")}
        </div>
        <button onClick={() => setInviteOpen(!inviteOpen)} style={{
          padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)", color: "#4cc9ff",
        }}>
          + {t("invite_member") || "Mitglied einladen"}
        </button>
      </div>

      {/* Invite form */}
      {inviteOpen && (
        <div style={{ padding: 18, borderRadius: 12, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.1)", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#4cc9ff" }}>{t("invite_new_member") || "Neues Teammitglied einladen"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", marginBottom: 4 }}>Name</div>
              <input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Max Mustermann" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", marginBottom: 4 }}>E-Mail</div>
              <input value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="max@klinik.de" type="email" style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", marginBottom: 8 }}>{t("role_label")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {Object.entries(ROLE_META).map(([key, meta]) => (
                <div key={key} onClick={() => setInvRole(key)} style={{
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                  background: invRole === key ? `${meta.color}10` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${invRole === key ? `${meta.color}30` : "rgba(255,255,255,0.05)"}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{meta.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: invRole === key ? meta.color : "rgba(232,238,252,0.95)" }}>{meta.label}</div>
                  <div style={{ fontSize: 9, color: "rgba(167,177,195,0.75)", marginTop: 2, lineHeight: 1.3 }}>{meta.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleInvite} disabled={sending} style={{
              padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(76,201,255,0.1)", border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff",
            }}>
              {sending ? (t("sending") || "Sende...") : (t("send_invitation") || "Einladung senden")}
            </button>
            <button onClick={() => setInviteOpen(false)} style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.7)",
            }}>
              {t("cancel") || "Abbrechen"}
            </button>
          </div>
        </div>
      )}

      {/* Team table */}
      {team.length > 0 && (
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr auto", gap: 8,
            padding: "8px 16px", background: "rgba(255,255,255,0.02)",
            fontSize: 10, fontWeight: 700, color: "rgba(167,177,195,0.7)", textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            <div>Name</div><div>{t("email") || "E-Mail"}</div><div>{t("role") || "Rolle"}</div><div>{t("lbl_status") || "Status"}</div><div></div>
          </div>
          {/* Rows */}
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
                {/* Name */}
                <div>
                  <div style={{ fontWeight: 600, color: "rgba(232,238,252,0.85)" }}>{member.name || "—"}</div>
                  {isCurrentUser && <span style={{ fontSize: 9, color: "#4cc9ff", fontWeight: 700 }}>{t("you_label")}</span>}
                </div>
                {/* Email */}
                <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", overflow: "hidden", textOverflow: "ellipsis" }}>{member.email}</div>
                {/* Role */}
                <div>
                  {isEditing ? (
                    <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ ...inp, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>
                      {Object.entries(ROLE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                    </select>
                  ) : (
                    <span style={{
                      padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                      background: `${meta.color}12`, color: meta.color,
                    }}>
                      {meta.icon} {meta.label}
                    </span>
                  )}
                </div>
                {/* Status */}
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: member.lastLogin ? "rgba(16,185,129,0.08)" : "rgba(167,177,195,0.06)",
                    color: member.lastLogin ? "#10b981" : "rgba(167,177,195,0.75)",
                  }}>
                    {member.lastLogin ? (t("member_active") || "Active") : (t("member_invited") || "Invited")}
                  </span>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }}>
                  {!isCurrentUser && !isEditing && (
                    <>
                      <button onClick={async () => {
                        try {
                          await inviteTeamMember({ email: member.email, name: member.name, role: member.role });
                          showT(`📧 ${member.email} — ${t("reinvite") || "Erneut eingeladen"}`);
                        } catch (e) { showT(e.message || "Fehler"); }
                      }} style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981",
                      }}>📧 {t("reinvite") || "Erneut einladen"}</button>
                      <button onClick={() => { setEditingId(member.id); setEditRole(role); }} style={{
                        padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.7)",
                      }}>{t("role_label")}</button>
                      <button onClick={() => { if (confirm(`${member.name || member.email} wirklich entfernen?`)) handleDeactivate(member.id, member.name); }} style={{
                        padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.5)",
                      }}>{t("remove") || "Entfernen"}</button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <button onClick={() => handleRoleChange(member.id, editRole)} style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", color: "#10b981",
                      }}>{t("save") || "Speichern"}</button>
                      <button onClick={() => setEditingId(null)} style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.6)",
                      }}>{t("cancel") || "Abbrechen"}</button>
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
          <div style={{ fontSize: 13, color: "rgba(167,177,195,0.75)" }}>{t("no_team_members")}</div>
        </div>
      )}

      {/* Permission matrix (collapsed by default) */}
      <PermissionMatrix />
    </Section>
  );
}

/* ─── Permission Matrix (read-only overview) ─── */
function PermissionMatrix() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const modules = [
    { key: "dashboard", label: "Dashboard" },
    { key: "action_needed", label: t("tasks_label") || "Aufgaben" },
    { key: "inbox", label: t("inbox_label") || "Posteingang" },
    { key: "patients", label: "Pipeline" },
    { key: "appointments", label: t("settings_appointments") || "Termine" },
    { key: "op_prep", label: t("op_preparation") || "OP-Vorbereitung" },
    { key: "analytics", label: t("statistics") || "Statistiken" },
    { key: "revenue", label: t("revenue") || "Umsatz" },
    { key: "automations", label: t("automations") || "Automatisierungen" },
    { key: "files", label: t("settings_files") || "Dateien" },
    { key: "archive", label: t("archive") || "Archiv" },
    { key: "setup", label: t("setup") || "Einrichtung" },
    { key: "settings", label: t("settings") || "Einstellungen" },
    { key: "billing", label: t("subscription_label") || "Abonnement" },
  ];
  const roles = ["admin", "coordinator", "doctor", "finance"];
  const roleLabels = { admin: "Admin", coordinator: t("role_coordinator") || "Koordinator", doctor: t("role_doctor") || "Arzt", finance: t("role_finance") || "Finanzen" };
  const roleColors = { admin: "#4cc9ff", coordinator: "#a78bfa", doctor: "#10b981", finance: "#f59e0b" };

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 0",
        background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
        fontSize: 12, fontWeight: 600, color: "rgba(167,177,195,0.6)",
      }}>
        <span style={{ fontSize: 10, transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0)" }}>▶</span>
        {t("show_permissions_matrix") || "Berechtigungsmatrix anzeigen"}
      </button>
      {open && (
        <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${roles.length},1fr)`, fontSize: 11 }}>
            <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)" }} />
            {roles.map(r => (
              <div key={r} style={{ padding: "8px 6px", background: "rgba(255,255,255,0.02)", textAlign: "center", fontWeight: 800, color: roleColors[r], borderLeft: "1px solid rgba(255,255,255,0.03)" }}>
                {roleLabels[r]}
              </div>
            ))}
            {modules.map(mod => (
              <div key={mod.key} style={{ display: "contents" }}>
                <div style={{ padding: "6px 12px", fontSize: 11, color: "rgba(167,177,195,0.7)", borderTop: "1px solid rgba(255,255,255,0.025)" }}>
                  {mod.label}
                </div>
                {roles.map(r => {
                  const access = MODULE_ACCESS[mod.key]?.[r];
                  return (
                    <div key={r} style={{ padding: "6px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.025)", borderLeft: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: 12, color: access ? "#10b981" : "rgba(239,68,68,0.3)" }}>{access ? "✓" : "✕"}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 12px", fontSize: 10, color: "rgba(167,177,195,0.65)", background: "rgba(255,255,255,0.01)" }}>
            {t("settings_permissions_enforced") || "Permissions are enforced in frontend and backend."}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Doctor Capabilities Overview ─── */
const DOC_COLORS = ["#4cc9ff","#10b981","#ec4899","#a78bfa","#f59e0b","#f97316","#06b6d4","#8b5cf6","#84cc16","#14b8a6","#e879f9","#fbbf24"];

function DoctorCapabilities({ clinic, showT }) {
  const { t } = useApp();
  const [doctors, setDoctors] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editTypes, setEditTypes] = useState([]);
  const [colorPickerId, setColorPickerId] = useState(null);
  const [treatments, setTreatments] = useState([]);

  const TREAT_COLORS = { FUE: "#4cc9ff", DHI: "#a78bfa", "FUE Saphir": "#06b6d4", Bart: "#f59e0b", Augenbrauen: "#ec4899", PRP: "#10b981", Mesotherapie: "#06b6d4" };

  useEffect(() => {
    import("../../api/client").then(m => {
      m.getDoctors().then(docs => setDoctors(docs || [])).catch(() => {});
      m.getTreatments().then(res => {
        const tt = res?.treatments;
        if (tt?.length) setTreatments(tt.map(t => t.name || t.label));
      }).catch(() => {});
    });
  }, []);

  const saveTypes = async (docId) => {
    try {
      const mod = await import("../../api/client");
      await mod.updateDoctorSettings({ doctorId: docId, treatments: editTypes });
      setDoctors(prev => prev.map(d => d.id === docId ? { ...d, treatment_types_allowed: editTypes } : d));
      setEditId(null);
      showT?.(t("settings_saved_doc") || "Saved");
    } catch (e) { showT?.(e.message || (t("auto_error") || "Error")); }
  };

  const toggleDocFlag = async (docId, field, value) => {
    try {
      const mod = await import("../../api/client");
      await mod.updateStaff(docId, { [field]: value });
      setDoctors(prev => prev.map(d => d.id === docId ? { ...d, [field]: value } : d));
      showT?.(t("settings_saved_doc") || "Saved");
    } catch (e) { showT?.(e.message || (t("auto_error") || "Error")); }
  };

  if (doctors.length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        {t("doctors_roles") || "Ärzte — Rollen & Behandlungstypen"}
      </div>
      <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", marginBottom: 12 }}>
        {t("doctors_roles_desc") || "Konfiguriere welche Ärzte Bewertungen durchführen, welche operieren dürfen und welche Behandlungen sie beherrschen."}
      </div>
      {doctors.map(doc => {
        const types = doc.treatment_types_allowed || [];
        const isEditing = editId === doc.id;
        const name = doc.name || `${doc.first_name || ""} ${doc.last_name || ""}`.trim();
        const reviewEnabled = doc.auto_review_enabled !== false;
        const surgeryEnabled = doc.show_in_calendar !== false;
        const maxOps = doc.max_surgeries_per_day || 5;

        return (
          <div key={doc.id} style={{
            padding: "14px 16px", borderRadius: 10, marginBottom: 8,
            background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
                <span onClick={(e) => { e.stopPropagation(); setColorPickerId(colorPickerId === doc.id ? null : doc.id); }} style={{ width: 14, height: 14, borderRadius: "50%", background: doc.color || "#4cc9ff", cursor: "pointer", border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0, transition: "transform .15s" }} title={t("change_color") || "Change color"} />
                {colorPickerId === doc.id && (
                  <div style={{ position: "absolute", top: 22, left: 0, zIndex: 20, padding: 8, borderRadius: 10, background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 4, flexWrap: "wrap", width: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                    {DOC_COLORS.filter(c => !doctors.some(d => d.id !== doc.id && d.color === c)).map(c => (
                      <span key={c} onClick={() => { toggleDocFlag(doc.id, "color", c); setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, color: c } : d)); setColorPickerId(null); }}
                        style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer", border: doc.color === c ? "2px solid #fff" : "2px solid transparent", transition: "border .15s" }} />
                    ))}
                  </div>
                )}
                <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,238,252,0.9)" }}>{name}</span>
              </div>
              {!isEditing ? (
                <button onClick={() => { setEditId(doc.id); setEditTypes([...(types.length ? types : treatments)]); }} style={{
                  padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  background: "rgba(76,201,255,0.05)", border: "1px solid rgba(76,201,255,0.1)", color: "#4cc9ff",
                }}>{t("edit_btn") || "Bearbeiten"}</button>
              ) : (
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => saveTypes(doc.id)} style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", color: "#10b981" }}>{t("save") || "Speichern"}</button>
                  <button onClick={() => setEditId(null)} style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(167,177,195,0.6)" }}>{t("cancel_btn") || "Abbrechen"}</button>
                </div>
              )}
            </div>
            {/* Role toggles */}
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {[
                { key: "auto_review_enabled", label: t("reviews_role") || "Bewertungen", desc: t("can_review") || "Kann Patienten bewerten", active: reviewEnabled, color: "#ff8a2a" },
                { key: "show_in_calendar", label: t("surgeries_role") || "Operationen", desc: t("can_operate") || "Kann operieren", active: surgeryEnabled, color: "#10b981" },
              ].map(flag => (
                <div key={flag.key} onClick={() => toggleDocFlag(doc.id, flag.key, !flag.active)} style={{
                  flex: 1, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                  background: flag.active ? `${flag.color}06` : "rgba(255,255,255,0.01)",
                  border: `1px solid ${flag.active ? `${flag.color}18` : "rgba(255,255,255,0.03)"}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: flag.active ? flag.color : "rgba(167,177,195,0.7)" }}>{flag.label}</div>
                    <div style={{ fontSize: 9, color: "rgba(167,177,195,0.65)" }}>{flag.desc}</div>
                  </div>
                  <div style={{ width: 28, height: 16, borderRadius: 8, background: flag.active ? flag.color : "rgba(255,255,255,0.08)", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: "#fff", position: "absolute", top: 2, left: flag.active ? 14 : 2, transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
              ))}
              <div style={{ flex: 0.6, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 9, color: "rgba(167,177,195,0.65)" }}>{t("max_ops_day") || "Max OPs/Tag"}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "rgba(232,238,252,0.9)" }}>{maxOps}</div>
              </div>
            </div>

            {/* Treatment tags */}
            {!isEditing ? (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {types.length > 0 ? types.map(t => (
                  <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${TREAT_COLORS[t] || "#4cc9ff"}12`, color: TREAT_COLORS[t] || "#4cc9ff", border: `1px solid ${TREAT_COLORS[t] || "#4cc9ff"}20` }}>{t}</span>
                )) : (
                  <span style={{ fontSize: 10, color: "rgba(167,177,195,0.65)", fontStyle: "italic" }}>{t("all_treatments_unrestricted")}</span>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {treatments.map(t => {
                  const active = editTypes.includes(t);
                  return (
                    <button key={t} onClick={() => setEditTypes(prev => active ? prev.filter(x => x !== t) : [...prev, t])} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      background: active ? `${TREAT_COLORS[t] || "#4cc9ff"}15` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${active ? `${TREAT_COLORS[t] || "#4cc9ff"}30` : "rgba(255,255,255,0.05)"}`,
                      color: active ? TREAT_COLORS[t] || "#4cc9ff" : "rgba(167,177,195,0.7)",
                    }}>{t}</button>
                  );
                })}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}

export default function SettingsView() {
  const { clinic, setClinics, settingsData, setSettingsData, showT, inviteOpen, setInviteOpen, inviteEmail, setInviteEmail, inviteRole, setInviteRole, setTourActive, setTourStep, setTourCompleted, t, user, setView } = useApp();
  const [drvForm, setDrvForm] = useState(false);
  const [drvName, setDrvName] = useState("");
  const [drvPhone, setDrvPhone] = useState("");
  const [drvRole, setDrvRole] = useState("primary");
  const [drvVehicle, setDrvVehicle] = useState("");
  const [drvPlate, setDrvPlate] = useState("");
  const [drvTelegram, setDrvTelegram] = useState("");

  if (typeof t !== "function") return null;
  // Always use clinic as base, merge any pending local changes on top
  const c = clinic ? {...clinic, ...(settingsData || {})} : null; if(!c)return null;
  // Sync settingsData from clinic on mount / clinic change
  useEffect(() => { if(clinic) setSettingsData({...clinic}); }, [clinic?.id]);
  const saveTimer = useRef(null);
  const pendingChanges = useRef({});
  const up=(k,v)=>{
    setSettingsData(p=>({...(p || clinic || {}), [k]:v}));
    setClinics(cs=>cs.map(cl=>cl.id===c.id?{...cl,[k]:v}:cl));
    pendingChanges.current[k]=v;
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>{
      const patch={...pendingChanges.current};
      pendingChanges.current={};
      updateClinicSettings(patch).then(()=>showT(t("saved")||"Gespeichert")).catch(e=>{console.error("[settings] save failed:",e);showT(t("save_failed_retry")||"Speichern fehlgeschlagen");});
    },1000);
  };
  const save=()=>{
    clearTimeout(saveTimer.current);
    const patch={...pendingChanges.current};
    pendingChanges.current={};
    if(!Object.keys(patch).length)return;
    updateClinicSettings(patch).then(()=>showT(t("saved")||"Gespeichert")).catch(()=>showT(t("save_failed_retry")||"Speichern fehlgeschlagen"));
  };

  const drivers=c.drivers||[];
  const lc=c.logisticsConfig||{autoNotifyDriver:false,escalationTimeoutMin:30,pickupTemplateEn:"",pickupTemplateDe:""};
  const upLogistics=(k,v)=>up("logisticsConfig",{...lc,[k]:v});
  const addDriver=()=>{
    if(!drvName.trim()||!drvPhone.trim()){showT(t("name_phone_required"));return;}
    const nd={id:`drv_${Date.now()}`,name:drvName,phone:drvPhone,role:drvRole,vehicle:drvVehicle,plateNo:drvPlate,telegramChatId:drvTelegram.trim()||"",active:true,totalPickups:0,lastPickup:null};
    up("drivers",[...drivers,nd]);
    setDrvForm(false);setDrvName("");setDrvPhone("");setDrvRole("primary");setDrvVehicle("");setDrvPlate("");setDrvTelegram("");
    showT(t("driver_added"));
  };
  const removeDriver=(id)=>{up("drivers",drivers.filter(d=>d.id!==id));showT(t("driver_removed"));};
  const [editDriverId, setEditDriverId] = useState(null);
  const startEditDriver=(d)=>{setEditDriverId(d.id);setDrvName(d.name);setDrvPhone(d.phone);setDrvRole(d.role||"primary");setDrvVehicle(d.vehicle||"");setDrvPlate(d.plateNo||"");setDrvTelegram(d.telegramChatId||"");setDrvForm(true);};
  const saveEditDriver=()=>{
    if(!drvName.trim()||!drvPhone.trim()){showT(t("name_phone_required"));return;}
    up("drivers",drivers.map(d=>d.id===editDriverId?{...d,name:drvName,phone:drvPhone,role:drvRole,vehicle:drvVehicle,plateNo:drvPlate,telegramChatId:drvTelegram.trim()||d.telegramChatId||""}:d));
    setEditDriverId(null);setDrvForm(false);setDrvName("");setDrvPhone("");setDrvRole("primary");setDrvVehicle("");setDrvPlate("");setDrvTelegram("");
    showT(t("driver_updated")||"Fahrer aktualisiert");
  };

  const inp={width:"100%",padding:"8px 12px",borderRadius:8,background:"var(--bg-card-elevated)",border:"1px solid var(--border-strong)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box"};
  const [settingsTab, setSettingsTab] = useState(() => consumePendingSettingsTab() || "general");
  const [fromSetup, setFromSetup] = useState(() => isFromSetup());
  const [highlightFlash, setHighlightFlash] = useState(false);

  // Deep-link signal from SetupCard / AdvancedSetupCard / SetupBanner.
  // When the user clicks "Arzt hinzufügen", setupNav drops a target tab
  // in sessionStorage; we read + clear it here. Plus a brief highlight
  // flash so the user notices the right section is active.
  useEffect(() => {
    const pending = consumePendingSettingsTab();
    if (pending) {
      setSettingsTab(pending);
      // Trigger a 1.5s flash on the active tab content
      setHighlightFlash(true);
      setTimeout(() => setHighlightFlash(false), 1500);
      // Pop pending highlight anchor (just consume so it doesn't carry over)
      consumeHighlightAnchor();
    }
    // Sync fromSetup state
    setFromSetup(isFromSetup());
  }, []);

  const SETTINGS_TABS = [
    "grp:" + (t("grp_clinic") || "KLINIK"),
    { id: "general", label: t("settings_general") || "Allgemein", icon: "👤" },
    { id: "team", label: t("settings_team") || "Team & Zugriff", icon: "👥" },
    "grp:" + (t("grp_operations") || "BETRIEB"),
    { id: "clinic_treatments", label: t("sg_treatments") || "Behandlungsarten", icon: "💉" },
    { id: "doctors", label: t("doctor_assignment") || "Arzt-Zuweisung", icon: "⚕️" },
    { id: "booking_rules", label: t("booking_rules") || "Buchungsregeln", icon: "📋" },
    { id: "payments", label: t("settings_payments") || "Zahlungen & Umsatz", icon: "💰" },
    { id: "drivers", label: t("drivers") || "Fahrer", icon: "🚗" },
    "grp:" + (t("grp_ai_automation") || "KI & AUTOMATISIERUNG"),
    { id: "ai", label: t("ai_bot") || "KI-Bot", icon: "🤖" },
    { id: "automations", label: t("automations") || "Automatisierungen", icon: "⚡" },
    "grp:" + (t("grp_account") || "ACCOUNT"),
    { id: "subscription", label: t("subscription") || "Abonnement", icon: "💎" },
    { id: "account", label: t("account") || "Mein Account", icon: "🔐" },
    "grp:" + (t("grp_system") || "SYSTEM"),
    { id: "integrations", label: t("integrations") || "Integrationen", icon: "🔗" },
    { id: "analytics", label: t("analytics") || "Statistiken", icon: "📈" },
    { id: "audit_log", label: t("audit_log") || "Audit-Log", icon: "📋" },
  ];

  return <div style={{display:"flex",minHeight:"calc(100vh - 120px)"}}>
    {/* ── Settings Sidebar ── */}
    <div style={{width:200,minWidth:200,borderRight:"1px solid rgba(255,255,255,0.04)",padding:"20px 0",flexShrink:0,position:"sticky",top:0,alignSelf:"flex-start",maxHeight:"calc(100vh - 120px)",overflowY:"auto"}}>
      <div style={{padding:"0 16px 16px"}}>
        <div style={{fontSize:18,fontWeight:800,color:"rgba(232,238,252,0.95)",letterSpacing:"-0.02em"}}>{t("settings_title") || "Einstellungen"}</div>
        <div style={{fontSize:11,color:"rgba(167,177,195,0.75)",marginTop:2}}>{c.name}</div>
      </div>
      {SETTINGS_TABS.map((tab, idx) => {
        if (typeof tab === "string" && tab.startsWith("grp:")) return <div key={`grp-${idx}`} style={{ fontSize: 9, fontWeight: 800, color: "rgba(167,177,195,0.65)", padding: "14px 16px 4px", letterSpacing: "0.08em" }}>{tab.replace("grp:","")}</div>;
        const isActive = settingsTab === tab.id;
        return <div key={tab.id} onClick={() => { setSettingsTab(tab.id); window.dispatchEvent(new Event("fm:scroll-top")); }} style={{
          display:"flex",alignItems:"center",gap:8,padding:"8px 16px",cursor:"pointer",
          background:isActive?"rgba(76,201,255,0.06)":"transparent",
          borderLeft:isActive?"3px solid #4cc9ff":"3px solid transparent",
          color:isActive?"#fff":"rgba(167,177,195,0.7)",
          fontWeight:isActive?700:500,fontSize:13,transition:"all .15s",
        }}>
          <span style={{fontSize:13,opacity:isActive?1:0.6}}>{tab.icon}</span>
          <span>{tab.label}</span>
        </div>;
      })}
    </div>

    {/* ── Settings Content ── */}
    <div style={{flex:1,padding:"20px 32px",overflowY:"auto",position:"relative"}}>

    {/* Highlight flash for the active tab when arriving from a deep link */}
    {highlightFlash && (
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: "linear-gradient(90deg, transparent, rgba(76,201,255,0.6), transparent)",
        animation: "fmTabFlashTop 1.5s ease-out",
        pointerEvents: "none",
      }}>
        <style>{`@keyframes fmTabFlashTop { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }`}</style>
      </div>
    )}

    {/* ═══ GENERAL ═══ */}
    {settingsTab === "general" && <>
    <div style={{fontSize:16,fontWeight:800,marginBottom:16,color:"rgba(232,238,252,0.9)"}}>{t("general_label") || "Allgemein"}</div>
    <HintBox id="settings_general">{t("hint_settings_general")}</HintBox>
    <Field label={t("clinic_name") || "Klinikname"} value={c.name || ""} onChange={v=>up("name",v)}/>
    <Field label={t("address") || "Adresse"} value={c.address || ""} onChange={v=>up("address",v)}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
      <Field label={t("postal_code") || "Postleitzahl"} value={c.postalCode || ""} onChange={v=>up("postalCode",v)}/>
      <Field label={t("city") || "Stadt"} value={c.city || ""} onChange={v=>up("city",v)}/>
    </div>
    <Field label={t("country") || "Land"} value={c.country ?? ""} onChange={v=>up("country",v)} placeholder="z.B. Deutschland, Turkey, UAE"/>
    <Field label={t("phone") || "Telefon"} value={c.phone || ""} onChange={v=>up("phone",v)}/>
    <Field label={t("email") || "E-Mail"} value={c.clinicEmail || ""} onChange={v=>up("clinicEmail",v)}/>
    <Field label={t("timezone") || "Zeitzone"} value={c.timezone || "Europe/Berlin"} onChange={v=>up("timezone",v)} options={["Europe/Berlin","Europe/Istanbul","Europe/London","Europe/Paris","Europe/Rome","Europe/Madrid","Europe/Lisbon","Europe/Amsterdam","Europe/Vienna","Europe/Zurich","America/New_York","America/Los_Angeles","Asia/Dubai","Asia/Tokyo"]}/>
    <Field label={t("google_maps_link")} value={c.googleMapsLink || ""} onChange={v=>up("googleMapsLink",v)} placeholder="https://maps.google.com/..." hint={t("google_maps_hint")}/>
    <Field label={t("privacy_url_label") || "Datenschutz-URL deiner Klinik"} value={c.privacyUrl || ""} onChange={v=>up("privacyUrl",v)} placeholder="https://deine-klinik.de/datenschutz" hint={t("privacy_url_hint") || "Wird im KI-Disclaimer beim ersten Patientenkontakt verlinkt. Leer lassen wenn du keine eigene Datenschutzseite hast."}/>
    </>}


    {/* ═══ TREATMENTS ═══ */}
    {settingsTab === "clinic_treatments" && <>
    <HintBox id="settings_treatments">{t("hint_settings_treatments")}</HintBox>
    <TreatmentTypes />
    </>}

    {/* ═══ PAYMENT SETTINGS ═══ */}
    {settingsTab === "payments" && <>
<Section title={t("settings_payment_title") || "Payment Settings"}>
      {/* Deposit Policy */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:8}}>{t("settings_deposit") || "Anzahlung"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          {[{v:"none",l:t("settings_no_deposit_short")||"None",d:t("settings_no_deposit")||"No deposit"},{v:"fixed",l:t("settings_fixed_amount")||"Fixed amount",d:t("pay_fixed_example")||"e.g. €500"},{v:"percentage",l:t("settings_percentage")||"Percentage",d:t("pay_percent_example")||"e.g. 30%"}].map(opt=>(
            <div key={opt.v} onClick={()=>{up("depositPolicy",opt.v);if(opt.v==="fixed"&&!c.depositAmount)up("depositAmount","500");if(opt.v==="percentage"&&!c.depositPercent)up("depositPercent","25");}} style={{padding:"12px 14px",borderRadius:10,cursor:"pointer",textAlign:"center",
              background:(c.depositPolicy||"none")===opt.v?"rgba(76,201,255,0.06)":"rgba(255,255,255,0.02)",
              border:`1px solid ${(c.depositPolicy||"none")===opt.v?"rgba(76,201,255,0.2)":"rgba(255,255,255,0.06)"}`,
            }}>
              <div style={{fontWeight:700,fontSize:13,color:(c.depositPolicy||"none")===opt.v?"#4cc9ff":"rgba(232,238,252,0.95)"}}>{opt.l}</div>
              <div style={{fontSize:10,color:"rgba(167,177,195,0.75)",marginTop:2}}>{opt.d}</div>
            </div>
          ))}
        </div>
        {c.depositPolicy === "fixed" && <Field label={t("deposit_amount_label")} value={c.depositAmount ?? ""} onChange={v=>up("depositAmount",v)} placeholder="500"/>}
        {c.depositPolicy === "percentage" && <Field label={t("settings_deposit_percent") || "Anzahlung (%)"} value={c.depositPercent || "30"} onChange={v=>up("depositPercent",v)} options={["10","20","25","30","40","50"]}/>}
      </div>

      {/* Deposit hint */}
      {(c.depositPolicy||"none")!=="none" && <div style={{padding:"10px 14px",borderRadius:8,background:"rgba(76,201,255,0.06)",border:"1px solid rgba(76,201,255,0.12)",marginBottom:16}}>
        <span style={{fontSize:11,color:"rgba(76,201,255,0.7)"}}>ℹ {t("deposit_before_booking_hint") || "The deposit is required before the appointment can be booked. The patient will be asked to pay before a date is confirmed."}</span>
      </div>}

      {/* Payment Methods */}
      <div style={{marginTop:8,opacity:(c.depositPolicy||"none")==="none"?0.4:1,pointerEvents:(c.depositPolicy||"none")==="none"?"none":"auto"}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:8}}>{t("payment_methods_label") || "Zahlungsmethoden"}</div>
        <div style={{display:"grid",gap:8}}>
          {[
            {key:"payStripe",label:"Stripe",desc:t("pay_stripe_desc")||"Online card payment"},
            {key:"payCustomLink",label:t("pay_custom_link_label")||"Custom payment link",desc:t("pay_custom_link_desc") || "Individual payment link"},
            {key:"payBankTransfer",label:t("bank_transfer_label")||"Bank Transfer",desc:t("bank_transfer_desc")||"IBAN/SEPA Transfer"},
            {key:"payOnArrival",label:t("pay_on_site_label")||"Payment on site",desc:t("pay_on_site_desc") || "Cash or card at the clinic"},
          ].map(pm=>(
            <div key={pm.key}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border-subtle)"}}>
                <div><div style={{fontWeight:600,fontSize:13}}>{pm.label}</div><div style={{fontSize:11,color:"var(--text-faint)",marginTop:1}}>{pm.desc}</div></div>
                <Toggle value={!!c[pm.key]} onChange={v=>up(pm.key,v)}/>
              </div>
              {/* Custom payment link URL input */}
              {pm.key === "payCustomLink" && c.payCustomLink !== false && (
                <div style={{padding:"8px 0 4px"}}>
                  <Field label={t("payment_link_url")} value={c.customPaymentLink || ""} onChange={v=>up("customPaymentLink",v)} placeholder="https://pay.example.com/..." />
                  <Field label={t("payment_button_text")} value={c.customPaymentLabel || ""} onChange={v=>up("customPaymentLabel",v)} placeholder={t("pay_now")} />
                </div>
              )}
              {/* Stripe API key hint */}
              {pm.key === "payStripe" && c.payStripe !== false && (
                <div style={{padding:"4px 0 8px",fontSize:10,color:"rgba(167,177,195,0.65)"}}>
                  {t("stripe_config_hint") || "Stripe wird über Integrationen → Stripe konfiguriert"}
                </div>
              )}
              {/* Bank transfer details */}
              {pm.key === "payBankTransfer" && c.payBankTransfer !== false && (
                <div style={{padding:"8px 0 4px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
                  <Field label={t("pdf_bank")} value={c.bankName || ""} onChange={v=>up("bankName",v)} placeholder="Deutsche Bank" />
                  <Field label="IBAN" value={c.iban || ""} onChange={v=>up("iban",v)} placeholder="DE89 3704 0044 0532 0130 00" />
                </div>
              )}
            </div>
          ))}
        </div>
        {(c.depositPolicy||"none")!=="none" && (
          <div style={{padding:"10px 14px",borderRadius:10,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.1)",color:"rgba(167,177,195,0.7)",fontSize:11,lineHeight:1.6,display:"flex",alignItems:"flex-start",gap:8,marginTop:12}}>{"ℹ️"} {c.payStripe ? (t("payment_stripe_hint") || "Stripe ist aktiv — Anzahlungen werden automatisch erkannt. Der Patient erhaelt einen Zahlungslink per WhatsApp und das System bestaetigt die Zahlung automatisch.") : (t("payment_no_method_hint") || "Keine Zahlungsmethode aktiv. Zahlungen muessen in der Patientenkarte manuell als bezahlt markiert werden. Mit Stripe werden Zahlungen automatisch erkannt.")}</div>
        )}
      </div>
    </Section>

    {/* Deposit Tracking */}
    <div style={{marginTop:24}}>
      <Suspense fallback={<div style={{padding:40,textAlign:"center",color:"rgba(167,177,195,0.6)"}}>...</div>}>
        <PaymentsView />
      </Suspense>
    </div>

    </>}

    {/* ═══ BOOKING RULES ═══ */}
    {settingsTab === "booking_rules" && <>
    <Section title={t("booking_rules") || "Buchungsregeln"}>
      <div style={{display:"grid",gap:16}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{t("settings_min_lead_days") || "Minimum lead time (days)"}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="number" min={0} max={30} value={c.minNoticeDays ?? 5} onChange={e => up("minNoticeDays", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))} style={{width:80,padding:"10px 14px",borderRadius:10,background:"var(--bg-input)",border:"1px solid var(--border-input)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none",textAlign:"center"}} />
            <span style={{fontSize:13,color:"rgba(167,177,195,0.7)"}}>{t("settings_days_unit") || "days"}</span>
          </div>
          <div style={{fontSize:11,color:"rgba(167,177,195,0.75)",marginTop:6,lineHeight:1.5}}>
            {t("settings_min_lead_desc") || "Determines how many days must be between today and the earliest bookable appointment. Default: 5 days."}
          </div>
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{t("settings_checkin_offset_label") || "Patienten-Ankunft vor OP (Minuten)"}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="number" min={0} max={180} value={c.checkinOffsetMinutes ?? 60} onChange={e => up("checkinOffsetMinutes", Math.max(0, Math.min(180, parseInt(e.target.value) || 0)))} style={{width:80,padding:"10px 14px",borderRadius:10,background:"var(--bg-input)",border:"1px solid var(--border-input)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none",textAlign:"center"}} />
            <span style={{fontSize:13,color:"rgba(167,177,195,0.7)"}}>min</span>
          </div>
          <div style={{fontSize:11,color:"rgba(167,177,195,0.75)",marginTop:6,lineHeight:1.5}}>
            {t("settings_checkin_offset_desc") || "Wie viele Minuten vor der OP soll der Patient in der Klinik sein? Diese Zeit wird für Vorgespräch, Haarlinie und Vorbereitung benötigt. Der Patient erhält automatisch die berechnete Ankunftszeit per WhatsApp."}
          </div>
          <div style={{marginTop:8,padding:"10px 14px",borderRadius:8,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.08)",fontSize:11,color:"rgba(76,201,255,0.7)",lineHeight:1.5}}>
            {"💡"} {t("settings_checkin_offset_hint") || "Beispiel: Ihr Arzt beginnt um 09:00 Uhr und Sie stellen 60 Minuten ein → Der Patient wird automatisch für 08:00 Uhr einbestellt. Die OP-Startzeit wird intern aus den Arbeitszeiten Ihrer Ärzte berechnet."}
          </div>
        </div>
      </div>
    </Section>
    </>}

    {/* ═══ DOCTOR ASSIGNMENT ═══ */}
    {settingsTab === "doctors" && <>
    <HintBox id="settings_doctor_assign">{t("hint_settings_doctor_assign")}</HintBox>
    <Section title={t("doctor_assignment") || "Arzt-Zuweisung"}>
      {/* Automatic assignment info */}
      <div style={{padding:"14px 16px",borderRadius:12,background:"rgba(76,201,255,0.04)",border:"1px solid rgba(76,201,255,0.1)",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>🤖</span>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"#4cc9ff"}}>{t("auto_assign_active") || "Automatische Zuweisung aktiv"}</div>
          <div style={{fontSize:11,color:"rgba(167,177,195,0.6)"}}>{t("auto_assign_desc")}</div>
        </div>
      </div>

      {/* Algorithm selection (only for automatic) */}
      {(c.doctorAssignment || "automatic") === "automatic" && <>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{t("algorithm_label") || "Algorithmus"}</div>
          <select value={c.assignAlgorithm || "earliest"} onChange={e=>up("assignAlgorithm",e.target.value)} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--bg-input)",border:"1px solid var(--border-input)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",cursor:"pointer"}}>
            <option value="earliest">{t("earliest_available")}</option>
            <option value="least_booked">{t("least_busy")}</option>
            <option value="random">{t("even_distribution")}</option>
          </select>
        </div>

        {/* Explanation box */}
        <div style={{padding:"12px 14px",borderRadius:10,background:"rgba(76,201,255,0.03)",border:"1px solid rgba(76,201,255,0.08)",fontSize:12,color:"rgba(167,177,195,0.65)",lineHeight:1.6}}>
          <div style={{fontWeight:700,color:"rgba(76,201,255,0.6)",marginBottom:4}}>{t("how_it_works") || "How it works:"}</div>
          {t("assign_how_desc")}
          <br/><br/>
          <strong style={{color:"rgba(232,238,252,0.95)"}}>{c.assignAlgorithm === "least_booked" ? t("least_busy") : c.assignAlgorithm === "random" ? t("even_distribution") : t("earliest_available")}:</strong>
          {" "}
          {c.assignAlgorithm === "least_booked" ? t("algo_desc_least_booked") :
           c.assignAlgorithm === "random" ? t("algo_desc_random") :
           t("algo_desc_earliest")}
        </div>
      </>}

      {/* Doctor capabilities overview */}
      <DoctorCapabilities clinic={clinic} showT={showT} />
    </Section>

    </>}

    {/* ═══ AI BOT SETTINGS ═══ */}
    {settingsTab === "ai" && <>
    <HintBox id="settings_ai">{t("hint_settings_ai")}</HintBox>
    {/* WhatsApp cost info removed — Flowmatix covers messaging costs */}

    {/* Status row — adopted from AIControlView so the user sees what's
        already working out of the box. Visual only, not toggles.
        Inline language map because the i18n keys for these strings
        don't exist in i18n.js (and t() returns the raw key when
        missing, defeating the `|| fallback` pattern). */}
    {(() => {
      const lang = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
      const TR = (de, en, tr) => ({ de, en, tr }[lang] || de);
      const cards = [
        {
          icon: "📩",
          label: TR("Eingehende Nachrichten", "Incoming messages", "Gelen mesajlar"),
          desc:  TR("Werden automatisch beantwortet", "Replied to automatically", "Otomatik olarak yanıtlanır"),
        },
        {
          icon: "🎙",
          label: TR("Sprachnachrichten", "Voice messages", "Sesli mesajlar"),
          desc:  TR("Automatische Transkription", "Automatic transcription", "Otomatik transkripsiyon"),
        },
        {
          icon: "🌙",
          label: TR("24/7 Auto-Responder", "24/7 auto-responder", "7/24 otomatik yanıt"),
          desc:  TR("Auch außerhalb der Öffnungszeiten", "Even outside opening hours", "Açılış saatleri dışında bile"),
        },
      ];
      const activeLabel = TR("Aktiv", "Active", "Aktif");
      return (
        <div id="fm-section-ai" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          {cards.map((w, i) => (
            <div key={i} style={{padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{fontSize:14}}>{w.icon}</span>
                <span style={{fontWeight:700,fontSize:13,color:"rgba(232,238,252,0.9)"}}>{w.label}</span>
              </div>
              <div style={{fontSize:11,color:"rgba(167,177,195,0.6)",marginBottom:6}}>{w.desc}</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:6,height:6,borderRadius:99,background:"#10b981",animation:"fmPulseGreen 2s infinite"}}/>
                <span style={{fontSize:11,fontWeight:600,color:"#10b981"}}>{activeLabel}</span>
              </div>
            </div>
          ))}
        </div>
      );
    })()}

    {/* AI model — read-only display of the model the bot uses */}
    {(() => {
      const lang = (localStorage.getItem("fm_lang") || "de").substring(0, 2);
      const TR = (de, en, tr) => ({ de, en, tr }[lang] || de);
      return (
        <div style={{padding:"14px 18px",borderRadius:12,background:"rgba(76,201,255,0.03)",border:"1px solid rgba(76,201,255,0.1)",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(167,177,195,0.65)",letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:4}}>
              {TR("KI-Modell", "AI model", "AI modeli")}
            </div>
            <div style={{fontSize:14,fontWeight:800,color:"rgba(232,238,252,0.95)"}}>Claude Sonnet 4.5</div>
            <div style={{fontSize:11,color:"rgba(167,177,195,0.55)",marginTop:2}}>
              {TR(
                "Anthropics neuestes Modell — schnell, präzise, mehrsprachig.",
                "Anthropic's latest model — fast, precise, multilingual.",
                "Anthropic'in en yeni modeli — hızlı, hassas, çok dilli."
              )}
            </div>
          </div>
          <span style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:800,background:"rgba(168,85,247,0.12)",color:"#c084fc",border:"1px solid rgba(168,85,247,0.25)",letterSpacing:0.5}}>
            {TR("VON FLOWMATIX VERWALTET", "MANAGED BY FLOWMATIX", "FLOWMATIX TARAFINDAN YÖNETİLİYOR")}
          </span>
        </div>
      );
    })()}

    <Section title={t("ai_bot_settings") || "KI-Bot Einstellungen"}>
      <div style={{display:"grid",gap:12}}>
        <div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",marginBottom:6}}>{t("response_delay_seconds") || "Antwortverzögerung (Sekunden)"}</div><select value={c.botResponseDelay || "3"} onChange={e=>up("botResponseDelay",e.target.value)} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--bg-input)",border:"1px solid var(--border-input)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box",cursor:"pointer"}}><option value="0">{t("sec_0")||"0 Sekunden"}</option><option value="1">{t("sec_1")||"1 Sekunde"}</option><option value="2">{t("sec_2")||"2 Sekunden"}</option><option value="3">{t("sec_3")||"3 Sekunden"}</option><option value="5">{t("sec_5")||"5 Sekunden"}</option><option value="10">{t("sec_10")||"10 Sekunden"}</option></select></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--border-subtle)"}}>
          <div><div style={{fontWeight:600,fontSize:13}}>{t("fallback_to_staff") || "Fallback an Mitarbeiter"}</div><div style={{fontSize:11,color:"var(--text-faint)",marginTop:2}}>{t("fallback_to_staff_desc") || "Bei unklaren Anfragen automatisch an einen Mitarbeiter übergeben"}</div></div>
          <Toggle value={c.botFallbackHuman!==false} onChange={v=>up("botFallbackHuman",v)}/>
        </div>
        <div style={{padding:"10px 0",borderBottom:"1px solid var(--border-subtle)"}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{t("required_photos_count") || "Anzahl benötigter Fotos"}</div>
          <div style={{fontSize:11,color:"var(--text-faint)",marginBottom:8}}>{t("required_photos_desc") || "Wie viele Fotos der Bot vom Patienten anfordert"}</div>
          <input type="number" min="1" max="10" value={c.requiredPhotos||3} onChange={e=>up("requiredPhotos",parseInt(e.target.value)||3)} style={{width:80,padding:"8px 12px",borderRadius:10,background:"var(--bg-input)",border:"1px solid var(--border-input)",color:"var(--text-primary)",fontFamily:"inherit",fontSize:14,outline:"none"}}/>
        </div>
        <div style={{padding:"10px 0"}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{t("required_photo_types") || "Welche Fotos benötigt?"}</div>
          <div style={{fontSize:11,color:"var(--text-faint)",marginBottom:8}}>{t("required_photo_types_desc") || "Bot fordert genau diese Foto-Winkel an"}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[{id:"front",label:t("photo_front")||"Front view"},{id:"top",label:t("photo_top")||"Top view"},{id:"left",label:t("photo_left_side")||"Left side"},{id:"right",label:t("photo_right_side")||"Right side"},{id:"donor",label:t("photo_donor_area")||"Donor area"},{id:"close_up",label:t("photo_close_up")||"Close-up"},{id:"hairline",label:t("photo_hairline")||"Hairline"}].map(pt=>{
              const types=c.requiredPhotoTypes||["front","top","donor"];
              const active=types.includes(pt.id);
              return<button key={pt.id} onClick={()=>up("requiredPhotoTypes",active?types.filter(x=>x!==pt.id):[...types,pt.id])} style={{padding:"6px 14px",borderRadius:10,background:active?"rgba(76,201,255,0.1)":"var(--bg-card)",border:`1px solid ${active?"rgba(76,201,255,0.25)":"var(--border-strong)"}`,color:active?"#4cc9ff":"var(--text-muted)",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{active?"✓ ":""}{pt.label}</button>;
            })}
          </div>
        </div>
      </div>
    </Section>

    {/* Bot Profile */}
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        {t("bot_profile") || "Bot-Profil & Persönlichkeit"}
      </div>
      <BotProfile clinic={clinic} updateClinic={(patch) => { Object.entries(patch).forEach(([k,v]) => up(k,v)); }} showT={showT} t={t} />
    </div>

    {/* Knowledge Base / FAQ */}
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(167,177,195,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        {t("knowledge_base") || "Wissensdatenbank (FAQ)"}
      </div>
      <FAQKnowledgeBase />
    </div>

    </>}



    {/* ═══ INTEGRATIONS ═══ */}
    {settingsTab === "integrations" && <>
    <IntegrationsSection t={t} clinic={clinic} showT={showT} />
    </>}

    {/* ═══ TEAM & ZUGRIFF ═══ */}
    {settingsTab === "team" && <>
    <HintBox id="settings_team">{t("hint_settings_team")}</HintBox>
    <TeamAccessSection clinic={clinic} showT={showT} t={t} setClinics={setClinics} />
    </>}



    {/* ═══ AUTOMATIONS ═══ */}
    {settingsTab === "automations" && <Suspense fallback={<div style={{padding:40,textAlign:"center",color:"rgba(167,177,195,0.6)"}}>...</div>}><AutomationsView /></Suspense>}

    {/* ═══ ANALYTICS & REVENUE ═══ */}
    {settingsTab === "analytics" && <Suspense fallback={<div style={{padding:40,textAlign:"center",color:"rgba(167,177,195,0.6)"}}>...</div>}>
      <AnalyticsView />
    </Suspense>}

    {/* ═══ SUBSCRIPTION ═══ */}
    {settingsTab === "subscription" && <Suspense fallback={<div style={{padding:40,textAlign:"center",color:"rgba(167,177,195,0.6)"}}>...</div>}><SubscriptionView /></Suspense>}

    {/* ═══ DRIVERS ═══ */}
    {settingsTab === "drivers" && <>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:16,fontWeight:800,color:"rgba(232,238,252,0.95)"}}>{t("driver_mgmt_title")}</div>
      <div style={{fontSize:12,color:"rgba(167,177,195,0.6)",marginTop:4}}>{t("driver_mgmt_desc")}</div>
    </div>

    {/* Existing drivers list */}
    {drivers.length > 0 && <div style={{marginBottom:20}}>
      {drivers.map(d=>(
        <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",marginBottom:8,borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>{d.name} <span style={{fontSize:11,color:"rgba(167,177,195,0.6)",marginLeft:4}}>{d.role==="primary"?t("primary_role"):"Backup"}</span></div>
            <div style={{fontSize:11,color:"rgba(167,177,195,0.6)",marginTop:3}}>{d.phone}{d.telegramChatId?" · ✅ Telegram":"" }{d.vehicle?` · ${d.vehicle}`:""}{d.plateNo?` · ${d.plateNo}`:""}</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>startEditDriver(d)} style={{padding:"5px 12px",borderRadius:8,background:"rgba(76,201,255,0.06)",border:"1px solid rgba(76,201,255,0.12)",color:"#4cc9ff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("edit")||"Bearbeiten"}</button>
            <button onClick={()=>removeDriver(d.id)} style={{padding:"5px 12px",borderRadius:8,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.12)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("remove")}</button>
          </div>
        </div>
      ))}
      <div style={{marginTop:8,padding:"12px 16px",borderRadius:10,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",fontSize:12,color:"#ef4444",lineHeight:1.6,fontWeight:600,animation:"fmPulseRed 2s infinite"}}>
        ⚠️ {(t("driver_telegram_hint")||"").split(/(@FlowmatixBot|\/start)/g).map((part,i) => /^(@FlowmatixBot|\/start)$/.test(part) ? <span key={i} style={{color:"#fff",background:"rgba(255,255,255,0.12)",padding:"1px 6px",borderRadius:4,fontFamily:"monospace"}}>{part}</span> : part)}
        <style>{`@keyframes fmPulseRed{0%,100%{opacity:1}50%{opacity:0.7}}`}</style>
      </div>
    </div>}

    {/* Create driver card */}
    {drvForm ? (
      <div style={{borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:700,fontSize:14,color:"rgba(232,238,252,0.9)"}}>{t("add_new_driver")}</div>
          <button onClick={()=>{setDrvForm(false);setEditDriverId(null);setDrvName("");setDrvPhone("");setDrvVehicle("");setDrvPlate("");setDrvTelegram("");setDrvRole("primary");}} style={{padding:"4px 12px",borderRadius:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(167,177,195,0.7)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t("cancel")}</button>
        </div>
        <div style={{padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 16px"}}>
            <div><div style={{fontSize:11,fontWeight:600,color:"rgba(167,177,195,0.7)",marginBottom:4}}>Name *</div><input value={drvName} onChange={e=>setDrvName(e.target.value)} placeholder="Max Mustermann" style={inp}/></div>
            <div><div style={{fontSize:11,fontWeight:600,color:"rgba(167,177,195,0.7)",marginBottom:4}}>{t("phone")} *</div><input value={drvPhone} onChange={e=>setDrvPhone(e.target.value)} placeholder="+49 170 1234567" style={inp}/></div>
            <div><div style={{fontSize:11,fontWeight:600,color:"rgba(167,177,195,0.7)",marginBottom:4}}>{t("vehicle")}</div><input value={drvVehicle} onChange={e=>setDrvVehicle(e.target.value)} placeholder="Mercedes V-Klasse" style={inp}/></div>
            <div><div style={{fontSize:11,fontWeight:600,color:"rgba(167,177,195,0.7)",marginBottom:4}}>{t("license_plate")}</div><input value={drvPlate} onChange={e=>setDrvPlate(e.target.value)} placeholder="B-FM 1234" style={inp}/></div>
            <div><div style={{fontSize:11,fontWeight:600,color:"rgba(167,177,195,0.7)",marginBottom:4}}>{t("role")}</div><select value={drvRole} onChange={e=>setDrvRole(e.target.value)} style={inp}><option value="primary">{t("primary_role")}</option><option value="backup">Backup</option></select></div>
          </div>
          <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}>
            <button onClick={editDriverId?saveEditDriver:addDriver} style={{padding:"8px 24px",borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 12px rgba(16,185,129,0.3)"}}>{editDriverId?(t("save_changes")||"Änderungen speichern"):t("save")}</button>
          </div>
        </div>
      </div>
    ) : (
      <button onClick={()=>setDrvForm(true)} style={{padding:"10px 20px",borderRadius:10,background:"rgba(76,201,255,0.06)",border:"1px solid rgba(76,201,255,0.15)",color:"#4cc9ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{t("add_driver_btn")}</button>
    )}
    </>}

    {/* ═══ ACCOUNT / PASSWORD ═══ */}
    {settingsTab === "account" && <>
    <AccountSection t={t} showT={showT} user={user} />

    {/* ── 2FA Enforcement (admin only) ── */}
    {(user?.role === 'clinic_admin' || user?.role === 'platform_owner' || user?.apiRole === 'clinic_admin') && <div style={{marginTop:32,padding:20,background:"rgba(255,140,66,0.04)",border:"1px solid rgba(255,140,66,0.18)",borderRadius:14}}>
      <div style={{fontSize:14,fontWeight:800,color:"rgba(232,238,252,0.95)",marginBottom:6}}>🔐 {t("mfa_enforce_title") || "Zwei-Faktor-Authentifizierung erzwingen"}</div>
      <div style={{fontSize:12,color:"rgba(167,177,195,0.7)",lineHeight:1.6,marginBottom:14}}>{t("mfa_enforce_desc") || "Bestimme welche Rollen beim Login zwingend 2FA einrichten müssen."}</div>
      {[
        {role:"clinic_admin", label: t("role_admin") || "Admin"},
        {role:"clinic_doctor", label: t("role_doctor") || "Arzt"},
        {role:"clinic_coordinator", label: t("role_coordinator") || "Koordinator"},
        {role:"clinic_finance", label: t("role_finance") || "Finanzen"},
      ].map(r => {
        const required = (c.mfaRequiredRoles || []).includes(r.role);
        return (
          <label key={r.role} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:"pointer"}}>
            <input type="checkbox" checked={required} onChange={(e)=>{
              const cur = c.mfaRequiredRoles || [];
              const next = e.target.checked ? [...cur, r.role] : cur.filter(x => x !== r.role);
              up("mfaRequiredRoles", next);
            }} style={{accentColor:"#FF8C42"}} />
            <span style={{color:"rgba(232,238,252,0.85)",fontSize:14}}>{r.label}</span>
            {required && <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:99,background:"rgba(255,140,66,0.15)",border:"1px solid rgba(255,140,66,0.3)",color:"#FF8C42",letterSpacing:0.5}}>{t("mfa_required") || "PFLICHT"}</span>}
          </label>
        );
      })}
      <div style={{marginTop:14,padding:"10px 12px",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(255,107,107,0.18)",borderRadius:8,fontSize:11.5,color:"rgba(255,170,170,0.85)",lineHeight:1.5}}>⚠️ {t("mfa_warning") || "Achtung: Aktiviere diese Option NUR wenn du selbst bereits 2FA eingerichtet hast (oben unter 2FA aktivieren). Sonst sperrst du dich selbst aus."}</div>
    </div>}
    </>}

    {/* ═══ AUDIT LOG ═══ */}
    {settingsTab === "audit_log" && <Suspense fallback={<div style={{padding:40,textAlign:"center",color:"rgba(167,177,195,0.6)"}}>...</div>}><AuditLogView /></Suspense>}

    {/* Save button removed — all settings auto-save on change */}
    </div>
  </div>;
}
