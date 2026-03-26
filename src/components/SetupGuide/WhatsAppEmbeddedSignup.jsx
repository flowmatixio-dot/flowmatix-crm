import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import * as fmApi from "../../api/client";

// ── Meta Embedded Signup Configuration ──
// Replace these with your actual Meta App credentials
const META_APP_ID = "XXXXXXXXXXXXXXXX"; // TODO: Replace with real Meta App ID
const META_CONFIG_ID = "XXXXXXXXXXXXXXXX"; // TODO: Replace with real WhatsApp Config ID
const META_SDK_URL = "https://connect.facebook.net/en_US/sdk.js";

export default function WhatsAppEmbeddedSignup() {
  const { clinic, activeClinicId, setClinics, showT, t } = useApp();
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [showManual, setShowManual] = useState(false);

  const isConnected = clinic?.connection_status === "connected";
  const waPhone = clinic?.wa_display_name || clinic?.assignedPhoneNumber || null;
  const waQuality = clinic?.wa_quality_rating || null;

  // Load Meta SDK
  useEffect(() => {
    if (window.FB) { setSdkLoaded(true); return; }
    const script = document.createElement("script");
    script.src = META_SDK_URL;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      window.fbAsyncInit = () => {
        window.FB.init({
          appId: META_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: "v21.0",
        });
        setSdkLoaded(true);
      };
      if (window.FB) window.fbAsyncInit();
    };
    script.onerror = () => setError(t("wa_sdk_load_failed") || "Meta SDK could not be loaded");
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  // Launch Meta Embedded Signup
  const launchSignup = useCallback(() => {
    if (!window.FB) { setError(t("wa_sdk_not_loaded") || "Meta SDK not loaded"); return; }
    setLoading(true);
    setError(null);

    window.FB.login((response) => {
      setLoading(false);
      if (response.authResponse) {
        const { code, accessToken } = response.authResponse;
        // Send token/code to our backend to complete the setup
        handleSignupComplete(code || accessToken);
      } else {
        setError(t("wa_login_cancelled") || "Login cancelled");
      }
    }, {
      config_id: META_CONFIG_ID,
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: "",
        sessionInfoVersion: "3",
      },
    });
  }, []);

  // Send signup result to backend
  const handleSignupComplete = async (codeOrToken) => {
    setLoading(true);
    try {
      const result = await fmApi.apiFetch("/api/v1/clinic/whatsapp/complete-signup", {
        method: "POST",
        body: JSON.stringify({ code: codeOrToken }),
      });
      if (result.success || result.connected) {
        setClinics(cs => cs.map(c => c.id === activeClinicId ? {
          ...c,
          connection_status: "connected",
          wa_display_name: result.display_name || result.phone_number,
          waSetupProgress: { ...c.waSetupProgress, meta_account_created: true, meta_verified: true, partner_invited: true, connection_tested: true },
        } : c));
        showT(t("wa_connected_success") || "WhatsApp connected successfully!");
      } else {
        setError(result.error || (t("wa_connection_failed") || "Connection failed"));
      }
    } catch (e) {
      setError(e.message || (t("wa_connection_error") || "Connection error"));
    }
    setLoading(false);
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm(t("wa_disconnect_confirm") || "Really disconnect WhatsApp? Automatic messages will be stopped.")) return;
    try {
      await fmApi.apiFetch("/api/v1/clinic/whatsapp/disconnect", { method: "POST" });
      setClinics(cs => cs.map(c => c.id === activeClinicId ? { ...c, connection_status: "disconnected" } : c));
      showT(t("wa_disconnected") || "WhatsApp disconnected");
    } catch (e) { showT(e.message || (t("auto_error") || "Error")); }
  };

  // ── CONNECTED STATE ──
  if (isConnected) {
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
              <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", marginTop: 2 }}>{t("wa_auto_messages_active") || "Automatic messages active"}</div>
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
                <span style={{ fontSize: 12, color: "rgba(167,177,195,0.4)" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.color || "rgba(232,238,252,0.8)" }}>{row.value}</span>
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
          <div style={{ fontSize: 11, color: "rgba(167,177,195,0.4)", lineHeight: 1.7 }}>
            {t("wa_cost_hint_body") || "The AI bot communicates via WhatsApp."}<br/><br/>
            • {({ de: "Wenn ein Patient zuerst schreibt, kann die Klinik", en: "When a patient writes first, the clinic can reply", tr: "Bir hasta ilk yazdığında, klinik" }[localStorage.getItem("fm_lang") || "de"] || "When a patient writes first, the clinic can reply")} <strong style={{color:"rgba(232,238,252,0.6)"}}>{t("wa_cost_24h") || "24 hours free"}</strong> {({ de: "antworten.", en: ".", tr: "yanıt verebilir." }[localStorage.getItem("fm_lang") || "de"] || ".")}<br/>
            • {t("wa_cost_new_conv") || "Only when a new message is started after this 24-hour window, Meta charges a new conversation."}<br/><br/>
            {t("wa_cost_example") || "Example prices per conversation:"}<br/>
            <span style={{marginLeft:8}}>🇹🇷 Turkey: ~<strong style={{color:"rgba(232,238,252,0.6)"}}>€0.005</strong></span><br/>
            <span style={{marginLeft:8}}>🇩🇪 Germany: ~<strong style={{color:"rgba(232,238,252,0.6)"}}>€0.05</strong></span><br/><br/>
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

  // ── NOT CONNECTED STATE ──
  return (
    <div style={{ maxWidth: 560 }}>
      {/* Introduction */}
      <div style={{
        padding: "24px", borderRadius: 14,
        background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>💬</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(232,238,252,0.95)" }}>{t("setup_whatsapp") || "WhatsApp Connection"}</div>
            <div style={{ fontSize: 12, color: "rgba(167,177,195,0.45)", marginTop: 2 }}>{t("ob_whatsapp") || "Connect WhatsApp"}</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "rgba(167,177,195,0.5)", lineHeight: 1.6, marginBottom: 16 }}>
          {{ de: "Verbinden Sie Ihr WhatsApp Business Konto um automatische Nachrichten zu senden, Patientenfotos zu empfangen und KI-gestützte Gespräche zu führen.", en: "Connect your WhatsApp Business account to send automatic messages, receive patient photos and conduct AI-powered conversations.", tr: "Otomatik mesaj göndermek, hasta fotoğrafları almak ve yapay zeka destekli görüşmeler yürütmek için WhatsApp Business hesabınızı bağlayın." }[localStorage.getItem("fm_lang") || "de"] || "Connect your WhatsApp Business account to send automatic messages, receive patient photos and conduct AI-powered conversations."}
        </div>

        {/* Requirements */}
        <div style={{
          padding: "12px 14px", borderRadius: 10,
          background: "rgba(76,201,255,0.03)", border: "1px solid rgba(76,201,255,0.08)",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(76,201,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Voraussetzungen</div>
          <div style={{ fontSize: 12, color: "rgba(167,177,195,0.5)", lineHeight: 1.6 }}>
            • Meta Business Konto<br/>
            • WhatsApp Business Telefonnummer<br/>
            <span style={{ fontSize: 11, color: "rgba(167,177,195,0.3)" }}>Falls noch nicht vorhanden, führt der Assistent Sie automatisch durch die Einrichtung. Dauer: ca. 2-3 Minuten.</span>
          </div>
        </div>

        {/* Primary CTA: Embedded Signup */}
        <button onClick={launchSignup} disabled={loading || !sdkLoaded} style={{
          width: "100%", padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 800,
          cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
          background: loading ? "rgba(37,211,102,0.15)" : "linear-gradient(135deg, #25D366, #128C7E)",
          border: "none", color: "#fff",
          boxShadow: "0 4px 14px rgba(37,211,102,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          opacity: sdkLoaded ? 1 : 0.6,
          transition: "all 0.2s",
        }}>
          <span style={{ fontSize: 18 }}>💬</span>
          {loading ? "Verbinde..." : "WhatsApp verbinden"}
        </button>

        {!sdkLoaded && !error && (
          <div style={{ fontSize: 10, color: "rgba(167,177,195,0.25)", textAlign: "center", marginTop: 8 }}>
            Meta SDK wird geladen...
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 8,
            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)",
            fontSize: 12, color: "#ef4444",
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Manual Setup Fallback */}
      <div style={{ textAlign: "center" }}>
        <button onClick={() => setShowManual(!showManual)} style={{
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
          fontSize: 11, fontWeight: 600, color: "rgba(167,177,195,0.3)",
          display: "flex", alignItems: "center", gap: 4, margin: "0 auto",
        }}>
          {showManual ? (t("close") || "Close") : ({ de: "Manuelle Einrichtung", en: "Manual setup", tr: "Manuel kurulum" }[localStorage.getItem("fm_lang") || "de"] || "Manual setup")} <span style={{ fontSize: 8 }}>{showManual ? "▲" : "▼"}</span>
        </button>

        {showManual && (
          <div style={{
            marginTop: 12, padding: 16, borderRadius: 10, textAlign: "left",
            background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)",
          }}>
            <div style={{ fontSize: 11, color: "rgba(167,177,195,0.35)", lineHeight: 1.6 }}>
              Falls der automatische Prozess nicht funktioniert, können Sie WhatsApp auch manuell einrichten:
              <br/><br/>
              1. Meta Business Account erstellen unter <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: "#4cc9ff" }}>business.facebook.com</a><br/>
              2. Unternehmen verifizieren lassen<br/>
              3. Flowmatix als Partner einladen (Business ID: FLOWMATIX_PARTNER_ID)<br/>
              <br/>
              Bei Fragen kontaktieren Sie unser Support-Team.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
