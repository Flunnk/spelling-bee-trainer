import React from 'react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-4 right-4 z-50 p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-yellow-400 shadow-lg transition-all hover:scale-110 active:scale-95"
            aria-label="Toggle Dark Mode"
        >
            {theme === 'dark' ? (
                <i className="fas fa-sun text-xl"></i>
            ) : (
                <i className="fas fa-moon text-xl"></i>
            )}
        </button>
    );
};
