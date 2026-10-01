import { create } from 'zustand';

const getInitialTheme = () => {
  const stored = localStorage.getItem('techvault-admin-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
};

const useThemeStore = create((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('techvault-admin-theme', next);
    return { theme: next };
  }),
  initTheme: () => {
    const theme = getInitialTheme();
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));

export default useThemeStore;
