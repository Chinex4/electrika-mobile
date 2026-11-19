/** Unit and screen tests: `pnpm test`. */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  testTimeout: 15000,
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop|sonner-native|@reduxjs/toolkit|immer|redux|react-redux|standard-navigation|react-native-worklets|react-native-reanimated))',
  ],
};
