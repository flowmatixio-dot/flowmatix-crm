import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme Store — manages dark/light mode with localStorage persistence.
 * Default: dark. Respects system preference only if no saved choice.
 */
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light'

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyTheme(next);
      },
    }),
    {
      name: 'fm-theme',
      onRehydrate: () => {
        // After rehydration, apply saved theme
        return (state) => {
          if (state?.theme) {
            applyTheme(state.theme);
          }
        };
      },
    }
  )
);

/** Apply theme to DOM */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Update body background for instant paint
  document.body.style.background = theme === 'light' ? '#F8FAFC' : '#0f1623';
}

/** Initialize theme before React renders (call from index.html or main.jsx) */
export function initTheme() {
  const isClientCRM = window.location.hostname === 'crm.flowmatix.io' || window.location.hostname === 'localhost';
  if (isClientCRM) {
    // Kunden-CRM: always dark, clear any stored light mode
    localStorage.removeItem('fm-theme');
    applyTheme('dark');
    return;
  }
  try {
    const stored = JSON.parse(localStorage.getItem('fm-theme') || '{}');
    const theme = stored?.state?.theme || 'dark';
    applyTheme(theme);
  } catch {
    applyTheme('dark');
  }
}
