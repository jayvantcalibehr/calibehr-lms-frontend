import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext({ theme: 'light', setTheme: () => {}, toggle: () => {} });

const STORAGE_KEY = 'lms-theme';

function readInitial() {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  // Honour system preference on first load
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitial);

  /* Apply to <html data-theme="…"> so CSS vars switch globally */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);

    /* Update meta theme-color for browser chrome (mobile) */
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = theme === 'dark' ? '#000000' : '#fbfbfd';
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
