/**
 * ElectriKa's Tailwind theme, the same brand as the website's
 * (../total-care-plan-app/tailwind.config.js). Used through NativeWind:
 * every screen styles itself with `className`.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is light only (app.json userInterfaceStyle); 'class' stops NativeWind
  // following the system dark mode on its own.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0051A2', deep: '#003D7A', soft: '#3C7DD9' },
        navy: '#1D3557',
        alert: { DEFAULT: '#EB1E25', soft: '#FF5A5F', bg: '#FDECEA', ink: '#B42318', edge: '#F5B5B1' },
        mist: '#F1F5FA',
        haze: '#EAF1FA',
        line: '#E1E7EF',
        edge: '#C9D3E0',
        ink: '#374151',
        muted: '#4B5563',
        faint: '#8592A3',
        amber: { bg: '#FFF4E5', ink: '#8A3B00', edge: '#F7D7A8' },
        leaf: { DEFAULT: '#2E9E5B', bg: '#E7F5EC', ink: '#1F6B3D' },
        page: '#F6F8FB',
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      fontSize: { xxs: ['11px', '14px'] },
    },
  },
  plugins: [],
};
