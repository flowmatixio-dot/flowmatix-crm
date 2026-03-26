import { create } from 'zustand';
import * as fmApi from '../api/client';

/**
 * Clinic Store — clinic settings, AI config, automations, notifications.
 * Fetches from API, no localStorage.
 */
export const useClinicStore = create((set, get) => ({
  // ── State ──
  clinics: [],
  adminClinic: null,
  settingsData: null,
  aiConfigData: null,
  analyticsConfig: null,
  analyticsData: null,
  analyticsLoading: false,
  loading: false,
  error: null,

  // ── Computed (call these as functions) ──
  getActiveClinicId: (isAdmin, userClinicId) => isAdmin ? get().adminClinic : userClinicId,
  getClinic: (clinicId) => get().clinics.find((c) => c.id === clinicId),
  getClinicById: (id) => get().clinics.find((c) => c.id === id),

  // ── Actions ──
  setClinics: (clinics) => set(typeof clinics === 'function' ? (s) => ({ clinics: clinics(s.clinics) }) : { clinics }),
  setAdminClinic: (adminClinic) => set({ adminClinic }),
  setSettingsData: (val) => set(typeof val === "function" ? (s) => ({ settingsData: val(s.settingsData) }) : { settingsData: val }),
  setAiConfigData: (aiConfigData) => set({ aiConfigData }),

  /**
   * Fetch clinic settings from API.
   */
  fetchClinic: async (orgId) => {
    set({ loading: true, error: null });
    try {
      const data = await fmApi.getMyClinic(orgId);
      set({ settingsData: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  /**
   * Update clinic settings via API.
   */
  updateSettings: async (data) => {
    try {
      const result = await fmApi.updateClinicSettings(data);
      set({ settingsData: result });
      return result;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  /**
   * Fetch AI agent config for a clinic.
   */
  fetchAiConfig: async (orgId) => {
    try {
      const data = await fmApi.getAgentConfig(orgId);
      set({ aiConfigData: data });
      return data;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  /**
   * Update AI agent config.
   */
  updateAiConfig: async (orgId, data) => {
    try {
      const result = await fmApi.updateAgentConfig(orgId, data);
      set({ aiConfigData: result });
      return result;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  /**
   * Toggle an automation on/off (local optimistic update + API).
   */
  toggleAutomation: async (clinicId, autId) => {
    set((s) => ({
      clinics: s.clinics.map((c) =>
        c.id === clinicId
          ? { ...c, automations: (c.automations||[]).map((a) => (a.id === autId ? { ...a, active: !a.active } : a)) }
          : c
      ),
    }));
    try {
      const automation = get().clinics.find((c) => c.id === clinicId)?.automations?.find((a) => a.id === autId);
      if (automation) {
        await fmApi.updateAutomation(autId, { active: automation.active });
      }
    } catch {}
  },

  /**
   * Mark all notifications as read for a clinic.
   */
  markNotifsRead: (clinicId) => {
    set((s) => ({
      clinics: s.clinics.map((c) =>
        c.id === clinicId
          ? { ...c, notifications: (c.notifications||[]).map((n) => ({ ...n, read: true })) }
          : c
      ),
    }));
  },

  /**
   * Fetch analytics integration config for this clinic.
   */
  fetchAnalyticsConfig: async () => {
    try {
      const data = await fmApi.getAnalyticsConfig();
      set({ analyticsConfig: data });
      return data;
    } catch (err) {
      set({ analyticsConfig: null });
      return null;
    }
  },

  /**
   * Save/update analytics integration config.
   */
  saveAnalyticsConfig: async (data) => {
    try {
      const result = await fmApi.updateAnalyticsConfig(data);
      set({ analyticsConfig: result });
      return result;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  /**
   * Disconnect analytics integration.
   */
  disconnectAnalytics: async () => {
    try {
      await fmApi.disconnectAnalytics();
      set({ analyticsConfig: null, analyticsData: null });
    } catch (err) {
      set({ error: err.message });
    }
  },

  /**
   * Fetch analytics data (stats, charts) for this clinic.
   */
  fetchAnalyticsData: async (params = {}) => {
    set({ analyticsLoading: true });
    try {
      const data = await fmApi.getAnalyticsData(params);
      set({ analyticsData: data, analyticsLoading: false });
      return data;
    } catch (err) {
      set({ analyticsLoading: false });
      return null;
    }
  },

  /**
   * Complete onboarding for a clinic.
   */
  completeOnboarding: (clinicId) => {
    set((s) => ({
      clinics: s.clinics.map((c) =>
        c.id === clinicId ? { ...c, setupStatus: 'live' } : c
      ),
    }));
    fmApi.updateClinicSettings({ onboarding_completed: true, setup_status: 'live' }).catch(e => { console.error("[store] API sync failed:", e.message || e); });
  },
}));
