/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Nunito', 'sans-serif'],
            },
            colors: {
                slate: {
                    850: '#172033', // Custom darker shade
                }
            },
            animation: {
                'slide-up': 'slideUp 0.4s ease-out',
                'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-out',
            },
            keyframes: {
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
