/**
 * Theme Store — Zustand
 * Manages light/dark theme with localStorage persistence
 * and system preference auto-detection.
 */
import { create } from 'zustand';

const getInitialTheme = () => {
  // Check localStorage first
  const stored = localStorage.getItem('techvault-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  // Auto-detect system preference
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
};

const useThemeStore = create((set) => ({
  theme: getInitialTheme(),

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('techvault-theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('techvault-theme', next);
      return { theme: next };
    });
  },

  // Call once on app mount to apply stored theme
  initTheme: () => {
    const theme = getInitialTheme();
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));

export default useThemeStore;
