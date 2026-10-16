import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      /* Ignore storage access errors */
    }
    if (document.documentElement.classList.contains('dark')) return 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media?.addEventListener) return;
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (!localStorage.getItem('theme')) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      } catch {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('theme', next);
      } catch {
        /* The theme still works in memory. */
      }
      return next;
    });
  };

  return { theme, toggleTheme };
}