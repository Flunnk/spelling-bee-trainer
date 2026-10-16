import React from 'react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed top-5 right-5 z-50 w-12 h-12 aspect-square p-0 rounded-full inline-flex items-center justify-center leading-none select-none bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-2 border-slate-200/80 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-950 text-indigo-600 dark:text-amber-400 shadow-lg hover:shadow-amber-500/20 dark:hover:shadow-amber-400/20 transition-all duration-300 hover:scale-110 active:scale-95 active:translate-y-0.5 overflow-hidden group"
      aria-label="Toggle Dark Mode"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <span className="relative w-5 h-5 flex items-center justify-center leading-none">
        <i
          aria-hidden="true"
          className={`fas fa-sun text-lg leading-none block absolute transition-all duration-500 ${
            isDark
              ? 'opacity-100 rotate-0 scale-100 group-hover:rotate-45'
              : 'opacity-0 -rotate-90 scale-0'
          }`}
        ></i>
        <i
          aria-hidden="true"
          className={`fas fa-moon text-lg leading-none block absolute transition-all duration-500 ${
            !isDark
              ? 'opacity-100 rotate-0 scale-100 group-hover:-rotate-12'
              : 'opacity-0 rotate-90 scale-0'
          }`}
        ></i>
      </span>
    </button>
  );
};

