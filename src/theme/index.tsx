/**
 * Light and dark (20 Nov 2026). The person picks Light, Dark or System on
 * their Account page (settings slice); System follows the phone.
 *
 * - ThemeRoot sets the colour variables every Tailwind colour class reads
 *   (bg-surface, text-navy…), for the whole app, sheets and modals included.
 * - useColors() gives the same colours to code (icon tints, headers).
 * - useScheme() says which one is showing.
 */
import { vars } from 'nativewind';
import { useEffect, type ReactNode } from 'react';
import { Platform, useColorScheme, View } from 'react-native';

import { useAppSelector } from '@/store/hooks';
import { selectThemePref } from '@/store/selectors';

import palette from './palette';

export type Scheme = 'light' | 'dark';

const VARS = { light: vars(palette.cssVars(palette.light)), dark: vars(palette.cssVars(palette.dark)) };

function build(scheme: Scheme) {
  const t = scheme === 'dark' ? palette.dark : palette.light;
  return {
    /** Brand blue as text or an icon tint on a page or card (lighter in dark). */
    brand: t.accent,
    accent: t.accent,
    /** Brand blue as a fill: buttons, hero cards, the sign-in band. */
    brandFill: palette.fixed.brand,
    navyFill: palette.fixed['navy-fill'],
    alert: palette.fixed.alert,
    leaf: palette.fixed.leaf,
    white: palette.fixed.white,
    navy: t.navy,
    ink: t.ink,
    muted: t.muted,
    faint: t.faint,
    edge: t.edge,
    line: t.line,
    page: t.page,
    surface: t.surface,
    mist: t.mist,
    haze: t.haze,
    alertInk: t['alert-ink'],
    leafInk: t['leaf-ink'],
    amberInk: t['amber-ink'],
  };
}

export type Colors = ReturnType<typeof build>;
export const COLORS: Record<Scheme, Colors> = { light: build('light'), dark: build('dark') };

/** The theme showing now. */
export function useScheme(): Scheme {
  const pref = useAppSelector(selectThemePref);
  const system = useColorScheme();
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

export function useColors(): Colors {
  return COLORS[useScheme()];
}

/** Wraps the app: the colour variables for the theme showing now. */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  useEffect(() => {
    // On the web, sheets and modals render outside this view: put the
    // variables on the page itself too.
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const theme = scheme === 'dark' ? palette.dark : palette.light;
    for (const [k, v] of Object.entries(palette.cssVars(theme))) document.documentElement.style.setProperty(k, v);
    document.documentElement.style.colorScheme = scheme;
  }, [scheme]);
  return <View style={[{ flex: 1, backgroundColor: COLORS[scheme].page }, VARS[scheme]]}>{children}</View>;
}
