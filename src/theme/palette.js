/**
 * ElectriKa's colours, light and dark (20 Nov 2026).
 *
 * One source for both Tailwind classes (as CSS variables, see
 * tailwind.config.js and src/theme/ThemeProvider.tsx) and colours used from
 * code (useColors). The light theme is the website's; the dark one is a deep
 * navy built so body text stays at WCAG AA contrast or better on every
 * surface (checked in __tests__/theme.test.ts).
 *
 * Plain CommonJS so tailwind.config.js can read it too.
 */

/** Themed: each name becomes a Tailwind colour (bg-surface, text-navy…). */
const light = {
  page: '#F6F8FB', // the screen behind everything
  surface: '#FFFFFF', // cards, fields, sheets, rows
  mist: '#F1F5FA', // a pressed row, a quiet chip
  track: '#E8EDF4', // behind a segmented control
  line: '#E1E7EF', // dividers, card borders
  edge: '#C9D3E0', // field borders, handles
  navy: '#1D3557', // headings and strong text
  ink: '#374151', // body text
  muted: '#4B5563', // secondary text
  faint: '#8592A3', // placeholders, hints
  accent: '#0051A2', // links, selected borders, brand-coloured text and icons
  haze: '#EAF1FA', // a soft blue fill
  'haze-edge': '#C7D9F0',
  'alert-bg': '#FDECEA',
  'alert-ink': '#B42318',
  'alert-edge': '#F5B5B1',
  'alert-tint': '#FFF8F7',
  'amber-bg': '#FFF4E5',
  'amber-ink': '#8A3B00',
  'amber-edge': '#F7D7A8',
  'amber-tint': '#FFFBF5',
  'leaf-bg': '#E7F5EC',
  'leaf-ink': '#1F6B3D',
  'leaf-edge': '#BFE3CD',
  'leaf-tint': '#F6FBF8',
};

const dark = {
  page: '#0B1220',
  surface: '#131C2E',
  mist: '#1A2538',
  track: '#1A2538',
  line: '#233049',
  edge: '#34435F',
  navy: '#EEF3FA',
  ink: '#D3DBE7',
  muted: '#A7B2C5',
  faint: '#7F8BA2',
  accent: '#7DB4FF',
  haze: '#15294A',
  'haze-edge': '#25426F',
  'alert-bg': '#3A1619',
  'alert-ink': '#FF9C95',
  'alert-edge': '#5E2429',
  'alert-tint': '#211419',
  'amber-bg': '#33250F',
  'amber-ink': '#F7BE6E',
  'amber-edge': '#5B4319',
  'amber-tint': '#211B12',
  'leaf-bg': '#11301F',
  'leaf-ink': '#74D9A0',
  'leaf-edge': '#1F4C33',
  'leaf-tint': '#122019',
};

/** The same in both themes: brand fills and the colours that sit on them. */
const fixed = {
  brand: '#0051A2', // blue buttons, hero cards, the sign-in band
  'brand-deep': '#003D7A',
  'brand-soft': '#3C7DD9',
  alert: '#EB1E25', // red buttons and the emergency card
  'alert-soft': '#FF5A5F',
  leaf: '#2E9E5B', // green buttons and ticks
  'navy-fill': '#1D3557', // the navy hero card
  white: '#FFFFFF',
  black: '#000000',
};

const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** The CSS variables for one theme: {'--c-page': '246 248 251', …}. */
const cssVars = (theme) => Object.fromEntries(Object.entries(theme).map(([k, v]) => [`--c-${k}`, toRgb(v)]));

module.exports = { light, dark, fixed, toRgb, cssVars };
