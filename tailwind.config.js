/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        void: '#030303',
        obsidian: '#0A0A0A',
        'glass-panel': 'rgba(20, 20, 20, 0.7)',
        'glass-hover': 'rgba(255, 255, 255, 0.03)',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1AA',
        'text-tertiary': '#52525B',
        'accent-primary': '#EDEDED',
        'accent-glow': 'rgba(255, 255, 255, 0.15)',
        'status-error': '#EF4444',
        'status-success': '#10B981',
        'border-subtle': 'rgba(255, 255, 255, 0.08)',
        'border-highlight': 'rgba(255, 255, 255, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '24px',
        full: '999px',
      },
      boxShadow: {
        'glow-sm': '0 0 16px rgba(255, 255, 255, 0.05)',
        'glow-md': '0 0 32px rgba(255, 255, 255, 0.08)',
        elevation: '0 24px 48px -12px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
