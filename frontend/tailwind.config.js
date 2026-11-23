/** @type {import('tailwindcss').Config} */
// Design tokens are CSS variables (see src/styles/index.css) so dark mode is a variable swap.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        subtle: token('subtle'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        primary: { DEFAULT: token('primary'), 50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },
        violet: { DEFAULT: '#8B5CF6', 100: '#EDE9FE', 500: '#8B5CF6', 600: '#7C3AED' },
        accent: { DEFAULT: '#06B6D4', 100: '#CFFAFE', 600: '#0891B2' },
        success: { DEFAULT: '#10B981', 50: '#ECFDF5', 700: '#047857' },
        warning: { DEFAULT: '#F59E0B', 50: '#FFFBEB', 700: '#B45309' },
        danger: { DEFAULT: '#EF4444', 50: '#FEF2F2', 700: '#B91C1C' },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '24px', input: '14px', xl2: '20px' },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
        lift: '0 2px 4px rgb(15 23 42 / 0.04), 0 18px 40px -12px rgb(79 70 229 / 0.25)',
        glow: '0 0 0 4px rgb(99 102 241 / 0.12)',
      },
      backgroundImage: {
        brand: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
}
