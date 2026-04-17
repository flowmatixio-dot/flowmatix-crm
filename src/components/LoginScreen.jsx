import React from "react";
import { AUTH_BG } from "../../src/data/constants";
import { T } from "../../src/data/i18n";

const IS_CLIENT_MODE = window.location.hostname === "crm.flowmatix.io" || window.location.hostname === "localhost";

export default function LoginScreen({
  authCallbackMode, authCallbackErr, setAuthCallbackMode,
  authLoading, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
  handleSetPassword,
  loginEmail, setLoginEmail, loginPass, setLoginPass,
  loginErr, loginMode, setLoginMode, showPass, setShowPass,
  loginLang, setLoginLang,
  handleLogin, handleMagicLink, handleForgotPw,
}) {
  const tl = (key) => (T[loginLang] || T.en)[key] || T.en[key] || key;

  /* ═══ AUTH CALLBACK SCREENS ═══ */
  if (authCallbackMode === "processing") return (
    <div style={{ minHeight: "100vh", background: AUTH_BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#e8eefc" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{ width: 56, height: 56, borderRadius: 16, objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", marginBottom: 20 }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>{tl("signing_you_in")}</h1>
        <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: 0 }}>{tl("please_wait_verify")}</p>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(76,201,255,0.2)", borderTopColor: "#4cc9ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "24px auto 0" }} />
      </div>
    </div>
  );
  if (authCallbackMode === "recovery") return (
    <div style={{ minHeight: "100vh", background: AUTH_BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#e8eefc" }}>
      <div style={{ maxWidth: 400, width: "90vw", textAlign: "center" }}>
        <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{ width: 56, height: 56, borderRadius: 16, objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", marginBottom: 20 }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>{tl("set_new_password")}</h1>
        <p style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", margin: "0 0 24px" }}>{tl("choose_strong_password")}</p>
        {authCallbackErr && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 16, color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{authCallbackErr}</div>}
        <div style={{ textAlign: "left", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(76,201,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tl("new_password_label")}</div>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={tl("at_least_8_chars")} style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(76,201,255,0.15)", color: "#fff", fontFamily: "inherit", fontSize: 15, outline: "none", boxSizing: "border-box" }} autoFocus />
        </div>
        <div style={{ textAlign: "left", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(76,201,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tl("confirm_password_label")}</div>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={tl("repeat_password")} onKeyDown={e => { if (e.key === "Enter") handleSetPassword(); }} style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(76,201,255,0.15)", color: "#fff", fontFamily: "inherit", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={handleSetPassword} disabled={authLoading} style={{ width: "100%", padding: 16, borderRadius: 14, background: "linear-gradient(135deg,#00B4D8,#0096c7)", border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,180,216,0.15)" }}>{authLoading ? tl("saving") : tl("set_password_continue")}</button>
      </div>
    </div>
  );
  if (authCallbackMode === "error") return (
    <div style={{ minHeight: "100vh", background: AUTH_BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: "#e8eefc" }}>
      <div style={{ maxWidth: 400, width: "90vw", textAlign: "center" }}>
        <img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{ width: 56, height: 56, borderRadius: 16, objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", marginBottom: 20 }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>{tl("auth_failed")}</h1>
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 16, color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{authCallbackErr || tl("link_expired_hint")}</div>
        <button onClick={() => { window.history.replaceState(null, "", "/"); setAuthCallbackMode(null); }} style={{ width: "100%", padding: 16, borderRadius: 14, background: "linear-gradient(135deg,#00B4D8,#0096c7)", border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,180,216,0.15)" }}>{tl("back_to_login")}</button>
        <p style={{ fontSize: 12, color: "rgba(167,177,195,0.6)", marginTop: 16 }}>{tl("need_help_email")} <a href="mailto:info@flowmatix.io" style={{ color: "#4cc9ff" }}>info@flowmatix.io</a></p>
      </div>
    </div>
  );

  /* ======== LOADING ======== */
  if (authLoading) return <div style={{ minHeight: "100vh", background: AUTH_BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}><div style={{ textAlign: "center" }}><img src="/Flowmatix-Logo.png" alt="Flowmatix" style={{ width: 56, height: 56, borderRadius: 16, objectFit: "cover", marginBottom: 16 }} /><div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "0.12em", background: "linear-gradient(135deg,#fff,rgba(76,201,255,.7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 16 }}>FLOWMATIX</div><div style={{ fontSize: 14, color: "rgba(167,177,195,0.7)" }}>{({de:"Laden...",en:"Loading...",tr:"Yükleniyor..."}[localStorage.getItem("fm_lang")||"de"]||"Laden...")}</div></div></div>;

  /* ======== LOGIN FORM ======== */
  return (
    <div style={{ minHeight: "100vh", background: AUTH_BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", position: "relative" }}>
      {/* Logo — text only, no image, no flags */}
      <div style={{ textAlign: "center", marginBottom: 36, position: "relative", zIndex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: "0.1em" }}><span style={{ background: "linear-gradient(135deg,#fff 30%,#ff8a2a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FLOWMATIX</span></div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", color: "rgba(255,138,42,0.4)", marginTop: 6 }}>CONTROL CENTER</div>
      </div>
      {/* Card */}
      <div style={{ width: 420, padding: "36px 40px", borderRadius: 20, background: "#162032", border: "1px solid rgba(255,255,255,0.08)", position: "relative", zIndex: 1, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>

        {/* ═══ MODE: SENT — Check your email ═══ */}
        {loginMode === "sent" ? <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📧</div>
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6, color: "#fff" }}>{tl("check_email")}</div>
          <div style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", marginBottom: 20 }}>{tl("magic_link_sent")} <strong style={{ color: "#fff" }}>{loginEmail}</strong></div>
          <div style={{ padding: 14, borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 14, fontSize: 13, color: "rgba(167,177,195,0.6)" }}>{tl("magic_link_instructions")}</div>
          <div style={{ padding: 10, borderRadius: 10, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)", marginBottom: 20, fontSize: 12, color: "rgba(251,191,36,0.7)" }}>💡 {tl("magic_link_device_hint")}</div>
          <button onClick={() => { setLoginMode("password"); setLoginErr(""); }} style={{ background: "none", border: "none", color: "#4cc9ff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>← {tl("back_to_login")}</button>
        </div> : <>

        {/* ═══ HEADER ═══ */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 6 }}>{loginMode === "forgot" ? tl("reset_password") : tl("welcome_back")}</div>
          <div style={{ fontSize: 14, color: "rgba(167,177,195,0.6)" }}>{loginMode === "forgot" ? tl("enter_email_address") : tl("access_dashboard")}</div>
        </div>

        {/* Error */}
        {loginErr && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 15 }}>⚠</span><span style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{loginErr}</span></div>}

        {/* Email */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(76,201,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{(T[loginLang] || T.en).email_address}</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "rgba(167,177,195,0.75)" }}>✉</span>
            <input id="loginEmail" name="loginEmail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@clinic.com" onKeyDown={e => { if (e.key === "Enter") { if (loginMode === "magic") handleMagicLink(); else if (loginMode === "password") handleLogin(); else if (loginMode === "forgot") handleForgotPw(); } }} style={{ width: "100%", padding: "14px 16px 14px 40px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${loginErr && !loginEmail ? "rgba(239,68,68,0.4)" : "rgba(76,201,255,0.15)"}`, color: "#fff", fontFamily: "inherit", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border .2s" }} autoFocus />
          </div>
        </div>

        {/* Password */}
        {loginMode === "password" && <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(76,201,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{(T[loginLang] || T.en).password}</div>
            <button onClick={() => { setLoginMode("forgot"); setLoginErr(""); }} style={{ background: "none", border: "none", color: "rgba(167,177,195,0.7)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, padding: 0 }}>{(T[loginLang] || T.en).forgot}</button>
          </div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "rgba(167,177,195,0.75)" }}>🔒</span>
            <input id="loginPass" name="loginPass" type={showPass ? "text" : "password"} value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} style={{ width: "100%", padding: "14px 44px 14px 40px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(76,201,255,0.15)", color: "#fff", fontFamily: "inherit", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "rgba(167,177,195,0.6)", padding: 4 }}>{showPass ? "🙈" : "👁"}</button>
          </div>
        </div>}

        {/* ═══ PRIMARY ACTIONS ═══ */}
        {loginMode === "magic" && <button onClick={handleMagicLink} disabled={authLoading} style={{ width: "100%", padding: 16, borderRadius: 14, background: "linear-gradient(135deg,#00B4D8,#0096c7)", border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,180,216,0.15)", marginBottom: 10 }}>{authLoading ? tl("sending") : tl("send_magic_link") + " ✉"}</button>}
        {loginMode === "password" && <button onClick={handleLogin} disabled={authLoading} style={{ width: "100%", padding: 16, borderRadius: 14, background: "linear-gradient(135deg,rgba(76,201,255,.18),rgba(45,168,255,.12))", border: "1px solid rgba(76,201,255,.3)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg,rgba(76,201,255,.28),rgba(45,168,255,.2))"} onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg,rgba(76,201,255,.18),rgba(45,168,255,.12))"}>{authLoading ? tl("signing_in") : tl("sign_in")} {!authLoading && <span style={{ fontSize: 18 }}>→</span>}</button>}
        {loginMode === "forgot" && <button onClick={handleForgotPw} disabled={authLoading} style={{ width: "100%", padding: 16, borderRadius: 14, background: "linear-gradient(135deg,#00B4D8,#0096c7)", border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,180,216,0.15)" }}>{authLoading ? tl("sending") : tl("send_reset_link")}</button>}

        {/* ═══ MODE SWITCHER ═══ */}
        <div style={{ textAlign: "center", marginTop: 14 }}>
          {loginMode === "magic" && <button onClick={() => { setLoginMode("password"); setLoginErr(""); }} style={{ background: "none", border: "none", color: "rgba(167,177,195,0.7)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>{tl("sign_in_password_mode")}</button>}
          {loginMode === "password" && <button onClick={() => { setLoginMode("magic"); setLoginErr(""); }} style={{ background: "none", border: "none", color: "rgba(167,177,195,0.7)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>{tl("sign_in_magic_mode")}</button>}
          {loginMode === "forgot" && <button onClick={() => { setLoginMode("password"); setLoginErr(""); }} style={{ background: "none", border: "none", color: "#4cc9ff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>← {tl("back_to_login")}</button>}
        </div>

        </>}
      </div>
      {/* Trust badges */}
      <div style={{ display: "flex", gap: 16, marginTop: 28, position: "relative", zIndex: 1 }}>
        {[{ icon: "🔒", key: "trust_e2e" }, { icon: "🛡", key: "trust_hipaa" }, { icon: "⏱", key: "trust_uptime" }].map((b, i) =>
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "rgba(167,177,195,0.7)", fontWeight: 600 }}><span style={{ fontSize: 13 }}>{b.icon}</span>{(T[loginLang] || T.en)[b.key]}</div>
        )}
      </div>
      {/* Footer */}
      <div style={{ marginTop: 24, display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
        {[{ key: "footer_privacy", fb: "Privacy" }, { key: "footer_terms", fb: "Terms" }, { key: "footer_imprint", fb: "Imprint" }].map((l, i) =>
          <span key={i} style={{ fontSize: 12, color: "rgba(167,177,195,0.75)", cursor: "pointer", fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.color = "rgba(167,177,195,0.6)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(167,177,195,0.75)"}>{(T[loginLang] || T.en)[l.key] || l.fb}</span>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "rgba(167,177,195,0.65)", position: "relative", zIndex: 1 }}>© 2026 Flowmatix</div>
      <div style={{ marginTop: 12, fontSize: 12, color: "rgba(167,177,195,0.6)", position: "relative", zIndex: 1, textAlign: "center", maxWidth: 400 }}>{tl("accounts_created")} <a href="https://flowmatix.io" style={{ color: "rgba(76,201,255,0.4)" }}>flowmatix.io</a></div>
    </div>
  );
}
