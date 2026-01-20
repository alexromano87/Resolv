/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',              
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Blu Navy Professionale - Colore Primario
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1e40af',   // PRIMARY
          800: '#1e3a8a',
          900: '#1e293b',
          950: '#0f172a',
        },
        // Blu Standard (sostituisce indigo nei componenti)
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e293b',
          950: '#0f172a',
        },
        // Cyan - Accento Secondario
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',   // ACCENT WARM
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Verde - Importi Recuperati (Positivo)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#059669',   // SUCCESS
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Ambra - Alert e Scadenze
        warning: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#d97706',   // WARNING
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        // Rosso - Debiti e Errori
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',   // DANGER
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['"Roboto Flex"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Roboto Flex"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
