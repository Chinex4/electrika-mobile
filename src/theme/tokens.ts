/**
 * ElectriKa brand tokens, taken from the web app's tailwind.config.js so the
 * mobile app and the website look like one product.
 */
export const colors = {
  brand: '#0051A2',
  navy: '#1D3557',
  alert: '#EB1E25',
  alertSoft: '#FF5A5F',
  mist: '#F1F5FA',
  haze: '#EAF1FA',
  line: '#E1E7EF',
  edge: '#C9D3E0',
  ink: '#374151',
  muted: '#4B5563',
  amberBg: '#FFF4E5',
  amberInk: '#8A3B00',
  leaf: '#2E9E5B',
  leafBg: '#E7F5EC',
  leafInk: '#1F6B3D',
  white: '#FFFFFF',
  page: '#F6F8FB',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 20, pill: 999 } as const;

export const type = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.navy },
  heading: { fontSize: 17, fontWeight: '600' as const, color: colors.navy },
  body: { fontSize: 15, color: colors.ink },
  small: { fontSize: 13, color: colors.muted },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.6, color: colors.muted, textTransform: 'uppercase' as const },
};
