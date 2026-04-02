import { create } from 'zustand';
import * as fmApi from '../api/client';

/**
 * Auth Store — user session, login state, session validation.
 * No localStorage persistence for auth state — tokens managed by fmApi.
 */
export const useAuthStore = create((set, get) => ({
  // ── State ──
  user: null,
  authLoading: true,
  loginEmail: '',
  loginPass: '',
  loginErr: '',
  loginMode: 'password', // password | magic | forgot | sent
  showPass: false,
  loginLang: (() => {
    try {
      const p = new URLSearchParams(window.location.search).get('lang');
      if (p && ['en', 'de', 'tr', 'es', 'fr', 'it', 'pt'].includes(p)) return p;
      const s = localStorage.getItem('fm_lang');
      if (s && ['en', 'de', 'tr', 'es', 'fr', 'it', 'pt'].includes(s)) return s;
      return 'en';
    } catch { return 'en'; }
  })(),
  authCallbackMode: null, // null | 'processing' | 'recovery' | 'error'
  authCallbackErr: '',
  newPassword: '',
  confirmPassword: '',
  resetEmail: '',
  showResetForm: false,

  // ── Computed ──
  get isAdmin() { const r = get().user?.apiRole || get().user?.role; return r === 'admin' || r === 'platform_owner' || r === 'clinic_admin'; },
  get isOperator() { return (get().user?.apiRole || get().user?.role) === 'platform_owner'; },

  // ── Actions ──
  setUser: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setLoginEmail: (loginEmail) => set({ loginEmail }),
  setLoginPass: (loginPass) => set({ loginPass }),
  setLoginErr: (loginErr) => set({ loginErr }),
  setLoginMode: (loginMode) => set({ loginMode }),
  setShowPass: (showPass) => set({ showPass }),
  setLoginLang: (loginLang) => set({ loginLang }),
  setAuthCallbackMode: (authCallbackMode) => set({ authCallbackMode }),
  setAuthCallbackErr: (authCallbackErr) => set({ authCallbackErr }),
  setNewPassword: (newPassword) => set({ newPassword }),
  setConfirmPassword: (confirmPassword) => set({ confirmPassword }),
  setResetEmail: (resetEmail) => set({ resetEmail }),
  setShowResetForm: (showResetForm) => set({ showResetForm }),

  /* resolveUser removed — all auth via API JWT (loginApi / restoreSession) */

  /**
   * Login via Flowmatix API (operator accounts).
   */
  loginApi: async (email, password) => {
    set({ loginErr: '', authLoading: true });
    try {
      const res = await fmApi.login(email, password);
      if (res?.user) {
        const u = res.user;
        const isOp = u.role === 'platform_owner' || u.role === 'admin';
        const user = {
          email: u.email,
          role: u.role,
          clinicId: isOp ? null : (u.organizationId || null),
          name: u.name || u.email.split('@')[0],
          apiUser: true,
          apiRole: u.role,
          orgId: u.organizationId,
        };
        set({ user, authLoading: false });
        return { user, isOp };
      }
    } catch {
      // API login failed — caller should try other methods
    }
    set({ authLoading: false });
    return null;
  },

  /**
   * Full logout — clears API tokens.
   */
  logout: async () => {
    try { await fmApi.logout(); } catch {}
    fmApi.clearTokens();
    sessionStorage.removeItem('fm_impersonating');
    set({
      user: null,
      loginEmail: '',
      loginPass: '',
      authCallbackMode: null,
      newPassword: '',
      confirmPassword: '',
    });
  },

  /**
   * Restore session on page load — checks API tokens.
   */
  restoreSession: async () => {
    // ── Impersonation: accept token from URL hash (#impersonate=...) ──
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#impersonate=')) {
        const encoded = hash.replace('#impersonate=', '');
        const decoded = atob(encoded);
        const hashParams = new URLSearchParams(decoded);
        const impToken = hashParams.get('access');
        if (impToken) {
          fmApi.setTokens(impToken, impToken);
          sessionStorage.setItem('fm_impersonating', 'true');
          sessionStorage.setItem('fm_impersonation', 'true');
          // Don't clean hash — banner needs it
          try {
            const me = await fmApi.getMe();
            if (me?.user || me?.email) {
              const u = me.user || me;
              set({
                user: {
                  email: u.email,
                  role: u.role || 'clinic_admin',
                  clinicId: u.organizationId || u.org_id || null,
                  name: u.name || u.email?.split('@')[0] || 'Operator',
                  apiUser: true,
                  apiRole: u.role || 'clinic_admin',
                  orgId: u.organizationId || u.org_id,
                  impersonating: true,
                },
                authLoading: false,
              });
              return;
            }
          } catch { fmApi.clearTokens(); sessionStorage.removeItem('fm_impersonating'); sessionStorage.removeItem('fm_impersonation'); }
        }
      }
    } catch {}

    // ── Normal session restore ──
    if (fmApi.isAuthenticated()) {
      const stored = sessionStorage.getItem('fm_api_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          const isOp = u.role === 'platform_owner' || u.role === 'admin';
          const isImpersonating = sessionStorage.getItem('fm_impersonating') === 'true';
          set({
            user: {
              email: u.email,
              role: u.role,
              clinicId: isOp ? null : (u.organizationId || null),
              name: u.name || u.email.split('@')[0],
              apiUser: true,
              apiRole: u.role,
              orgId: u.organizationId,
              impersonating: isImpersonating,
            },
            authLoading: false,
          });
          return;
        } catch { fmApi.clearTokens(); }
      }
    }
    set({ authLoading: false });
  },
}));
