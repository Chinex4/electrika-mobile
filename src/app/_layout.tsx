import '@/styles/global.css';
import '@/tracking/journey';

import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { MarketLive } from '@/market/MarketLive';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner-native';

import { HOME_FOR } from '@/auth/roles';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { routeForNotification } from '@/notifications/route';
import { bootStore, store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSession } from '@/store/selectors';
import { resumeJourney } from '@/store/slices/journey';
import { changeLanguage } from '@/store/slices/settings';
import { restoreSession, setPhoto, signIn } from '@/store/slices/session';
import { ThemeRoot, useColors, useScheme } from '@/theme';

SplashScreen.preventAutoHideAsync();
bootStore();
// Development only: lets a debugger drive the app (switch language, navigate).
if (__DEV__) Object.assign(globalThis, { __electrika: { store, router, changeLanguage, signIn, setPhoto } });

/** Tapping a notification opens the screen it is about, or the person's dashboard. */
function NotificationTaps() {
  const { user } = useAppSelector(selectSession);
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response || !user) return;
    const data = response.notification.request.content.data as { path?: string } | undefined;
    router.navigate(routeForNotification(data?.path, user.role) ?? HOME_FOR[user.role]);
  }, [response, user]);
  return null;
}

function Root() {
  const dispatch = useAppDispatch();
  const { status, user } = useAppSelector(selectSession);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);
  useEffect(() => {
    if (status === 'signed-in' && user?.role === 'TECHNICIAN') dispatch(resumeJourney());
  }, [status, user?.role, dispatch]);

  // The launch animation plays over everything until the session is known
  // (at least long enough to draw the mark), then opens onto the app.
  const [splash, setSplash] = useState(true);
  const splashDone = useCallback(() => setSplash(false), []);

  return (
    <>
      {status === 'loading' ? null : <AppStack />}
      {splash ? <AnimatedSplash ready={status !== 'loading'} onDone={splashDone} /> : null}
    </>
  );
}

function AppStack() {
  const colors = useColors();
  return (
    <>
      <StatusBar style="dark" />
      {Platform.OS !== 'web' ? <NotificationTaps /> : null}
      <MarketLive />
      <Stack
        screenOptions={{
          headerShown: true,
          // Screens set their own title; never show a route name like "track/[id]".
          title: '',
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.brand,
          headerTitleStyle: { color: colors.navy, fontWeight: '600' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.page },
          contentStyle: { backgroundColor: colors.page },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        {['customer', 'tech', 'dispatch', 'am', 'accounts', 'pm'].map((area) => (
          <Stack.Screen key={area} name={area} options={{ headerShown: false, animation: 'fade' }} />
        ))}
        <Stack.Screen name="help/emergency" options={{ title: '', presentation: Platform.OS === 'ios' ? 'modal' : 'card' }} />
        <Stack.Screen name="payments/done" options={{ title: '', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

/** Toasts in the theme showing (sonner draws its own light or dark cards). */
function ThemedToaster() {
  const scheme = useScheme();
  return <Toaster position="top-center" duration={3500} richColors theme={scheme} swipeToDismissDirection="up" />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeRoot>
          <Root />
          <ThemedToaster />
        </ThemeRoot>
      </Provider>
    </GestureHandlerRootView>
  );
}
