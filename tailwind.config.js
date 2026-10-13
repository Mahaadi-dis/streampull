/** @type {import('tailwindcss').Config} */
// Theme colors are CSS variables ("r g b") set at runtime from src/shared/themes.ts.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
        line: 'rgb(var(--brand-light) / 0.14)',
        brand: { DEFAULT: v('brand'), light: v('brand-light'), deep: v('brand-deep'), pink: v('accent2') },
        // tinted text scale follows the theme (only the shades the UI uses)
        violet: { 50: v('t50'), 100: v('t100'), 200: v('t200'), 300: v('t300'), 500: v('brand') },
        ok: '#34d399',
        bad: '#f87171',
        warn: '#fbbf24'
      },
      fontFamily: {
        sans: ['Inter', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--brand-light) / .35), 0 8px 32px -6px rgb(var(--brand) / .55)',
        card: '0 10px 40px -12px rgba(0,0,0,.6)'
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } }
      },
      animation: { shimmer: 'shimmer 1.6s infinite', float: 'float 5s ease-in-out infinite' }
    }
  },
  plugins: []
}
