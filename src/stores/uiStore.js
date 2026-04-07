import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pathToView } from '../router/routeConfig';

/**
 * Derive initial view from the current URL path so deep links work immediately.
 * Falls back to 'dashboard' if the path is unknown or root.
 */
const getInitialView = () => {
  try {
    const mapped = pathToView[window.location.pathname];
    if (mapped) return mapped;
  } catch { /* ignore */ }
  return 'dashboard';
};

/**
 * UI Store — view state, sidebar, toast, language, search, notifications, calendar, tour.
 * localStorage: ONLY lang, sidebar persisted.
 */
export const useUiStore = create(
  persist(
    (set, get) => ({
      // ── Persisted ──
      lang: (() => {
        try {
          const p = new URLSearchParams(window.location.search).get('lang');
          if (p && ['en', 'de', 'tr', 'es', 'fr', 'it', 'pt'].includes(p)) return p;
          return localStorage.getItem('fm_lang') || 'de';
        } catch { return 'de'; }
      })(),
      sidebar: true,

      // ── Ephemeral (not persisted) ──
      view: getInitialView(),
      toast: null,
      searchQuery: '',
      searchOpen: false,
      notifOpen: false,
      calView: 'month',
      calDate: new Date(),
      tourActive: false,
      tourStep: 0,
      tourCompleted: (() => {
        try { return localStorage.getItem('fm_tour_done') === '1'; } catch { return false; }
      })(),
      templateModal: false,
      templateFilter: 'all',
      successModal: null,
      showPlanPicker: false,
      showRevenue: true,
      patientTab: 'timeline',
      opSubTab: 'dashboard',
      demoTourOpen: false,

      // ── Actions ──
      setView: (view) => set({ view }),
      setSidebar: (sidebar) => set({ sidebar }),
      toggleSidebar: () => set((s) => ({ sidebar: !s.sidebar })),
      setLang: (lang) => {
        set({ lang });
        document.documentElement.lang = lang;
      },
      showToast: (msg, type = 'success') => {
        set({ toast: typeof msg === 'object' ? msg : { msg, type } });
        setTimeout(() => set({ toast: null }), type === 'error' ? 4000 : 2500);
      },
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setNotifOpen: (notifOpen) => set({ notifOpen }),
      setCalView: (calView) => set({ calView }),
      setCalDate: (calDate) => set({ calDate }),
      setTourActive: (tourActive) => set({ tourActive }),
      setTourStep: (tourStep) => set({ tourStep }),
      setTourCompleted: (tourCompleted) => {
        set({ tourCompleted });
        try { localStorage.setItem('fm_tour_done', tourCompleted ? '1' : '0'); } catch {}
      },
      setTemplateModal: (templateModal) => set({ templateModal }),
      setTemplateFilter: (templateFilter) => set({ templateFilter }),
      setSuccessModal: (successModal) => set({ successModal }),
      setShowPlanPicker: (showPlanPicker) => set({ showPlanPicker }),
      setShowRevenue: (showRevenue) => set({ showRevenue }),
      setPatientTab: (patientTab) => set({ patientTab }),
      setOpSubTab: (opSubTab) => set({ opSubTab }),
      setDemoTourOpen: (demoTourOpen) => set({ demoTourOpen }),
    }),
    {
      name: 'fm-ui',
      partialize: (state) => ({
        lang: state.lang,
        sidebar: state.sidebar,
        opSubTab: state.opSubTab,
      }),
    }
  )
);
