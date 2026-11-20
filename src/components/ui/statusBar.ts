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

export function useStatusBarStyle(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
    }, [style]),
  );
}
