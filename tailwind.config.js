/**
 * ElectriKa's Tailwind theme, the same brand as the website's
 * (../total-care-plan-app/tailwind.config.js). Used through NativeWind:
 * every screen styles itself with `className`.
 * @type {import('tailwindcss').Config}
 */
const { fixed } = require('./src/theme/palette');

const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Dark mode works through the colour variables (src/theme), not dark:
  // classes; 'class' stops NativeWind switching anything on its own.
  darkMode: 'class',
  theme: {
    extend: {
      // Themed colours are CSS variables (set for light or dark by
      // src/theme/ThemeProvider.tsx); brand fills are fixed. See src/theme/palette.js.
      colors: {
        brand: { DEFAULT: fixed.brand, deep: fixed['brand-deep'], soft: fixed['brand-soft'] },
        'navy-fill': fixed['navy-fill'],
        navy: v('navy'),
        alert: { DEFAULT: fixed.alert, soft: fixed['alert-soft'], bg: v('alert-bg'), ink: v('alert-ink'), edge: v('alert-edge'), tint: v('alert-tint') },
        amber: { bg: v('amber-bg'), ink: v('amber-ink'), edge: v('amber-edge'), tint: v('amber-tint') },
        leaf: { DEFAULT: fixed.leaf, bg: v('leaf-bg'), ink: v('leaf-ink'), edge: v('leaf-edge'), tint: v('leaf-tint') },
        haze: { DEFAULT: v('haze'), edge: v('haze-edge') },
        page: v('page'),
        surface: v('surface'),
        mist: v('mist'),
        track: v('track'),
        line: v('line'),
        edge: v('edge'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        accent: v('accent'),
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      fontSize: { xxs: ['11px', '14px'] },
    },
  },
  plugins: [],
};
