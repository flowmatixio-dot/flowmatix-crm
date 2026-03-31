import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";

// ── WhatsApp Onboarding (360dialog / Operator-provisioned) ──
// Flow: submit phone → operator provisions → OTP verification → connected

export default function WhatsAppEmbeddedSignup() {
  const { clinic, activeClinicId, setClinics, showT, t } = useApp();
  const [phone, setPhone] = useState(clinic?.phone || "");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const pollRef = useRef(null);

  // ── Derive state from clinic data ──
  // Possible states: not_connected, requested, awaiting_otp, verifying_otp, active
  const connectionStatus = clinic?.connection_status || "not_connected";
  const isConnected = connectionStatus === "connected" || connectionStatus === "active";
  const waPhone = clinic?.wa_display_name || clinic?.assignedPhoneNumber || clinic?.phone || null;
  const waQuality = clinic?.wa_quality_rating || null;

  // Determine onboarding state
  const [onboardingState, setOnboardingState] = useState(() => {
    if (isConnected) return "active";
    if (connectionStatus === "awaiting_otp") return "awaiting_otp";
    if (connectionStatus === "requested") return "requested";
    return "not_connected";
  });

  // Sync state when clinic prop changes
  useEffect(() => {
    if (isConnected) { setOnboardingState("active"); return; }
    if (connectionStatus === "awaiting_otp") { setOnboardingState("awaiting_otp"); return; }
    if (connectionStatus === "requested") { setOnboardingState("requested"); return; }
  }, [connectionStatus, isConnected]);

  // ── Fetch onboarding state from backend ──
  const fetchState = useCallback(async () => {
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/wa-360dialog/onboarding/state");
      if (!res) return;
      const st = res.state || res.status;
      if (st === "active" || st === "connected") {
        setOnboardingState("active");
        setClinics(cs => cs.map(c => c.id === activeClinicId ? {
          ...c,
          connection_status: "connected",
          wa_display_name: res.display_name || res.phone_number || c.wa_display_name,
          wa_quality_rating: res.quality_rating || c.wa_quality_rating,
          assignedPhoneNumber: res.phone_number || c.assignedPhoneNumber,
        } : c));
      } else if (st === "awaiting_otp") {
        setOnboardingState("awaiting_otp");
        setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, connection_status: "awaiting_otp" } : c));
      } else if (st === "requested") {
        setOnboardingState("requested");
      }
    } catch {
      // Silently fail on polling
    }
  }, [activeClinicId, setClinics]);

  // ── Poll every 10s when in "requested" state ──
  useEffect(() => {
    if (onboardingState === "requested") {
      fetchState(); // immediate check
      pollRef.current = setInterval(fetchState, 10_000);
      return () => clearInterval(pollRef.current);
    }
    if (pollRef.current) clearInterval(pollRef.current);
  }, [onboardingState, fetchState]);

  // ── Initial state fetch on mount ──
  useEffect(() => {
    if (!isConnected) fetchState();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit phone number ──
  const handleSubmitPhone = async () => {
    const cleaned = phone.replace(/\s+/g, "");
    if (!cleaned || cleaned.length < 8) {
      setError("Bitte eine gültige Telefonnummer eingeben.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/wa-360dialog/onboarding/submit-number", {
        method: "POST",
        body: JSON.stringify({ phone: cleaned }),
      });
      if (res.error) { setError(res.error); setLoading(false); return; }
      setOnboardingState("requested");
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, connection_status: "requested" } : c));
      showT("Nummer übermittelt!");
    } catch (e) {
      setError(e.message || "Fehler beim Senden der Nummer.");
    }
    setLoading(false);
  };

  // ── Verify OTP ──
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setOnboardingState("verifying_otp");
    setError(null);
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/wa-360dialog/onboarding/verify-otp", {
        method: "POST",
        body: JSON.stringify({ code: otpCode }),
      });
      if (res.error) {
        setError(res.error);
        setOnboardingState("awaiting_otp");
        return;
      }
      setOnboardingState("active");
      setClinics(cs => cs.map(c => c.id === activeClinicId ? {
        ...c,
        connection_status: "connected",
        wa_display_name: res.display_name || res.phone_number || c.wa_display_name,
        assignedPhoneNumber: res.phone_number || c.assignedPhoneNumber,
      } : c));
      showT("WhatsApp verbunden!");
    } catch (e) {
      setError(e.message || "Verifizierung fehlgeschlagen.");
      setOnboardingState("awaiting_otp");
    }
  };

  // ── Resend OTP ──
  const handleResendOtp = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await fmApi.apiFetch("/api/v1/clinic/wa-360dialog/onboarding/resend-otp", { method: "POST" });
      if (res.error) {
        setError(res.error === "not_ready"
          ? "WhatsApp-Einrichtung ist noch nicht abgeschlossen. Bitte warte kurz."
          : res.error);
      } else {
        showT("Neuer Code gesendet!");
      }
    } catch {
      setError("WhatsApp-Einrichtung ist noch nicht abgeschlossen. Bitte warte kurz.");
    }
    setResending(false);
  };

  // ── Disconnect ──
  const handleDisconnect = async () => {
    if (!window.confirm("WhatsApp wirklich trennen? Automatische Nachrichten werden gestoppt.")) return;
    try {
      await fmApi.apiFetch("/api/v1/clinic/wa-360dialog/onboarding/disconnect", { method: "POST" });
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, connection_status: "not_connected", wa_display_name: null } : c));
      setOnboardingState("not_connected");
      setPhone(clinic?.phone || "");
      setOtpCode("");
      showT("WhatsApp getrennt");
    } catch (e) {
      showT(e.message || "Fehler");
    }
  };

  // ════════════════════════════════════════════
  // ── CONNECTED STATE ──
  // ════════════════════════════════════════════
  if (onboardingState === "active" || isConnected) {
    return (
      <div style={{ maxWidth: 560 }}>
        {/* Status Card */}
        <div style={{
          padding: "20px 22px", borderRadius: 14,
          background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>💬</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>{t("wa_connected_title") || "WhatsApp connected"}</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.7)", marginTop: 2 }}>{t("wa_auto_messages_active") || "Automatic messages active"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {[
              { label: t("wa_phone_number") || "Phone number", value: waPhone || clinic?.phone || "—" },
              { label: t("wa_business_name") || "Business Name", value: clinic?.wa_display_name || clinic?.name || "—" },
              { label: t("wa_quality_rating") || "Quality rating", value: waQuality || (t("wa_quality_good") || "Good") },
              { label: t("wa_status_label") || "Status", value: t("wa_status_active") || "Active", color: "#10b981" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ fontSize: 12, color: "rgba(167,177,195,0.6)" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.color || "rgba(232,238,252,0.95)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Cost Info */}
        <div style={{
          padding: "12px 14px", borderRadius: 10, marginBottom: 16,
          background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(76,201,255,0.6)", marginBottom: 6 }}>💡 {t("wa_cost_hint_title") || "WhatsApp cost info"}</div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.6)", lineHeight: 1.7 }}>
            {t("wa_cost_hint_body") || "The AI bot communicates via WhatsApp."}<br/><br/>
            • {({ de: "Wenn ein Patient zuerst schreibt, kann die Klinik", en: "When a patient writes first, the clinic can reply", tr: "Bir hasta ilk yazdığında, klinik" }[localStorage.getItem("fm_lang") || "de"] || "When a patient writes first, the clinic can reply")} <strong style={{color:"rgba(232,238,252,0.95)"}}>{t("wa_cost_24h") || "24 hours free"}</strong> {({ de: "antworten.", en: ".", tr: "yanıt verebilir." }[localStorage.getItem("fm_lang") || "de"] || ".")}<br/>
            • {t("wa_cost_new_conv") || "Only when a new message is started after this 24-hour window, Meta charges a new conversation."}<br/><br/>
            {t("wa_cost_example") || "Example prices per conversation:"}<br/>
            <span style={{marginLeft:8}}>🇹🇷 Turkey: ~<strong style={{color:"rgba(232,238,252,0.95)"}}>€0.005</strong></span><br/>
            <span style={{marginLeft:8}}>🇩🇪 Germany: ~<strong style={{color:"rgba(232,238,252,0.95)"}}>€0.05</strong></span><br/><br/>
            {t("wa_cost_billing") || "Billing is done directly through the clinic's WhatsApp Business Account."}<br/>
            {t("wa_cost_no_extra") || "Flowmatix does not charge any additional fees for this."}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => showT(t("auto_templates_used_24h") || "Templates are configured via automations")} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            background: "rgba(76,201,255,0.06)", border: "1px solid rgba(76,201,255,0.12)", color: "#4cc9ff",
          }}>{t("wa_configure_templates") || "Configure templates"}</button>
          <button onClick={handleDisconnect} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.5)",
          }}>{t("gcal_disconnect_btn") || "Disconnect"}</button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // ── VERIFYING OTP (loading state) ──
  // ════════════════════════════════════════════
  if (onboardingState === "verifying_otp") {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{
          padding: "40px 24px", borderRadius: 14,
          background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
          textAlign: "center",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: "0 auto 16px",
            background: "rgba(76,201,255,0.08)", border: "1px solid rgba(76,201,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            animation: "pulse 1.5s ease-in-out infinite",
          }}>🔄</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(232,238,252,0.9)" }}>Code wird überprüft...</div>
          <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", marginTop: 8 }}>Bitte kurz warten.</div>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // ── AWAITING OTP ──
  // ════════════════════════════════════════════
  if (onboardingState === "awaiting_otp") {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{
          padding: "24px", borderRadius: 14,
          background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
          marginBottom: 20,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>📱</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(232,238,252,0.95)" }}>SMS-Code eingeben</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", marginTop: 2 }}>Verifizierung</div>
            </div>
          </div>

          {/* Info text */}
          <div style={{
            padding: "14px 16px", borderRadius: 12,
            background: "rgba(76,201,255,0.04)", border: "1px solid rgba(76,201,255,0.1)",
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, color: "rgba(167,177,195,0.6)", lineHeight: 1.6 }}>
              📱 Ein Code wurde per SMS an deine Nummer gesendet. Bitte jetzt eingeben — gültig für 10 Minuten.
            </div>
          </div>

          {/* OTP input */}
          <div style={{
            padding: 16, borderRadius: 12,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 10 }}>6-stelliger SMS-Code</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                style={{
                  width: 180, padding: "12px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontFamily: "monospace", fontSize: 22, letterSpacing: 10,
                  textAlign: "center", outline: "none",
                }}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={otpCode.length !== 6}
                style={{
                  padding: "12px 24px", borderRadius: 10,
                  background: otpCode.length === 6 ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.04)",
                  border: "none",
                  color: otpCode.length === 6 ? "#fff" : "rgba(167,177,195,0.7)",
                  fontWeight: 700, fontSize: 14, cursor: otpCode.length === 6 ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                Verifizieren
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)",
              fontSize: 12, color: "#ef4444",
            }}>
              {error}
            </div>
          )}

          {/* Resend button */}
          <button
            onClick={handleResendOtp}
            disabled={resending}
            style={{
              background: "none", border: "none", cursor: resending ? "wait" : "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              color: "rgba(76,201,255,0.6)",
              padding: 0,
            }}
          >
            {resending ? "Wird gesendet..." : "Neuen Code anfordern"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // ── REQUESTED (waiting for operator) ──
  // ════════════════════════════════════════════
  if (onboardingState === "requested") {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{
          padding: "24px", borderRadius: 14,
          background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>⏳</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(232,238,252,0.95)" }}>Wird eingerichtet</div>
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", marginTop: 2 }}>WhatsApp-Einrichtung läuft</div>
            </div>
          </div>

          {/* Status message */}
          <div style={{
            padding: "16px 18px", borderRadius: 12,
            background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.1)",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, color: "rgba(167,177,195,0.6)", lineHeight: 1.7 }}>
              ⏳ Dein WhatsApp wird eingerichtet. Du bekommst in den nächsten 1-2 Stunden einen SMS-Code auf deine Nummer.
            </div>
          </div>

          {/* Progress indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4,
              background: "#fbbf24",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 12, color: "rgba(167,177,195,0.6)" }}>
              Warte auf Einrichtung durch unser Team...
            </span>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // ── NOT CONNECTED (default) ──
  // ════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{
        padding: "24px", borderRadius: 14,
        background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>💬</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(232,238,252,0.95)" }}>WhatsApp verbinden</div>
            <div style={{ fontSize: 12, color: "rgba(167,177,195,0.65)", marginTop: 2 }}>Nummer eingeben um loszulegen</div>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: "rgba(167,177,195,0.7)", lineHeight: 1.6, marginBottom: 20 }}>
          Gib die Telefonnummer ein, die du für WhatsApp Business nutzen möchtest. Unser Team richtet alles für dich ein — du bekommst dann einen SMS-Code zur Verifizierung.
        </div>

        {/* Phone number input */}
        <div style={{
          padding: 16, borderRadius: 12,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,177,195,0.7)", marginBottom: 10 }}>WhatsApp-Nummer</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+49 30 1234567"
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", fontFamily: "inherit", fontSize: 15, outline: "none",
              }}
              onKeyDown={e => { if (e.key === "Enter") handleSubmitPhone(); }}
            />
          </div>
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.7)", marginTop: 8 }}>
            Am besten deine bestehende Praxisnummer verwenden.
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14,
            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)",
            fontSize: 12, color: "#ef4444",
          }}>
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmitPhone}
          disabled={loading || !phone.trim()}
          style={{
            width: "100%", padding: "14px 24px", borderRadius: 12,
            fontSize: 14, fontWeight: 800, cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit",
            background: loading ? "rgba(37,211,102,0.15)" : "linear-gradient(135deg, #25D366, #128C7E)",
            border: "none", color: "#fff",
            boxShadow: "0 4px 14px rgba(37,211,102,0.25)",
            opacity: phone.trim() ? 1 : 0.5,
            transition: "all 0.2s",
          }}
        >
          {loading ? "Wird gesendet..." : "Nummer einreichen"}
        </button>
      </div>
    </div>
  );
}
