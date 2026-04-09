import { useEffect } from "react";
import * as fmApi from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { useClinicStore } from "../stores/clinicStore";
import { useUiStore } from "../stores/uiStore";
import { usePatientStore } from "../stores/patientStore";
import { useAppointmentStore } from "../stores/appointmentStore";
import { useInboxStore } from "../stores/inboxStore";
import { useBillingStore } from "../stores/billingStore";

const IS_CLIENT_MODE = window.location.hostname === "crm.flowmatix.io" || window.location.hostname === "localhost";

export function useAuth({ setView, setTourStep, setTourActive, showToast, enrichDemoData }) {
  const {
    user, setUser, authLoading, setAuthLoading,
    loginEmail, setLoginEmail, loginPass, setLoginPass,
    loginErr, setLoginErr, loginMode, setLoginMode,
    showPass, setShowPass, loginLang, setLoginLang,
    mfaToken, setMfaToken, mfaCode, setMfaCode,
    mfaSetupData, setMfaSetupData,
    authCallbackMode, setAuthCallbackMode,
    authCallbackErr, setAuthCallbackErr,
    newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    resetEmail, setResetEmail, showResetForm, setShowResetForm,
  } = useAuthStore();

  const {
    setClinics, setAdminClinic, setSettingsData, setAiConfigData,
  } = useClinicStore();

  const { setLang } = useUiStore();

  const handleLogout = async () => {
    try { await fmApi.logout(); } catch (e) {}
    fmApi.clearTokens();
    sessionStorage.removeItem('fm_impersonation');
    // Reset ALL auth state
    setUser(null);
    setLoginEmail("");
    setLoginPass("");
    setMfaToken(null);
    setMfaCode("");
    setMfaSetupData(null);
    setLoginMode("password");
    setAuthCallbackMode(null);
    setNewPassword("");
    setConfirmPassword("");
    // Reset ALL data stores — prevent stale data on next login
    setSettingsData(null);
    setAiConfigData(null);
    setClinics([]);
    setAdminClinic(null);
    usePatientStore.getState().setLeads([]);
    useAppointmentStore.getState().setAppts([]);
    useInboxStore.getState().setMsgs({});
    useBillingStore.getState().setInvoices([]);
  };

  /* ═══ MAGIC LINK — handle /magic-link?token=...&email=... ═══ */
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    if ((path === '/magic-link' || path === '/magic-link/') && token && email) {
      (async () => {
        try {
          setAuthLoading(true);
          const res = await fmApi.apiFetch('/api/v1/auth/magic-link/verify', {
            method: 'POST',
            body: JSON.stringify({ token, email }),
          });
          if (res?.accessToken && res?.refreshToken) {
            fmApi.setTokens(res.accessToken, res.refreshToken);
            if (res.user) sessionStorage.setItem('fm_api_user', JSON.stringify(res.user));
            sessionStorage.setItem('fm_login_at', String(Date.now()));
            sessionStorage.setItem('fm_show_pw_change', '1');
            window.history.replaceState(null, '', '/dashboard');
            window.location.reload();
          } else {
            setAuthLoading(false);
            setLoginErr('Magic Link ungueltig oder abgelaufen.');
            window.history.replaceState(null, '', '/');
          }
        } catch (e) {
          setAuthLoading(false);
          setLoginErr('Magic Link ungueltig oder abgelaufen.');
          window.history.replaceState(null, '', '/');
        }
      })();
      return;
    }
  }, []);

  /* ═══ TRIAL AUTH — handle redirect from homepage signup ═══ */
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#trial-auth=')) {
      try {
        const encoded = hash.replace('#trial-auth=', '');
        const decoded = atob(encoded);
        const params = new URLSearchParams(decoded);
        const access = params.get('access');
        const refresh = params.get('refresh');
        const userData = params.get('user');
        if (access && refresh) {
          fmApi.setTokens(access, refresh);
          if (userData) sessionStorage.setItem('fm_api_user', userData);
          sessionStorage.setItem('fm_login_at', String(Date.now()));
          // Set CRM language from signup — localStorage AND Zustand state
          const lang = params.get('lang');
          if (lang && ['de', 'en', 'tr'].includes(lang)) {
            localStorage.setItem('fm_lang', lang);
            setLang(lang);
            setLoginLang(lang);
          }
          // Fresh signup → clear any stale localStorage flags from a
          // previous test session in this browser. The dashboard's
          // setup card and performance indicator both read these
          // fm_setup_done_* keys; if we don't wipe them, a new clinic
          // sees old green checkmarks from a previous user's progress.
          try {
            const keysToClear = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('fm_setup_done_') || k === 'fm_demo_tour_seen' || k === 'fm_advanced_setup_expanded')) {
                keysToClear.push(k);
              }
            }
            keysToClear.forEach((k) => localStorage.removeItem(k));
          } catch {}
        }
      } catch (e) { console.warn('[trial-auth] Failed to parse:', e); }
      // Clean URL hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  /* ═══ IMPERSONATION — handle #impersonate=TOKEN or ?impersonate_token=TOKEN ═══ */
  useEffect(() => {
    let token = null;
    // Method 1: Hash fragment (from operator CRM)
    const hash = window.location.hash;
    if (hash.startsWith('#impersonate=')) {
      token = decodeURIComponent(hash.replace('#impersonate=', ''));
      // If it looks base64-encoded (old format), try to decode
      if (token && !token.startsWith('eyJ')) {
        try { const d = atob(token); const p = new URLSearchParams(d); token = p.get('access') || token; } catch {}
      }
    }
    // Method 2: Query param
    if (!token) {
      const params = new URLSearchParams(window.location.search);
      token = params.get('impersonate_token');
    }
    if (token) {
      fmApi.setTokens(token, token);
      sessionStorage.setItem('fm_impersonation', 'true');
      sessionStorage.setItem('fm_login_at', String(Date.now()));
      // Save impersonation info for banner before clearing hash
      const rawHash = window.location.hash;
      if (rawHash.startsWith('#impersonate=')) {
        try {
          const decoded = atob(rawHash.replace('#impersonate=', ''));
          const p = new URLSearchParams(decoded);
          sessionStorage.setItem('fm_impersonation_info', JSON.stringify({
            user: p.get('user'),
            org: p.get('org'),
            reason: decodeURIComponent(p.get('reason') || ''),
          }));
        } catch {}
      }
      // Clean URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  /* ═══ SESSION RESTORE — API-only ═══ */
  useEffect(() => {
    const onSessionExpired = () => { fmApi.clearTokens(); setUser(null); setAuthLoading(false); };
    window.addEventListener("fm:session-expired", onSessionExpired);
    if (!fmApi.isAuthenticated()) {
      setAuthLoading(false);
      return () => window.removeEventListener("fm:session-expired", onSessionExpired);
    }
    /* Token exists — validate with getMe() */
    fmApi.getMe().then(async (me) => {
      const u = me.user || me;
      const isOp = u.role === "platform_owner" || u.role === "admin";
      const orgId = (IS_CLIENT_MODE || !isOp) ? (u.organizationId || u.organization_id || null) : null;
      const _isImp = sessionStorage.getItem('fm_impersonation') === 'true';
      setUser({ email: u.email, role: u.role, clinicId: orgId, name: u.name || u.email.split("@")[0], apiUser: true, apiRole: u.role, orgId: u.organizationId || u.organization_id });
      if (isOp && !IS_CLIENT_MODE && !_isImp) setView("operator");
      if (orgId) {
        try {
          const res = await fmApi.getMyClinic();
          if (res?.clinic) {
            const cd = res.clinic;
            const c = { ...cd, plan: cd.plan || "core", status: cd.status || "active", type: cd.type, setupStatus: (cd.onboarding_completed || cd.onboarded_at) ? "live" : (cd.setup_status || "new"), onboarded: cd.onboarded_at, lastLogin: new Date().toISOString(), stats: cd.stats || { leadsMonth: 0, bookingsMonth: 0, convRate: 0, aiHandled: 0, activeConvs: 0, avgResponse: "—" }, notifications: [], billing: cd.billing || null, cancelled_at: cd.cancelled_at || null, clinicEmail: cd.clinicEmail || cd.email, drivers: cd.drivers || [], logisticsConfig: cd.logisticsConfig || {} };
            setClinics(prev => { const exists = prev.find(x => x.id === c.id); return exists ? prev.map(x => x.id === c.id ? { ...x, ...c } : x) : [...prev, c]; });
            setAdminClinic(orgId);
            /* Deposit settings already loaded via getMyClinic() above */
            /* Load automations from API */
            try {
              const aRes = await fmApi.getAutomations();
              if (aRes?.automations?.length) {
                setClinics(prev => prev.map(cx => cx.id === orgId ? { ...cx, automations: aRes.automations.map(a => ({ id: a.id, name: a.name, type: a.type, trigger: a.trigger, action: a.action, active: a.active !== false, runs: a.runs || 0, lastRun: a.lastRun || null, locked: a.locked || false, min_plan: a.min_plan || 'core', n8n_synced: a.n8n_synced || false, n8n_workflow_id: a.n8n_workflow_id || null })) } : cx));
              }
            } catch (e) {}
            if (cd.locale && !localStorage.getItem("fm_lang")) { setLang(cd.locale); setLoginLang(cd.locale); }
          }
        } catch (e) {}
      }
      setAuthLoading(false);
    }).catch(() => {
      fmApi.clearTokens();
      setAuthLoading(false);
    });
    return () => window.removeEventListener("fm:session-expired", onSessionExpired);
  }, []);

  /* ═══ 8-HOUR SESSION TIMEOUT (production only) ═══ */
  useEffect(() => {
    const h = window.location.hostname;
    const isProd = h === "app.flowmatix.io" || h === "crm.flowmatix.io";
    if (!isProd || !user) return;
    const MAX_SESSION = 8 * 60 * 60 * 1000;
    const loginTime = sessionStorage.getItem("fm_login_at");
    if (!loginTime) { sessionStorage.setItem("fm_login_at", String(Date.now())); }
    else if (Date.now() - Number(loginTime) > MAX_SESSION) {
      sessionStorage.removeItem("fm_login_at"); handleLogout(); return;
    }
    const timer = setInterval(() => {
      const t = sessionStorage.getItem("fm_login_at");
      if (t && Date.now() - Number(t) > MAX_SESSION) { sessionStorage.removeItem("fm_login_at"); handleLogout(); }
    }, 60000);
    return () => clearInterval(timer);
  }, [user]);

  /* ═══ MFA ENROLLMENT (enforced) — auto-fetch QR when entering mfa-setup mode ═══ */
  useEffect(() => {
    if (loginMode !== "mfa-setup" || !mfaToken || mfaSetupData) return;
    (async () => {
      try {
        const res = await fmApi.enrollMfaWithToken(mfaToken);
        if (res?.otpauthUri && res?.secret) {
          setMfaSetupData({ otpauthUri: res.otpauthUri, secret: res.secret, email: res.email || "" });
        } else {
          setLoginErr("Could not start 2FA setup. Please log in again.");
          setLoginMode("password");
          setMfaToken(null);
        }
      } catch (e) {
        setLoginErr(e.message || "Could not start 2FA setup. Please log in again.");
        setLoginMode("password");
        setMfaToken(null);
      }
    })();
  }, [loginMode, mfaToken, mfaSetupData]);

  const handleMfaSetupConfirm = async () => {
    if (!mfaCode || mfaCode.length !== 6) { setLoginErr("Enter a valid 6-digit code"); return; }
    if (!mfaToken) { setLoginErr("Setup token expired. Please log in again."); return; }
    setLoginErr(""); setAuthLoading(true);
    try {
      const res = await fmApi.confirmMfaWithToken(mfaToken, mfaCode);
      if (res?.user) {
        const u = res.user;
        const isOp = u.role === "platform_owner" || u.role === "admin";
        const orgId = (IS_CLIENT_MODE || !isOp) ? (u.organizationId || null) : null;
        setUser({ email: u.email, role: u.role, clinicId: orgId, name: u.name || u.email.split("@")[0], apiUser: true, apiRole: u.role, orgId: u.organizationId });
        setMfaToken(null); setMfaCode(""); setMfaSetupData(null); setLoginMode("password");
        if (isOp && !IS_CLIENT_MODE) setView("operator");
        if (orgId) {
          try {
            const cRes = await fmApi.getMyClinic();
            if (cRes?.clinic) {
              const cd = cRes.clinic;
              const c = { ...cd, plan: cd.plan || "core", status: cd.status || "active", type: cd.type, setupStatus: (cd.onboarding_completed || cd.onboarded_at) ? "live" : (cd.setup_status || "new"), onboarded: cd.onboarded_at, lastLogin: new Date().toISOString(), stats: cd.stats || { leadsMonth: 0, bookingsMonth: 0, convRate: 0, aiHandled: 0, activeConvs: 0, avgResponse: "—" }, notifications: [], billing: cd.billing || null, cancelled_at: cd.cancelled_at || null, clinicEmail: cd.clinicEmail || cd.email, drivers: cd.drivers || [], logisticsConfig: cd.logisticsConfig || {} };
              setClinics(prev => { const exists = prev.find(x => x.id === c.id); return exists ? prev.map(x => x.id === c.id ? { ...x, ...c } : x) : [...prev, c]; });
              setAdminClinic(orgId);
              try {
                const aRes2 = await fmApi.getAutomations();
                if (aRes2?.automations?.length) {
                  setClinics(prev => prev.map(cx => cx.id === orgId ? { ...cx, automations: aRes2.automations.map(a => ({ id: a.id, name: a.name, type: a.type, trigger: a.trigger, action: a.action, active: a.active !== false, runs: a.runs || 0, lastRun: a.lastRun || null, locked: a.locked || false, min_plan: a.min_plan || "core", n8n_synced: a.n8n_synced || false, n8n_workflow_id: a.n8n_workflow_id || null })) } : cx));
                }
              } catch (e) {}
            }
          } catch (e) {}
        }
        setLang(loginLang); setAuthLoading(false); return;
      }
    } catch (e) {
      setLoginErr(e.message || "Invalid 2FA code");
    }
    setAuthLoading(false);
  };

  const handleMfaLogin = async () => {
    if (!mfaCode || mfaCode.length !== 6) { setLoginErr("Enter a valid 6-digit code"); return; }
    setLoginErr(""); setAuthLoading(true);
    try {
      const res = await fmApi.loginMfa(mfaToken, mfaCode);
      if (res?.user) {
        const u = res.user;
        const isOp = u.role === "platform_owner" || u.role === "admin";
        const orgId = (IS_CLIENT_MODE || !isOp) ? (u.organizationId || null) : null;
        setUser({ email: u.email, role: u.role, clinicId: orgId, name: u.name || u.email.split("@")[0], apiUser: true, apiRole: u.role, orgId: u.organizationId });
        setMfaToken(null); setMfaCode(""); setLoginMode("password");
        if (isOp && !IS_CLIENT_MODE) setView("operator");
        if (orgId) {
          try {
            const cRes = await fmApi.getMyClinic();
            if (cRes?.clinic) {
              const cd = cRes.clinic;
              const c = { ...cd, plan: cd.plan || "core", status: cd.status || "active", type: cd.type, setupStatus: (cd.onboarding_completed || cd.onboarded_at) ? "live" : (cd.setup_status || "new"), onboarded: cd.onboarded_at, lastLogin: new Date().toISOString(), stats: cd.stats || { leadsMonth: 0, bookingsMonth: 0, convRate: 0, aiHandled: 0, activeConvs: 0, avgResponse: "—" }, notifications: [], billing: cd.billing || null, cancelled_at: cd.cancelled_at || null, clinicEmail: cd.clinicEmail || cd.email, drivers: cd.drivers || [], logisticsConfig: cd.logisticsConfig || {} };
              setClinics(prev => { const exists = prev.find(x => x.id === c.id); return exists ? prev.map(x => x.id === c.id ? { ...x, ...c } : x) : [...prev, c]; });
              setAdminClinic(orgId);
              try {
                const aRes2 = await fmApi.getAutomations();
                if (aRes2?.automations?.length) {
                  setClinics(prev => prev.map(cx => cx.id === orgId ? { ...cx, automations: aRes2.automations.map(a => ({ id: a.id, name: a.name, type: a.type, trigger: a.trigger, action: a.action, active: a.active !== false, runs: a.runs || 0, lastRun: a.lastRun || null, locked: a.locked || false, min_plan: a.min_plan || "core", n8n_synced: a.n8n_synced || false, n8n_workflow_id: a.n8n_workflow_id || null })) } : cx));
                }
              } catch (e) {}
            }
          } catch (e) {}
        }
        setLang(loginLang); setAuthLoading(false); return;
      }
    } catch (e) {
      setLoginErr(e.message || "Invalid 2FA code");
    }
    setAuthLoading(false);
  };

  const handleLogin = async () => {
    setLoginErr(""); setAuthLoading(true);
    try {
      const res = await fmApi.login(loginEmail, loginPass);
      // MFA required — switch to MFA code entry
      if (res?.requiresMfa && res?.mfaToken) {
        setMfaToken(res.mfaToken);
        setLoginMode("mfa");
        setAuthLoading(false);
        return;
      }
      // MFA enforcement: org requires 2FA for this role and user has none yet
      // → switch to enrollment screen with QR code
      if (res?.requiresMfaSetup && res?.setupToken) {
        setMfaToken(res.setupToken);
        setLoginMode("mfa-setup");
        setAuthLoading(false);
        return;
      }
      if (res?.user) {
        const u = res.user;
        const isOp = u.role === "platform_owner" || u.role === "admin";
        const orgId = (IS_CLIENT_MODE || !isOp) ? (u.organizationId || null) : null;
        setUser({ email: u.email, role: u.role, clinicId: orgId, name: u.name || u.email.split("@")[0], apiUser: true, apiRole: u.role, orgId: u.organizationId });
        if (isOp && !IS_CLIENT_MODE) setView("operator");
        if (orgId) {
          try {
            const res = await fmApi.getMyClinic();
            if (res?.clinic) {
              const cd = res.clinic;
              const c = { ...cd, plan: cd.plan || "core", status: cd.status || "active", type: cd.type, setupStatus: (cd.onboarding_completed || cd.onboarded_at) ? "live" : (cd.setup_status || "new"), onboarded: cd.onboarded_at, lastLogin: new Date().toISOString(), stats: cd.stats || { leadsMonth: 0, bookingsMonth: 0, convRate: 0, aiHandled: 0, activeConvs: 0, avgResponse: "—" }, notifications: [], billing: cd.billing || null, cancelled_at: cd.cancelled_at || null, clinicEmail: cd.clinicEmail || cd.email, drivers: cd.drivers || [], logisticsConfig: cd.logisticsConfig || {} };
              setClinics(prev => { const exists = prev.find(x => x.id === c.id); return exists ? prev.map(x => x.id === c.id ? { ...x, ...c } : x) : [...prev, c]; });
              setAdminClinic(orgId);
              /* Load automations */
              try {
                const aRes2 = await fmApi.getAutomations();
                if (aRes2?.automations?.length) {
                  setClinics(prev => prev.map(cx => cx.id === orgId ? { ...cx, automations: aRes2.automations.map(a => ({ id: a.id, name: a.name, type: a.type, trigger: a.trigger, action: a.action, active: a.active !== false, runs: a.runs || 0, lastRun: a.lastRun || null, locked: a.locked || false, min_plan: a.min_plan || "core", n8n_synced: a.n8n_synced || false, n8n_workflow_id: a.n8n_workflow_id || null })) } : cx));
                }
              } catch (e) {}
              /* Deposit settings already loaded via getMyClinic() above — no second fetch needed */
              /* REMOVED 2026-04-07: First-login demo seeding flipped demo_mode_enabled
                 to true on every brand-new clinic, which silently blocked the bot from
                 sending real WhatsApp replies during the trial. Customer flow is now
                 only Trial → Live, no auto demo seeding. The marketing tour
                 (AutoDemoPlayer) is still available via the dashboard button. */
            }
          } catch (e) {}
        }
        setLang(loginLang); setAuthLoading(false); return;
      }
    } catch (e) { /* API login failed */ }
    setLoginErr("Invalid credentials. Contact admin."); setAuthLoading(false);
  };

  /* ═══ MAGIC LINK LOGIN ═══ */
  const handleMagicLink = async () => {
    if (!loginEmail.trim()) { setLoginErr("Please enter your email."); return; }
    setLoginErr(""); setAuthLoading(true);
    try {
      await fmApi.requestMagicLink(loginEmail.trim().toLowerCase());
      setAuthLoading(false);
      setLoginMode("sent");
    } catch (e) { setAuthLoading(false); setLoginErr("Could not send magic link. Check your connection."); }
  };

  /* ═══ FORGOT PASSWORD ═══ */
  const handleForgotPw = async () => {
    const email = (resetEmail || loginEmail).trim().toLowerCase();
    if (!email) { setLoginErr("Enter your email first."); return; }
    setLoginErr(""); setAuthLoading(true);
    try {
      await fmApi.requestPasswordReset(email);
      setAuthLoading(false);
      setLoginMode("sent");
    } catch (e) { setAuthLoading(false); setLoginErr("Could not send reset link."); }
  };

  /* ═══ SET NEW PASSWORD (Recovery callback) ═══ */
  const handleSetPassword = async () => {
    if (newPassword.length < 8) { setAuthCallbackErr("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setAuthCallbackErr("Passwords do not match"); return; }
    setAuthCallbackErr(""); setAuthLoading(true);
    try {
      await fmApi.updatePassword(newPassword);
      setAuthLoading(false);
      window.history.replaceState(null, "", "/");
      setAuthCallbackMode(null);
      setNewPassword(""); setConfirmPassword("");
      showToast("Password set successfully!");
    } catch (e) { setAuthLoading(false); setAuthCallbackErr(e.message || "Could not update password."); }
  };

  /* MFA Login — verify TOTP code after password was accepted */
  const handleMfaLogin = async () => {
    if (!mfaCode || mfaCode.length !== 6) { setLoginErr("Enter 6-digit code"); return; }
    setAuthLoading(true); setLoginErr("");
    try {
      const res = await fmApi.apiFetch('/api/v1/auth/mfa/login', {
        method: 'POST',
        body: JSON.stringify({ mfaToken, code: mfaCode }),
      });
      if (res?.accessToken && res?.refreshToken) {
        fmApi.setTokens(res.accessToken, res.refreshToken);
        if (res.user) sessionStorage.setItem('fm_api_user', JSON.stringify(res.user));
        sessionStorage.setItem('fm_login_at', String(Date.now()));
        window.location.reload();
      } else {
        setLoginErr("Invalid code"); setAuthLoading(false);
      }
    } catch (e) {
      setLoginErr(e.message || "Invalid code"); setAuthLoading(false);
    }
  };

  /* MFA Setup Confirm — during enforced enrollment */
  const handleMfaSetupConfirm = async () => {};

  /* Password reset via API */
  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) { showToast("Enter email address"); return; }
    try {
      await fmApi.requestPasswordReset(resetEmail.trim().toLowerCase());
      showToast("Password reset email sent!"); setShowResetForm(false); setResetEmail("");
    } catch (e) { showToast("Error: " + (e.message || "Could not send reset email")); }
  };

  return {
    user, setUser, authLoading, setAuthLoading,
    loginEmail, setLoginEmail, loginPass, setLoginPass,
    loginErr, setLoginErr, loginMode, setLoginMode,
    showPass, setShowPass, loginLang, setLoginLang,
    mfaToken, setMfaToken, mfaCode, setMfaCode,
    mfaSetupData, setMfaSetupData,
    authCallbackMode, setAuthCallbackMode,
    authCallbackErr, setAuthCallbackErr,
    newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    resetEmail, setResetEmail, showResetForm, setShowResetForm,
    handleLogin, handleMfaLogin, handleMfaSetupConfirm,
    handleMagicLink, handleForgotPw, handleSetPassword,
    handlePasswordReset, handleLogout,
  };
}
