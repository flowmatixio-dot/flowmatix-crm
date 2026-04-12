import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";

/**
 * WhatsApp Connect Step — Clean 360dialog flow
 *
 * States: idle → connecting → awaiting_otp → verifying → connected → error
 */

const STATES = {
  idle: "idle",
  connecting: "connecting",
  awaiting_otp: "awaiting_otp",
  verifying: "verifying",
  connected: "connected",
  error: "error",
};

export default function WhatsAppConnectStep() {
  const { clinic, activeClinicId, setClinics, showT, t, lang } = useApp();
  const l = lang || "de";

  const isAlreadyConnected = clinic?.connection_status === "connected";

  const [state, setState] = useState(isAlreadyConnected ? STATES.connected : STATES.idle);
  const [phone, setPhone] = useState(clinic?.phone || "");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState(null);
  const [channelId, setChannelId] = useState(null);

  // Sync if clinic becomes connected externally
  useEffect(() => {
    if (clinic?.connection_status === "connected") setState(STATES.connected);
  }, [clinic?.connection_status]);

  const L = {
    de: {
      title: "WhatsApp verbinden",
      subtitle: "Ihr KI-Assistent kommuniziert 24/7 über WhatsApp mit Ihren Patienten.",
      phone_label: "WhatsApp-Nummer Ihrer Klinik",
      phone_hint: "Mit Ländervorwahl, z.B. +49 170 1234567",
      connect_btn: "Jetzt verbinden",
      connecting: "Verbinde...",
      otp_title: "Bestätigungscode eingeben",
      otp_subtitle: "Wir haben einen Code per SMS an Ihre Nummer gesendet.",
      otp_placeholder: "6-stelliger Code",
      verify_btn: "Code bestätigen",
      verifying: "Überprüfe...",
      connected_title: "WhatsApp ist verbunden!",
      connected_subtitle: "Ihr KI-Assistent ist jetzt live und beantwortet Patientenanfragen automatisch.",
      reconnect: "Erneut verbinden",
      disconnect: "Trennen",
      error_wrong_code: "Falscher Code. Bitte erneut versuchen.",
      error_already_registered: "Diese Nummer ist bereits registriert.",
      error_timeout: "Zeitüberschreitung. Bitte erneut versuchen.",
      error_generic: "Verbindung fehlgeschlagen. Bitte erneut versuchen.",
      retry: "Erneut versuchen",
      quality: "Qualität",
      status: "Status",
      active: "Aktiv",
      number: "Nummer",
      cost_hint: "WhatsApp-Nachrichten kosten ca. €0,005-0,05 pro Gespräch (Meta-Gebühren). Flowmatix berechnet keine zusätzlichen Kosten.",
    },
    en: {
      title: "Connect WhatsApp",
      subtitle: "Your AI assistant communicates 24/7 with patients via WhatsApp.",
      phone_label: "Your clinic's WhatsApp number",
      phone_hint: "With country code, e.g. +49 170 1234567",
      connect_btn: "Connect now",
      connecting: "Connecting...",
      otp_title: "Enter verification code",
      otp_subtitle: "We sent a code via SMS to your number.",
      otp_placeholder: "6-digit code",
      verify_btn: "Verify code",
      verifying: "Verifying...",
      connected_title: "WhatsApp is connected!",
      connected_subtitle: "Your AI assistant is now live and responds to patient inquiries automatically.",
      reconnect: "Reconnect",
      disconnect: "Disconnect",
      error_wrong_code: "Wrong code. Please try again.",
      error_already_registered: "This number is already registered.",
      error_timeout: "Timeout. Please try again.",
      error_generic: "Connection failed. Please try again.",
      retry: "Try again",
      quality: "Quality",
      status: "Status",
      active: "Active",
      number: "Number",
      cost_hint: "WhatsApp messages cost approx. €0.005-0.05 per conversation (Meta fees). Flowmatix charges no additional costs.",
    },
    tr: {
      title: "WhatsApp'ı Bağla",
      subtitle: "Yapay zeka asistanınız WhatsApp üzerinden 7/24 hastalarla iletişim kurar.",
      phone_label: "Kliniğinizin WhatsApp numarası",
      phone_hint: "Ülke kodu ile, örn. +90 532 1234567",
      connect_btn: "Şimdi bağla",
      connecting: "Bağlanıyor...",
      otp_title: "Doğrulama kodunu girin",
      otp_subtitle: "Numaranıza SMS ile bir kod gönderdik.",
      otp_placeholder: "6 haneli kod",
      verify_btn: "Kodu doğrula",
      verifying: "Doğrulanıyor...",
      connected_title: "WhatsApp bağlandı!",
      connected_subtitle: "Yapay zeka asistanınız artık canlı ve hasta sorularını otomatik yanıtlıyor.",
      reconnect: "Yeniden bağla",
      disconnect: "Bağlantıyı kes",
      error_wrong_code: "Yanlış kod. Lütfen tekrar deneyin.",
      error_already_registered: "Bu numara zaten kayıtlı.",
      error_timeout: "Zaman aşımı. Lütfen tekrar deneyin.",
      error_generic: "Bağlantı başarısız. Lütfen tekrar deneyin.",
      retry: "Tekrar dene",
      quality: "Kalite",
      status: "Durum",
      active: "Aktif",
      number: "Numara",
      cost_hint: "WhatsApp mesajları konuşma başına yaklaşık €0,005-0,05 (Meta ücretleri). Flowmatix ek ücret almaz.",
    },
  };
  const tx = L[l] || L.de;

  // ── API Calls ──
  const handleConnect = async () => {
    if (!phone.trim()) return;
    setState(STATES.connecting);
    setError(null);

    try {
      const res = await fetch("/api/v1/clinic/whatsapp/360/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), clinicName: clinic?.name || "" }),
      });
      const data = await res.json();

      if (data.success) {
        setChannelId(data.channelId);
        setState(STATES.awaiting_otp);
      } else {
        setError(data.error?.includes("already") ? tx.error_already_registered : tx.error_generic);
        setState(STATES.error);
      }
    } catch {
      setError(tx.error_timeout);
      setState(STATES.error);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) return;
    setState(STATES.verifying);
    setError(null);

    try {
      const res = await fetch("/api/v1/clinic/whatsapp/360/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: otpCode.trim() }),
      });
      const data = await res.json();

      if (data.success || data.connected) {
        setState(STATES.connected);
        setClinics(cs => cs.map(c => c.id === activeClinicId ? {
          ...c,
          connection_status: "connected",
          waSetupProgress: { ...c.waSetupProgress, connection_tested: true },
        } : c));
        showT(tx.connected_title);
      } else {
        setError(data.error?.includes("Invalid") ? tx.error_wrong_code : tx.error_generic);
        setState(STATES.awaiting_otp); // stay on OTP screen
      }
    } catch {
      setError(tx.error_timeout);
      setState(STATES.awaiting_otp);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/v1/clinic/whatsapp/360/disconnect", {
        method: "POST", credentials: "include",
      });
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, connection_status: "disconnected" } : c));
      setState(STATES.idle);
      showT(tx.disconnect);
    } catch { /* ignore */ }
  };

  const handleRetry = () => {
    setError(null);
    setOtpCode("");
    setState(STATES.idle);
  };

  // ── Render ──

  // CONNECTED STATE
  if (state === STATES.connected) {
    return (
      <div style={{ maxWidth: 520 }}>
        <div style={{
          padding: 24, borderRadius: 16, textAlign: "center",
          background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)",
        }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{tx.connected_title}</div>
          <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginTop: 6, lineHeight: 1.5 }}>{tx.connected_subtitle}</div>

          <div style={{ marginTop: 20, display: "grid", gap: 6 }}>
            {[
              { label: tx.number, value: phone || clinic?.phone || "—" },
              { label: tx.quality, value: clinic?.wa_quality_rating || "GREEN" },
              { label: tx.status, value: tx.active, color: "#10b981" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 16px" }}>
                <span style={{ fontSize: 12, color: "rgba(167,177,195,0.6)" }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.color || "rgba(232,238,252,0.95)" }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", lineHeight: 1.6 }}>💡 {tx.cost_hint}</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={handleRetry} style={{ ...btnStyle, background: "rgba(76,201,255,0.06)", border: "1px solid rgba(76,201,255,0.12)", color: "#4cc9ff" }}>{tx.reconnect}</button>
          <button onClick={handleDisconnect} style={{ ...btnStyle, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.5)" }}>{tx.disconnect}</button>
        </div>
      </div>
    );
  }

  // OTP INPUT STATE
  if (state === STATES.awaiting_otp || state === STATES.verifying) {
    return (
      <div style={{ maxWidth: 520 }}>
        <div style={{
          padding: 28, borderRadius: 16, textAlign: "center",
          background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>📱</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{tx.otp_title}</div>
          <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginTop: 6 }}>{tx.otp_subtitle}</div>

          <input
            type="text"
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replaceAll(/\D/g, "").slice(0, 6))}
            placeholder={tx.otp_placeholder}
            maxLength={6}
            autoFocus
            style={{
              width: 200, padding: "14px 20px", borderRadius: 12, fontSize: 24, fontWeight: 800,
              textAlign: "center", letterSpacing: 8, marginTop: 20,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(76,201,255,0.2)",
              color: "#fff", fontFamily: "inherit", outline: "none",
            }}
          />

          {error && <ErrorBox message={error} />}

          <button
            onClick={handleVerifyOTP}
            disabled={otpCode.length < 6 || state === STATES.verifying}
            style={{
              ...primaryBtnStyle,
              marginTop: 20, width: "100%", maxWidth: 300,
              opacity: otpCode.length < 6 ? 0.4 : 1,
            }}
          >
            {state === STATES.verifying ? tx.verifying : tx.verify_btn}
          </button>
        </div>
      </div>
    );
  }

  // IDLE / CONNECTING / ERROR STATE
  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{
        padding: 28, borderRadius: 16,
        background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Phone input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 6, display: "block" }}>{tx.phone_label}</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+49 170 1234567"
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 16, fontWeight: 600,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", marginTop: 4 }}>{tx.phone_hint}</div>
        </div>

        {error && <ErrorBox message={error} onRetry={handleRetry} retryLabel={tx.retry} />}

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={!phone.trim() || state === STATES.connecting}
          style={{
            ...primaryBtnStyle,
            width: "100%",
            opacity: !phone.trim() ? 0.4 : 1,
          }}
        >
          {state === STATES.connecting ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>🔄</span> {tx.connecting}</>
          ) : (
            <><span style={{ fontSize: 18 }}>💬</span> {tx.connect_btn}</>
          )}
        </button>
      </div>

      <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)" }}>
        <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", lineHeight: 1.6 }}>💡 {tx.cost_hint}</div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── Shared Styles ──
const btnStyle = {
  padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};

const primaryBtnStyle = {
  padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 800,
  cursor: "pointer", fontFamily: "inherit",
  background: "linear-gradient(135deg, #25D366, #128C7E)",
  border: "none", color: "#fff",
  boxShadow: "0 4px 14px rgba(37,211,102,0.25)",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  transition: "all 0.2s",
};

function ErrorBox({ message, onRetry, retryLabel }) {
  return (
    <div style={{
      marginTop: 12, padding: "10px 14px", borderRadius: 8,
      background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 12, color: "#ef4444" }}>❌ {message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: "none", border: "none", color: "#ef4444", fontSize: 11,
          fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>{retryLabel || "Retry"}</button>
      )}
    </div>
  );
}
