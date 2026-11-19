import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

/**
 * True on iPhones running iOS 26+ where Apple's Liquid Glass is available.
 * There the app uses the system's native tab bar (which iOS draws in Liquid
 * Glass) and a few GlassView surfaces. Everywhere else (older iOS, Android)
 * it uses ElectriKa's own floating tab bar.
 *
 * isGlassEffectAPIAvailable guards against early iOS 26 betas that lacked
 * the API and would crash (expo/expo#40911).
 */
export const HAS_LIQUID_GLASS: boolean = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();
