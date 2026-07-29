/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: 'rgba(var(--brand-primary), <alpha-value>)',
          yellowGlow: 'rgba(var(--brand-primary), 0.4)',
        },
        dark: {
          900: 'rgba(var(--bg-secondary), <alpha-value>)',
          950: 'rgba(var(--bg-main), <alpha-value>)',
        },
        // Dynamic white/text that respects light/dark
        white: 'rgba(var(--text-primary), 1)',
        zinc: {
          200: 'rgba(var(--text-secondary), <alpha-value>)',
          300: 'rgba(var(--text-secondary), <alpha-value>)',
          400: 'rgba(var(--text-secondary), <alpha-value>)',
          500: 'rgba(var(--text-muted), <alpha-value>)',
          600: 'rgba(var(--text-muted), <alpha-value>)',
          700: 'rgba(var(--border-hover), <alpha-value>)',
          800: 'rgba(var(--border-main), <alpha-value>)',
          900: 'rgba(var(--bg-secondary), <alpha-value>)',
          950: 'rgba(var(--bg-main), <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-yellow': '0 0 20px rgba(var(--brand-primary), 0.3)',
        'glow-yellow-lg': '0 0 35px rgba(var(--brand-primary), 0.5)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(var(--brand-primary), 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(var(--brand-primary), 0.6)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [],
}
