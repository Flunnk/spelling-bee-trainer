import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved === 'dark' || saved === 'light') return saved;
            return 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    return { theme, toggleTheme };
}
