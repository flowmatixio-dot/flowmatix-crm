import { useApp } from "../../context/AppContext";

/**
 * WhatsApp Setup Page — 360dialog Partner Flow
 * Reconstructed exactly from production v368 (function Ap)
 * 9 states: not_connected, connecting, awaiting_otp, active,
 *           migration_required, verification_pending, verification_requires_action,
 *           verification_rejected, failed
 */
export default function WhatsAppSetupPage() {
  const { clinic, activeClinicId, setClinics, showT, t, lang, workspaceState, demoMode } = useApp();
  const l = lang || localStorage.getItem("fm_lang") || "de";
  const n = clinic;

  /* ── Onboarding state ── */
  const ob = n?.whatsapp_onboarding || {};
  const st = ob.state || "not_connected";
  const cs = n?.connection_status;
  const S = (cs === "connected" && st === "not_connected") ? "active" : st;

  /* ── Tri-language translations ── */
  const TX = {
    de: {
      title: "WhatsApp verbinden",
      desc: "Verbinde deine Klinik-Nummer f\u00fcr automatische Patientenkommunikation.",
      btn: "Jetzt verbinden",
      connecting: "Verbinde Nummer\u2026",
      requested_title: "WhatsApp wird eingerichtet",
      requested_desc: "Du bekommst in den n\u00e4chsten 1\u20132 Stunden einen SMS-Code auf deine Nummer.\nBitte gib ihn dann hier ein.",
      phone_label: "Telefonnummer",
      phone_hint: "z.B. +49 170 1234567",
      micro: "In den meisten F\u00e4llen ist deine Nummer in wenigen Minuten aktiv. Falls eine zus\u00e4tzliche Best\u00e4tigung erforderlich ist, wirst du automatisch durch die n\u00e4chsten Schritte gef\u00fchrt.",
      active_title: "WhatsApp ist jetzt aktiv",
      active_desc: "Deine Nummer ist erfolgreich verbunden.",
      quality: "Qualit\u00e4t",
      status: "Status",
      active: "Aktiv",
      disconnect: "Trennen",
      otp_title: "Best\u00e4tigung erforderlich",
      otp_desc: "Bitte best\u00e4tige deine Nummer mit dem SMS-Code.",
      otp_hint: "6-stelliger Code",
      verify_btn: "Best\u00e4tigen",
      verifying: "Wird gepr\u00fcft\u2026",
      migration_title: "Bestehende Nummer erkannt",
      migration_desc: "Diese Nummer wird bereits mit der WhatsApp App verwendet. Um sie mit Flowmatix zu verbinden, muss sie von der App getrennt werden.",
      migration_step1: "1. Oeffne WhatsApp auf deinem Handy",
      migration_step2: "2. Gehe zu Einstellungen \u2192 Chats \u2192 Chat-Backup \u2192 Jetzt sichern (falls du Chats behalten willst)",
      migration_step3: "3. Gehe zu Einstellungen \u2192 Account \u2192 Account loeschen ODER deinstalliere die App",
      migration_step4: "4. Komm zurueck und klicke unten auf 'Weiter'",
      migration_warning: "\u26a0\ufe0f Wichtig: Deine persoenlichen WhatsApp-Chats gehen verloren wenn du kein Backup machst. Erstelle vorher ein Backup!",
      migration_btn: "Weiter \u2014 Nummer ist bereit",
      migration_cancel: "Andere Nummer verwenden",
      verification_title: "Verifizierung wird geprueft",
      verification_desc: "Deine Nummer wird gerade eingerichtet. Dies dauert in der Regel nur wenige Minuten. Eingehende Nachrichten gehen nicht verloren.",
      verification_refresh: "Status aktualisieren",
      verification_action_title: "Zusaetzliche Informationen benoetigt",
      verification_action_desc: "Der WhatsApp-Provider benoetigt zusaetzliche Unterlagen fuer die Freischaltung. Bitte lade die Dokumente direkt im Partner-Portal hoch oder kontaktiere unseren Support.",
      verification_upload: "Support kontaktieren",
      verification_support_hint: "Unser Team hilft dir bei der Verifizierung — meistens ist es in wenigen Minuten erledigt.",
      failed_title: "Verbindung fehlgeschlagen",
      failed_desc: "Bitte versuche es erneut.",
      retry: "Erneut versuchen",
      support: "Support kontaktieren",
      rejected_title: "Diese Nummer kann nicht verwendet werden",
      rejected_desc: "Diese Nummer wurde von WhatsApp nicht f\u00fcr die Nutzung freigegeben.",
      rejected_hint: "Das kommt selten vor und betrifft nur bestimmte Nummern. Du kannst eine neue SIM oder eSIM verwenden.",
      rejected_btn: "Neue Nummer verwenden",
    },
    en: {
      title: "Connect WhatsApp",
      desc: "Connect your clinic number for automatic patient communication.",
      btn: "Connect now",
      connecting: "Connecting\u2026",
      requested_title: "WhatsApp is being set up",
      requested_desc: "You will receive an SMS code on your number within the next 1\u20132 hours.\nPlease enter it here when it arrives.",
      phone_label: "Phone number",
      phone_hint: "e.g. +49 170 1234567",
      micro: "In most cases your number will be active within minutes.",
      active_title: "WhatsApp is active",
      active_desc: "Your number is successfully connected.",
      quality: "Quality",
      status: "Status",
      active: "Active",
      disconnect: "Disconnect",
      otp_title: "Verification required",
      otp_desc: "Please verify your number with the SMS code.",
      otp_hint: "6-digit code",
      verify_btn: "Verify",
      verifying: "Verifying\u2026",
      migration_title: "Existing number detected",
      migration_desc: "This number is already used with the WhatsApp app. To connect it with Flowmatix, it needs to be disconnected from the app first.",
      migration_step1: "1. Open WhatsApp on your phone",
      migration_step2: "2. Go to Settings \u2192 Chats \u2192 Chat Backup \u2192 Back Up Now (if you want to keep your chats)",
      migration_step3: "3. Go to Settings \u2192 Account \u2192 Delete Account OR uninstall the app",
      migration_step4: "4. Come back here and click 'Continue' below",
      migration_warning: "\u26a0\ufe0f Important: Your personal WhatsApp chats will be lost if you don't create a backup first!",
      migration_btn: "Continue \u2014 Number is ready",
      migration_cancel: "Use different number",
      verification_title: "Verification in progress",
      verification_desc: "Your number is being set up. This usually takes only a few minutes. Incoming messages will not be lost.",
      verification_refresh: "Refresh status",
      verification_action_title: "Additional information needed",
      verification_action_desc: "The WhatsApp provider needs additional documents for activation. Please upload them in the partner portal or contact our support.",
      verification_upload: "Contact support",
      verification_support_hint: "Our team will help you with the verification — usually done in minutes.",
      failed_title: "Connection failed",
      failed_desc: "Please try again.",
      retry: "Try again",
      support: "Contact support",
      rejected_title: "This number cannot be used",
      rejected_desc: "This number was not approved by WhatsApp for use.",
      rejected_hint: "This is rare and only affects certain numbers. You can use a new SIM or eSIM.",
      rejected_btn: "Use new number",
    },
    tr: {
      title: "WhatsApp Ba\u011fla",
      desc: "Otomatik hasta ileti\u015fimi i\u00e7in klinik numaran\u0131 ba\u011fla.",
      btn: "Ba\u011fla",
      connecting: "Ba\u011flan\u0131yor\u2026",
      requested_title: "WhatsApp kuruluyor",
      requested_desc: "1\u20132 saat i\u00e7inde numaran\u0131za bir SMS kodu gelecek.\nL\u00fctfen geldi\u011finde buraya girin.",
      phone_label: "Telefon",
      phone_hint: "\u00f6rn. +90 555 123 4567",
      micro: "Numaran\u0131z genellikle dakikalar i\u00e7inde aktif olur.",
      active_title: "WhatsApp aktif",
      active_desc: "Numaran\u0131z ba\u015far\u0131yla ba\u011fland\u0131.",
      quality: "Kalite",
      status: "Durum",
      active: "Aktif",
      disconnect: "Kes",
      otp_title: "Do\u011frulama gerekli",
      otp_desc: "SMS koduyla numaran\u0131z\u0131 do\u011frulay\u0131n.",
      otp_hint: "6 haneli kod",
      verify_btn: "Do\u011frula",
      verifying: "Do\u011frulan\u0131yor\u2026",
      migration_title: "Mevcut numara tespit edildi",
      migration_desc: "Bu numara zaten WhatsApp uygulamasiyla kullaniliyor. Flowmatix'e baglamak icin once uygulamadan ayrilmasi gerekiyor.",
      migration_step1: "1. Telefonunuzda WhatsApp'i acin",
      migration_step2: "2. Ayarlar \u2192 Sohbetler \u2192 Sohbet Yedegi \u2192 Simdi Yedekle (sohbetlerinizi saklamak istiyorsaniz)",
      migration_step3: "3. Ayarlar \u2192 Hesap \u2192 Hesabimi Sil VEYA uygulamayi kaldirin",
      migration_step4: "4. Buraya donun ve asagidaki 'Devam Et' butonuna tiklayin",
      migration_warning: "\u26a0\ufe0f Onemli: Yedekleme yapmazsaniz kisisel WhatsApp sohbetleriniz kaybolur!",
      migration_btn: "Devam Et \u2014 Numara hazir",
      migration_cancel: "Farkli numara kullan",
      verification_title: "Dogrulama devam ediyor",
      verification_desc: "Numaran\u0131z kuruluyor. Bu genellikle sadece birka\u00e7 dakika s\u00fcrer. Gelen mesajlar kaybolmaz.",
      verification_refresh: "Durumu g\u00fcncelle",
      verification_action_title: "Ek bilgi gerekli",
      verification_action_desc: "WhatsApp saglayicisi aktivasyon icin ek belgeler istiyor. Lutfen belgeleri ortak portalina yukleyin veya destekle iletisime gecin.",
      verification_upload: "Destege ulasin",
      verification_support_hint: "Ekibimiz dogrulama konusunda yardimci olacak — genellikle dakikalar icinde tamamlanir.",
      failed_title: "Ba\u011flant\u0131 ba\u015far\u0131s\u0131z",
      failed_desc: "L\u00fctfen tekrar deneyin.",
      retry: "Tekrar dene",
      support: "Destek",
      rejected_title: "Bu numara kullan\u0131lam\u0131yor",
      rejected_desc: "Bu numara WhatsApp taraf\u0131ndan onayland\u0131.",
      rejected_hint: "Bu nadirdir. Yeni bir SIM veya eSIM kullanabilirsiniz.",
      rejected_btn: "Yeni numara kullan",
    },
  };
  const tx = TX[l] || TX.de;

  /* ── Styles ── */
  const cd = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, marginBottom: 16 };
  const bt = { padding: "14px 24px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%", fontFamily: "inherit" };
  const ip = { width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#e8eef0", fontSize: 18, outline: "none", boxSizing: "border-box", textAlign: "center" };
  const wrap = { maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "70vh" };

  /* ── Lock: only available after purchase ── */
  const isLocked = workspaceState !== "active";
  if (isLocked) {
    const lockTx = {
      en: { title: "WhatsApp Connection", locked: "Available after subscription", desc: "Connect your clinic's WhatsApp number to enable automatic patient communication. This feature is available after activating your subscription.", cta: "View plans" },
      de: { title: "WhatsApp-Verbindung", locked: "Verfügbar nach Abo-Aktivierung", desc: "Verbinde deine Klinik-WhatsApp-Nummer für automatische Patientenkommunikation. Diese Funktion ist nach Aktivierung deines Abonnements verfügbar.", cta: "Pläne ansehen" },
      tr: { title: "WhatsApp Bağlantısı", locked: "Abonelik sonrası kullanılabilir", desc: "Otomatik hasta iletişimi için klinik WhatsApp numaranızı bağlayın. Bu özellik aboneliğinizi etkinleştirdikten sonra kullanılabilir.", cta: "Planları görüntüle" },
    }[l] || { title: "WhatsApp Connection", locked: "Available after subscription", desc: "Connect your clinic's WhatsApp number to enable automatic patient communication. This feature is available after activating your subscription.", cta: "View plans" };
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "70vh", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 20, opacity: 0.4 }}>🔒</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{lockTx.title}</h2>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#ff8a2a", marginBottom: 16 }}>{lockTx.locked}</div>
        <p style={{ color: "rgba(232,238,252,0.4)", fontSize: 13, lineHeight: 1.6, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>{lockTx.desc}</p>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 32, opacity: 0.3, pointerEvents: "none", filter: "blur(2px)" }}>
          <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: "rgba(232,238,252,0.9)" }}>{tx.phone_label}</div>
          <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(232,238,252,0.3)", fontSize: 18, textAlign: "center" }}>{tx.phone_hint}</div>
          <div style={{ padding: "14px 24px", borderRadius: 12, background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 15, marginTop: 16, textAlign: "center" }}>{tx.btn}</div>
        </div>
      </div>
    );
  }

  /* ── API helper ── */
  const api = (path, body) =>
    fetch("/api/v1/clinic/whatsapp/360/onboarding/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    })
      .then((r) => r.json())
      .catch((e) => ({ onboarding: { state: "failed", error_message: e.message } }));

  const go = () => setTimeout(() => location.reload(), 400);

  /* ══════════════════════════════════════════════ */
  /*  STATE: active                                 */
  /* ══════════════════════════════════════════════ */
  if (S === "active")
    return (
      <div style={wrap}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>{tx.title}</h2>
        <div style={{ ...cd, border: "1px solid rgba(16,185,129,0.15)", background: "rgba(16,185,129,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✅</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{tx.active_title}</div>
              <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", marginTop: 2 }}>{tx.active_desc}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(232,238,252,0.35)", marginBottom: 3, textTransform: "uppercase" }}>{tx.phone_label}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{ob.phone_number || n?.phone || "\u2014"}</div>
            </div>
            <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(232,238,252,0.35)", marginBottom: 3, textTransform: "uppercase" }}>{tx.status}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#10b981" }}>🟢 {tx.active}</div>
            </div>
          </div>
          <button style={{ ...bt, background: "rgba(239,68,68,0.06)", color: "rgba(239,68,68,0.7)", border: "1px solid rgba(239,68,68,0.12)", marginTop: 20, fontSize: 13 }} onClick={() => { if (!confirm("WhatsApp wirklich trennen?")) return; api("disconnect").then(go); }}>{tx.disconnect}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: awaiting_otp                           */
  /* ══════════════════════════════════════════════ */
  if (S === "awaiting_otp")
    return (
      <div style={wrap}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>{tx.title}</h2>
        <div style={cd}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(76,201,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📱</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{tx.otp_title}</div>
              <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", marginTop: 2 }}>{tx.otp_desc}</div>
            </div>
          </div>
          {ob.error_message && <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{ob.error_message}</div>}
          <input id="wa-otp" type="text" inputMode="numeric" maxLength={6} placeholder={tx.otp_hint} style={{ ...ip, fontSize: 24, letterSpacing: 8, fontWeight: 700 }} />
          <button style={{ ...bt, background: "#10b981", color: "#fff", marginTop: 16 }} onClick={() => { const c = document.getElementById("wa-otp")?.value; if (!c || c.length < 6) return; api("verify-otp", { code: c.trim() }).then(go); }}>{tx.verify_btn}</button>
          <button style={{ ...bt, background: "transparent", color: "rgba(232,238,252,0.4)", marginTop: 8, fontSize: 13 }} onClick={() => { api("retry").then(go); }}>{tx.migration_cancel}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: migration_required                     */
  /* ══════════════════════════════════════════════ */
  if (S === "migration_required")
    return (
      <div style={wrap}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>{tx.title}</h2>
        <div style={{ ...cd, border: "1px solid rgba(251,191,36,0.12)", background: "rgba(251,191,36,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(251,191,36,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📱</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{tx.migration_title}</div>
              <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", marginTop: 2 }}>{tx.migration_desc}</div>
            </div>
          </div>
          <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 13, color: "rgba(232,238,252,0.9)", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#fbbf24" }}>{tx.migration_warning}</div>
            <div>{tx.migration_step1}</div>
            <div>{tx.migration_step2}</div>
            <div style={{ fontWeight: 700 }}>{tx.migration_step3}</div>
            <div>{tx.migration_step4}</div>
          </div>
          <button style={{ ...bt, background: "#10b981", color: "#fff" }} onClick={() => { api("retry").then(() => { api("start", { phone: ob.phone_number }).then(go); }); }}>{tx.migration_btn}</button>
          <button style={{ ...bt, background: "transparent", color: "rgba(232,238,252,0.4)", marginTop: 8, fontSize: 13 }} onClick={() => { api("retry").then(go); }}>{tx.migration_cancel}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: verification_pending / migration_in_progress */
  /* ══════════════════════════════════════════════ */
  if (S === "verification_pending" || S === "migration_in_progress") {
    // Auto-refresh every 15 seconds
    setTimeout(() => { fetch("/api/v1/clinic/whatsapp/360/onboarding/state", { credentials: "include" }).then(r => r.json()).then(d => { if (d?.onboarding?.state && d.onboarding.state !== S) location.reload(); }); }, 15000);
    return (
      <div style={wrap}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>{tx.title}</h2>
        <div style={{ ...cd, border: "1px solid rgba(76,201,255,0.12)", background: "rgba(76,201,255,0.03)", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{tx.verification_title}</div>
          <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)" }}>{tx.verification_desc}</div>
          <div style={{ fontSize: 11, color: "rgba(76,201,255,0.4)", marginTop: 12 }}>↻ Status wird automatisch aktualisiert</div>
          <button style={{ ...bt, background: "rgba(255,255,255,0.04)", color: "rgba(232,238,252,0.95)", border: "1px solid rgba(255,255,255,0.06)", marginTop: 16 }} onClick={() => { fetch("/api/v1/clinic/whatsapp/360/onboarding/state", { credentials: "include" }).then(go); }}>{tx.verification_refresh}</button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════ */
  /*  STATE: verification_requires_action            */
  /* ══════════════════════════════════════════════ */
  if (S === "verification_requires_action")
    return (
      <div style={wrap}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>{tx.title}</h2>
        <div style={{ ...cd, border: "1px solid rgba(251,191,36,0.12)", background: "rgba(251,191,36,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(251,191,36,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📄</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{tx.verification_action_title}</div>
              <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", marginTop: 2 }}>{tx.verification_action_desc}</div>
            </div>
          </div>
          <div style={{ background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.12)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "rgba(232,238,252,0.9)" }}>{tx.verification_support_hint}</div>
          <a href="mailto:support@flowmatix.io?subject=WhatsApp%20Verifizierung" style={{ ...bt, background: "#10b981", color: "#fff", textDecoration: "none", display: "block", textAlign: "center" }}>{tx.verification_upload}</a>
          <button style={{ ...bt, background: "transparent", color: "rgba(232,238,252,0.4)", marginTop: 8, fontSize: 13 }} onClick={() => { fetch("/api/v1/clinic/whatsapp/360/onboarding/state", { credentials: "include" }).then(go); }}>{tx.verification_refresh}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: verification_rejected                   */
  /* ══════════════════════════════════════════════ */
  if (S === "verification_rejected")
    return (
      <div style={wrap}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>{tx.title}</h2>
        <div style={{ ...cd, border: "1px solid rgba(239,68,68,0.12)", background: "rgba(239,68,68,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⛔</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{tx.rejected_title}</div>
              <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", marginTop: 2 }}>{tx.rejected_desc}</div>
            </div>
          </div>
          <div style={{ background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.08)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "rgba(232,238,252,0.4)" }}>{tx.rejected_hint}</div>
          <button style={{ ...bt, background: "#10b981", color: "#fff" }} onClick={() => { api("retry").then(go); }}>{tx.rejected_btn}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: failed                                 */
  /* ══════════════════════════════════════════════ */
  if (S === "failed")
    return (
      <div style={wrap}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>{tx.title}</h2>
        <div style={{ ...cd, border: "1px solid rgba(239,68,68,0.12)", background: "rgba(239,68,68,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⚠️</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{tx.failed_title}</div>
              <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", marginTop: 2 }}>{ob.error_message || tx.failed_desc}</div>
            </div>
          </div>
          <button style={{ ...bt, background: "#10b981", color: "#fff" }} onClick={() => { api("retry").then(go); }}>{tx.retry}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: requested (waiting for operator)        */
  /* ══════════════════════════════════════════════ */
  if (S === "requested") {
    // Poll every 10s to detect when operator provisions
    setTimeout(() => {
      fetch("/api/v1/clinic/whatsapp/360/onboarding/state", { credentials: "include" })
        .then(r => r.json())
        .then(d => { if (d?.onboarding?.state && d.onboarding.state !== "requested") location.reload(); });
    }, 10000);
    return (
      <div style={{ ...wrap, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 16, animation: "fmpulse 1.5s ease-in-out infinite" }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{tx.requested_title}</div>
          <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", marginTop: 8, lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {tx.requested_desc}
          </div>
          <style>{"@keyframes fmpulse{0%,100%{opacity:1}50%{opacity:0.4}}"}</style>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════ */
  /*  STATE: connecting / verifying_otp             */
  /* ══════════════════════════════════════════════ */
  if (S === "connecting" || S === "verifying_otp")
    return (
      <div style={{ ...wrap, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 16, animation: "fmpulse 1.5s ease-in-out infinite" }}>📡</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{tx.connecting}</div>
          <style>{"@keyframes fmpulse{0%,100%{opacity:1}50%{opacity:0.4}}"}</style>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: not_connected (default)                */
  /* ══════════════════════════════════════════════ */
  return (
    <div style={wrap}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>{tx.title}</h2>
      <p style={{ color: "rgba(232,238,252,0.9)", marginBottom: 24, fontSize: 14, textAlign: "center" }}>{tx.desc}</p>
      <div style={cd}>
        <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: "rgba(232,238,252,0.9)", textAlign: "center" }}>{tx.phone_label}</div>
        <input id="wa-phone" type="tel" placeholder={tx.phone_hint} defaultValue={ob.phone_number || n?.phone || ""} style={ip} />
        <button id="wa-connect-btn" style={{ ...bt, background: "#10b981", color: "#fff", marginTop: 16 }} onClick={() => {
          const ph = document.getElementById("wa-phone")?.value;
          if (!ph || ph.replace(/[^0-9+]/g, "").length < 8) return;
          const b = document.getElementById("wa-connect-btn");
          if (b) { b.textContent = tx.connecting; b.disabled = true; b.style.opacity = "0.7"; }
          api("submit-number", { phone: ph.trim() }).then(go);
        }}>{tx.btn}</button>
        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(232,238,252,0.3)", lineHeight: 1.5, textAlign: "center" }}>{tx.micro}</div>
      </div>
    </div>
  );
}
