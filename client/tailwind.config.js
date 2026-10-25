/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'] },
      colors: {
        brand: { 50: '#eef4ff', 100: '#dbe7ff', 200: '#bcd1ff', 300: '#8db0ff', 400: '#5b86fb', 500: '#3a62f0', 600: '#2748d4', 700: '#2039aa', 800: '#1e3488', 900: '#1b2e6b' },
        ink: { 900: '#0b1220', 800: '#111a2e', 700: '#1b2742' },
      },
      boxShadow: { soft: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -8px rgba(16,24,40,.12)', glow: '0 10px 40px -10px rgba(58,98,240,.55)' },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        fadeup: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        slidein: { from: { opacity: 0, transform: 'translateX(24px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { floaty: 'floaty 6s ease-in-out infinite', fadeup: 'fadeup .5s ease both', slidein: 'slidein .35s ease both' },
    },
  },
  plugins: [],
};
