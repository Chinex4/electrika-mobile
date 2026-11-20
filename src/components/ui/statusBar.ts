/**
 * The status bar's text and icons follow what's behind them: dark on the
 * light pages, light on ElectriKa blue (the sign-in band, the launch
 * animation). Each screen sets it when it comes into focus, so going back
 * and forth between screens always lands on the right one.
 *
 * Only this hook (and the launch animation's own <StatusBar>) sets it: a
 * mounted <StatusBar> component would override every screen.
 */
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

import { useScheme } from '@/theme';

/** 'dark' is "for the page": dark text in the light theme, light in the dark one. */
export function useStatusBarStyle(style: 'light' | 'dark') {
  const scheme = useScheme();
  const shown = style === 'dark' && scheme === 'dark' ? 'light' : style;
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(shown, true);
    }, [shown]),
  );
}
