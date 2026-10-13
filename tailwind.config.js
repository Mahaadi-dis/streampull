/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0818',
        surface: { DEFAULT: '#150e27', 2: '#1d1438', 3: '#271b4a' },
        line: 'rgba(167,139,250,0.14)',
        brand: { DEFAULT: '#8b5cf6', light: '#a78bfa', deep: '#7c3aed', pink: '#c084fc' },
        ok: '#34d399',
        bad: '#f87171',
        warn: '#fbbf24'
      },
      fontFamily: {
        sans: ['Inter', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(167,139,250,.35), 0 8px 32px -6px rgba(139,92,246,.55)',
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
