import { useApp } from "../../context/AppContext";
import { disconnectWhatsApp, apiFetch } from "../../api/client";

/**
 * WhatsApp Setup Page — Manual Operator-Assisted Flow
 * States: not_connected → requested → awaiting_otp → otp_submitted → active
 * Number + OTP are stored in DB for operator to handle via Kontroll-CRM
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
      desc: "Verbinde deine Klinik-Nummer für automatische Patientenkommunikation.",
      btn: "Jetzt verbinden",
      connecting: "Wird gesendet…",
      phone_label: "Telefonnummer",
      phone_hint: "z.B. +49 170 1234567",
      micro: "Die Nummer wird an unser Team übermittelt. Wir richten alles für dich ein.",
      requested_title: "WhatsApp wird eingerichtet",
      requested_desc: "Die Einrichtung kann einige Stunden dauern.\nSie erhalten einen Code sobald alles bereit ist.",
      requested_hint: "Du wirst per E-Mail benachrichtigt, sobald der Verifizierungscode bereit ist.",
      active_title: "WhatsApp ist jetzt aktiv",
      active_desc: "Deine Nummer ist erfolgreich verbunden.",
      quality: "Qualität",
      status: "Status",
      active: "Aktiv",
      disconnect: "Trennen",
      otp_title: "Verifizierungscode eingeben",
      otp_desc: "Du hast einen SMS-Code auf deine Nummer erhalten. Bitte gib ihn hier ein.",
      otp_hint: "6-stelliger Code",
      verify_btn: "Code absenden",
      submitting_otp: "Wird gesendet…",
      otp_submitted_title: "Ihr WhatsApp-System wird in Kürze online sein",
      otp_submitted_desc: "Der Code wurde übermittelt. Wir schließen die Einrichtung ab — du wirst per E-Mail benachrichtigt, sobald WhatsApp aktiv ist.",
      failed_title: "Verbindung fehlgeschlagen",
      failed_desc: "Bitte versuche es erneut.",
      retry: "Erneut versuchen",
      other_number: "Andere Nummer verwenden",
    },
    en: {
      title: "Connect WhatsApp",
      desc: "Connect your clinic number for automatic patient communication.",
      btn: "Connect now",
      connecting: "Submitting…",
      phone_label: "Phone number",
      phone_hint: "e.g. +49 170 1234567",
      micro: "Your number will be sent to our team. We'll set everything up for you.",
      requested_title: "WhatsApp is being set up",
      requested_desc: "Setup may take a few hours.\nYou will receive a code once everything is ready.",
      requested_hint: "You will be notified by email when the verification code is ready.",
      active_title: "WhatsApp is active",
      active_desc: "Your number is successfully connected.",
      quality: "Quality",
      status: "Status",
      active: "Active",
      disconnect: "Disconnect",
      otp_title: "Enter verification code",
      otp_desc: "You received an SMS code on your number. Please enter it here.",
      otp_hint: "6-digit code",
      verify_btn: "Submit code",
      submitting_otp: "Submitting…",
      otp_submitted_title: "Your WhatsApp system will be online shortly",
      otp_submitted_desc: "The code has been submitted. We're completing the setup — you'll be notified by email once WhatsApp is active.",
      failed_title: "Connection failed",
      failed_desc: "Please try again.",
      retry: "Try again",
      other_number: "Use different number",
    },
    tr: {
      title: "WhatsApp Bağla",
      desc: "Otomatik hasta iletişimi için klinik numaranı bağla.",
      btn: "Bağla",
      connecting: "Gönderiliyor…",
      phone_label: "Telefon",
      phone_hint: "örn. +90 555 123 4567",
      micro: "Numaranız ekibimize iletilecek. Her şeyi sizin için ayarlayacağız.",
      requested_title: "WhatsApp kuruluyor",
      requested_desc: "Kurulum birkaç saat sürebilir.\nHer şey hazır olduğunda bir kod alacaksınız.",
      requested_hint: "Doğrulama kodu hazır olduğunda e-posta ile bilgilendirileceksiniz.",
      active_title: "WhatsApp aktif",
      active_desc: "Numaranız başarıyla bağlandı.",
      quality: "Kalite",
      status: "Durum",
      active: "Aktif",
      disconnect: "Kes",
      otp_title: "Doğrulama kodunu girin",
      otp_desc: "Numaranıza bir SMS kodu gönderildi. Lütfen buraya girin.",
      otp_hint: "6 haneli kod",
      verify_btn: "Kodu gönder",
      submitting_otp: "Gönderiliyor…",
      otp_submitted_title: "WhatsApp sisteminiz kısa süre içinde aktif olacak",
      otp_submitted_desc: "Kod iletildi. Kurulumu tamamlıyoruz — WhatsApp aktif olduğunda e-posta ile bilgilendirileceksiniz.",
      failed_title: "Bağlantı başarısız",
      failed_desc: "Lütfen tekrar deneyin.",
      retry: "Tekrar dene",
      other_number: "Farklı numara kullan",
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
    apiFetch("/api/v1/clinic/whatsapp/360/onboarding/" + path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }).catch((e) => ({ onboarding: { state: "failed", error_message: e.message } }));

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
              <div style={{ fontSize: 15, fontWeight: 600 }}>{ob.phone_number || n?.phone || "—"}</div>
            </div>
            <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(232,238,252,0.35)", marginBottom: 3, textTransform: "uppercase" }}>{tx.status}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#10b981" }}>🟢 {tx.active}</div>
            </div>
          </div>
          <button style={{ ...bt, background: "rgba(239,68,68,0.06)", color: "rgba(239,68,68,0.7)", border: "1px solid rgba(239,68,68,0.12)", marginTop: 20, fontSize: 13 }} onClick={() => { if (!confirm("WhatsApp wirklich trennen?")) return; disconnectWhatsApp().then(() => { window.location.reload(); }).catch(() => alert("Fehler beim Trennen")); }}>{tx.disconnect}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: otp_submitted (waiting for operator)   */
  /* ══════════════════════════════════════════════ */
  if (S === "otp_submitted") {
    // Poll every 10s to detect when operator sets active
    setTimeout(() => {
      apiFetch("/api/v1/clinic/whatsapp/360/onboarding/state")
        .then(r => r.json())
        .then(d => { if (d?.onboarding?.state && d.onboarding.state !== "otp_submitted") location.reload(); });
    }, 10000);
    return (
      <div style={{ ...wrap, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{tx.otp_submitted_title}</div>
          <div style={{ fontSize: 14, color: "rgba(232,238,252,0.6)", lineHeight: 1.6, maxWidth: 440, margin: "0 auto" }}>
            {tx.otp_submitted_desc}
          </div>
        </div>
      </div>
    );
  }

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
          <button id="wa-otp-btn" style={{ ...bt, background: "#10b981", color: "#fff", marginTop: 16 }} onClick={() => {
            const c = document.getElementById("wa-otp")?.value;
            if (!c || c.length < 6) return;
            const b = document.getElementById("wa-otp-btn");
            if (b) { b.textContent = tx.submitting_otp; b.disabled = true; b.style.opacity = "0.7"; }
            api("submit-otp", { code: c.trim() }).then(go);
          }}>{tx.verify_btn}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: requested (waiting for operator setup) */
  /* ══════════════════════════════════════════════ */
  if (S === "requested") {
    // Poll every 10s to detect when operator triggers awaiting_otp
    setTimeout(() => {
      apiFetch("/api/v1/clinic/whatsapp/360/onboarding/state")
        .then(r => r.json())
        .then(d => { if (d?.onboarding?.state && d.onboarding.state !== "requested") location.reload(); });
    }, 10000);
    return (
      <div style={{ ...wrap, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 16, animation: "fmpulse 1.5s ease-in-out infinite" }}>⏳</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{tx.requested_title}</div>
          <div style={{ fontSize: 14, color: "rgba(232,238,252,0.6)", lineHeight: 1.6, whiteSpace: "pre-line", maxWidth: 440, margin: "0 auto" }}>
            {tx.requested_desc}
          </div>
          <div style={{ fontSize: 12, color: "rgba(232,238,252,0.3)", marginTop: 16 }}>
            {tx.requested_hint}
          </div>
          <button style={{ ...bt, background: "transparent", color: "rgba(232,238,252,0.4)", marginTop: 24, fontSize: 13, maxWidth: 300, margin: "24px auto 0" }} onClick={() => { api("retry").then(go); }}>{tx.other_number}</button>
          <style>{"@keyframes fmpulse{0%,100%{opacity:1}50%{opacity:0.4}}"}</style>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════ */
  /*  STATE: connecting (brief loading)             */
  /* ══════════════════════════════════════════════ */
  if (S === "connecting")
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
