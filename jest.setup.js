/* global jest */
// Native modules the tests never reach for real.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k) => void store.delete(k)),
  };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));
jest.mock('sonner-native', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() }),
  Toaster: () => null,
}));
// Reanimated and Worklets have no native side under Jest.
// Reanimated 4.7's own mock fails under Jest, so this covers what the app uses.
jest.mock('react-native-worklets', () => ({}));
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = jest.requireActual('react-native');
  const Animated = { View, Text, Image, ScrollView, createAnimatedComponent: (c) => c };
  const passthrough = (v) => v;
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: (fn) => fn(),
    useDerivedValue: (fn) => ({ value: fn() }),
    withSpring: passthrough,
    withTiming: passthrough,
    withRepeat: passthrough,
    withSequence: (...v) => v[v.length - 1],
    runOnJS: (fn) => fn,
    Easing: { linear: passthrough, ease: passthrough, bezier: () => passthrough },
  };
});
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
