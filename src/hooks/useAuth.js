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
    // Reset ALL auth state
    setUser(null);
    setLoginEmail("");
    setLoginPass("");
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
          // Set CRM language from signup
          const lang = params.get('lang');
          if (lang && ['de', 'en', 'tr'].includes(lang)) {
            localStorage.setItem('fm_lang', lang);
          }
        }
      } catch (e) { console.warn('[trial-auth] Failed to parse:', e); }
      // Clean URL hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
      setUser({ email: u.email, role: u.role, clinicId: orgId, name: u.name || u.email.split("@")[0], apiUser: true, apiRole: u.role, orgId: u.organizationId || u.organization_id });
      if (isOp && !IS_CLIENT_MODE) setView("operator");
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

  const handleLogin = async () => {
    setLoginErr(""); setAuthLoading(true);
    try {
      const res = await fmApi.login(loginEmail, loginPass);
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
              /* First login → demo mode (only once, not on every login) */
              const demoSeeded = localStorage.getItem("fm_demo_seeded_" + orgId);
              if (IS_CLIENT_MODE && cd.setup_status === "new" && !cd.onboarding_completed && !cd.onboarded_at && !demoSeeded) {
                try {
                  await fmApi.setClinicMode("demo");
                  await fmApi.resetDemoData();
                  localStorage.setItem("fm_demo_seeded_" + orgId, "true");
                  if (typeof enrichDemoData === "function") {
                    setTimeout(() => enrichDemoData(), 200);
                  }
                  setTimeout(() => { setTourStep(0); setTourActive(true); }, 1500);
                } catch (e) {}
              }
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
    authCallbackMode, setAuthCallbackMode,
    authCallbackErr, setAuthCallbackErr,
    newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    resetEmail, setResetEmail, showResetForm, setShowResetForm,
    handleLogin, handleMagicLink, handleForgotPw, handleSetPassword,
    handlePasswordReset, handleLogout,
  };
}
