import { useThemeStore } from '../../stores/themeStore';

/**
 * Hook that returns the current theme name and a helper to get CSS var references.
 * Usage: const { theme, isDark, v } = useTheme();
 *   style={{ background: v('--bg-card'), color: v('--text-primary') }}
 *   or just use 'var(--bg-card)' directly in inline styles.
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    v: (token) => `var(${token})`,
  };
}
