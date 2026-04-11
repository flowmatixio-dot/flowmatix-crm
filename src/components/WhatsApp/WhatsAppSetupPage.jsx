import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { disconnectWhatsApp, apiFetch } from "../../api/client";

/**
 * WhatsApp Setup Page — Manual Operator-Assisted Flow
 * States: not_connected → requested → awaiting_otp → otp_submitted → active
 * Number + OTP are stored in DB for operator to handle via Kontroll-CRM
 * Auto-polls every 8s during waiting states so customer never needs to refresh.
 */
export default function WhatsAppSetupPage() {
  const { clinic, activeClinicId, setClinics, showT, t, lang, workspaceState, demoMode } = useApp();
  const l = lang || localStorage.getItem("fm_lang") || "de";
  const n = clinic;

  /* ── Onboarding state (from context) ── */
  const ob = n?.whatsapp_onboarding || {};
  const st = ob.state || "not_connected";
  const cs = n?.connection_status;
  const baseState = (cs === "connected" && st === "not_connected") ? "active" : st;

  /* ── Live polling state — overrides baseState when server returns new state ── */
  const [liveOb, setLiveOb] = useState(null);
  const S = liveOb?.state || baseState;
  const liveData = liveOb || ob;

  /* ── Always fetch real state on mount (context may be stale) ── */
  useEffect(() => {
    apiFetch("/api/v1/clinic/whatsapp/360/onboarding/state")
      .then(d => { if (d?.onboarding) setLiveOb(d.onboarding); })
      .catch(() => {});
  }, []);

  /* ── Auto-poll during waiting states ── */
  const needsPoll = S === "requested" || S === "otp_submitted";
  const pollRef = useRef(null);

  useEffect(() => {
    if (!needsPoll) { clearInterval(pollRef.current); return; }
    const poll = () => {
      apiFetch("/api/v1/clinic/whatsapp/360/onboarding/state")
        .then(d => {
          const newState = d?.onboarding?.state;
          if (newState && newState !== S) setLiveOb(d.onboarding);
        })
        .catch(() => {});
    };
    pollRef.current = setInterval(poll, 8000);
    return () => clearInterval(pollRef.current);
  }, [needsPoll, S]);

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
      hint_sep: "Du hast zwei Möglichkeiten",
      hint_c1_badge: "Am häufigsten",
      hint_c1_title: "Bestehende Nummer verbinden",
      hint_c1_desc: "Behalte deine bestehende Nummer — und automatisiere alle Anfragen. Deine Patienten schreiben weiterhin an die gewohnte Nummer, Flowmatix übernimmt den Rest.",
      hint_c1_p1: "Gleiche Nummer, gewohnter Chat für Patienten",
      hint_c1_p2: "Begleitete Einrichtung durch unser Team",
      hint_c1_p3: "KI antwortet 24/7 auf deiner Nummer",
      hint_c1_warn: "Nach Eingabe erhältst du einen SMS-Code zur Bestätigung deiner Nummer. Nach der Verbindung kann die Nummer nicht mehr parallel in der WhatsApp App genutzt werden. Bestehende Chats werden nicht übernommen.",
      hint_c2_badge: "EMPFOHLEN",
      hint_c2_title: "Eigene neue Nummer verwenden",
      hint_c2_desc: "Besorg dir eine neue SIM-Karte oder eSIM für eine dedizierte Nummer. Du registrierst und besitzt die Nummer — Flowmatix übernimmt API-Aktivierung und Setup.",
      hint_c2_p1: "Kein bestehender Chatverlauf betroffen",
      hint_c2_p2: "Professionelle Klinik-Nummer von Tag 1",
      hint_c2_p3: "Ideal, wenn die bisherige Nummer privat bleiben soll",
      hint_c2_info: "Du besorgst die Nummer, wir übernehmen die komplette technische Einrichtung.",
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
      hint_sep: "You have two options",
      hint_c1_badge: "Most common",
      hint_c1_title: "Connect your existing number",
      hint_c1_desc: "Keep your existing number — and automate all inquiries. Your patients keep messaging the same number, Flowmatix handles the rest.",
      hint_c1_p1: "Same number, familiar chat for patients",
      hint_c1_p2: "Guided setup by our team",
      hint_c1_p3: "AI responds 24/7 on your number",
      hint_c1_warn: "After entering your number, you will receive an SMS code to confirm it. Once connected, the number can no longer be used in the WhatsApp app simultaneously. Existing chats will not be transferred.",
      hint_c2_badge: "RECOMMENDED",
      hint_c2_title: "Use your own new number",
      hint_c2_desc: "Get a new SIM card or eSIM for a dedicated number. You register and own the number — Flowmatix handles API activation and setup.",
      hint_c2_p1: "No existing chat history affected",
      hint_c2_p2: "Professional clinic number from day 1",
      hint_c2_p3: "Ideal if your current number should stay private",
      hint_c2_info: "You get the number, we handle the complete technical setup.",
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
      hint_sep: "İki seçeneğiniz var",
      hint_c1_badge: "En yaygın",
      hint_c1_title: "Mevcut numaranızı bağlayın",
      hint_c1_desc: "Mevcut numaranızı koruyun — ve tüm sorguları otomatikleştirin. Hastalarınız alışık oldukları numaraya yazmaya devam eder, Flowmatix gerisini halleder.",
      hint_c1_p1: "Aynı numara, hastalar için alışık sohbet",
      hint_c1_p2: "Ekibimiz tarafından yönlendirilmiş kurulum",
      hint_c1_p3: "Yapay zeka numaranızda 7/24 yanıt verir",
      hint_c1_warn: "Numaranızı girdikten sonra onaylamak için bir SMS kodu alacaksınız. Bağlandıktan sonra numara WhatsApp uygulamasında eş zamanlı kullanılamaz. Mevcut sohbetler aktarılmaz.",
      hint_c2_badge: "ÖNERİLEN",
      hint_c2_title: "Kendi yeni numaranızı kullanın",
      hint_c2_desc: "Özel bir numara için yeni bir SIM kart veya eSIM alın. Numarayı siz kaydedip sahiplenirsiniz — Flowmatix API aktivasyonu ve kurulumu üstlenir.",
      hint_c2_p1: "Mevcut sohbet geçmişi etkilenmez",
      hint_c2_p2: "1. günden itibaren profesyonel klinik numarası",
      hint_c2_p3: "Mevcut numaranızın özel kalmasını istiyorsanız ideal",
      hint_c2_info: "Siz numarayı alırsınız, biz teknik kurulumun tamamını üstleniriz.",
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

  const go = (res) => {
    if (res?.onboarding) setLiveOb(res.onboarding);
    else setTimeout(() => location.reload(), 400);
  };

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
              <div style={{ fontSize: 15, fontWeight: 600 }}>{liveData.phone_number || n?.phone || "—"}</div>
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
          {liveData.error_message && <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{liveData.error_message}</div>}
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
              <div style={{ fontSize: 13, color: "rgba(232,238,252,0.9)", marginTop: 2 }}>{liveData.error_message || tx.failed_desc}</div>
            </div>
          </div>
          <button style={{ ...bt, background: "#10b981", color: "#fff" }} onClick={() => { api("retry").then(go); }}>{tx.retry}</button>
        </div>
      </div>
    );

  /* ══════════════════════════════════════════════ */
  /*  STATE: not_connected (default)                */
  /* ══════════════════════════════════════════════ */
  const hintCardBase = { padding: 22, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", position: "relative" };
  const hintBulletLi = { fontSize: 13, color: "rgba(232,238,252,0.85)", marginBottom: 8, paddingLeft: 22, position: "relative", lineHeight: 1.45 };
  const hintCheckMark = { position: "absolute", left: 0, top: 0, color: "#10b981", fontWeight: 800 };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 16px 48px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>{tx.title}</h2>
        <p style={{ color: "rgba(232,238,252,0.9)", marginBottom: 24, fontSize: 14, textAlign: "center" }}>{tx.desc}</p>
        <div style={cd}>
          <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: "rgba(232,238,252,0.9)", textAlign: "center" }}>{tx.phone_label}</div>
          <input id="wa-phone" type="tel" placeholder={tx.phone_hint} defaultValue={ob.phone_number || ""} style={ip} />
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

      {/* ── Two-Options Hint Cards ── */}
      <div style={{ marginTop: 32, textAlign: "center", fontSize: 12, fontWeight: 700, color: "rgba(232,238,252,0.5)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>{tx.hint_sep}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Card 1 — Existing number */}
        <div style={hintCardBase}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>📞 {tx.hint_c1_title}</div>
          <p style={{ fontSize: 13, color: "rgba(232,238,252,0.7)", lineHeight: 1.5, marginBottom: 14, marginTop: 0 }}>{tx.hint_c1_desc}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px 0" }}>
            <li style={hintBulletLi}><span style={hintCheckMark}>✓</span>{tx.hint_c1_p1}</li>
            <li style={hintBulletLi}><span style={hintCheckMark}>✓</span>{tx.hint_c1_p2}</li>
            <li style={{ ...hintBulletLi, marginBottom: 0 }}><span style={hintCheckMark}>✓</span>{tx.hint_c1_p3}</li>
          </ul>
          <div style={{ fontSize: 11, padding: "10px 12px", borderRadius: 8, background: "rgba(255,138,42,0.05)", border: "1px solid rgba(255,138,42,0.15)", color: "rgba(232,238,252,0.7)", lineHeight: 1.55 }}>⚠️ {tx.hint_c1_warn}</div>
        </div>

        {/* Card 2 — New number (recommended) */}
        <div style={{ ...hintCardBase, background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div style={{ position: "absolute", top: -10, right: 16, fontSize: 10, fontWeight: 800, color: "#fff", background: "#10b981", padding: "4px 10px", borderRadius: 8, letterSpacing: 0.8 }}>{tx.hint_c2_badge}</div>
          <div style={{ height: 10 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>📱 {tx.hint_c2_title}</div>
          <p style={{ fontSize: 13, color: "rgba(232,238,252,0.7)", lineHeight: 1.5, marginBottom: 14, marginTop: 0 }}>{tx.hint_c2_desc}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px 0" }}>
            <li style={hintBulletLi}><span style={hintCheckMark}>✓</span>{tx.hint_c2_p1}</li>
            <li style={hintBulletLi}><span style={hintCheckMark}>✓</span>{tx.hint_c2_p2}</li>
            <li style={{ ...hintBulletLi, marginBottom: 0 }}><span style={hintCheckMark}>✓</span>{tx.hint_c2_p3}</li>
          </ul>
          <div style={{ fontSize: 11, padding: "10px 12px", borderRadius: 8, background: "rgba(76,201,255,0.05)", border: "1px solid rgba(76,201,255,0.15)", color: "rgba(232,238,252,0.7)", lineHeight: 1.55 }}>ℹ️ {tx.hint_c2_info}</div>
        </div>
      </div>
    </div>
  );
}
