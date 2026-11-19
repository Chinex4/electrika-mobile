import '@/styles/global.css';
import '@/tracking/journey';

import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner-native';

import { HOME_FOR } from '@/auth/roles';
import { brandColors } from '@/components/ui';
import { routeForNotification } from '@/notifications/route';
import { bootStore, store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSession } from '@/store/selectors';
import { resumeJourney } from '@/store/slices/journey';
import { restoreSession } from '@/store/slices/session';

SplashScreen.preventAutoHideAsync();
bootStore();

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
    if (status !== 'loading') SplashScreen.hideAsync();
    if (status === 'signed-in' && user?.role === 'TECHNICIAN') dispatch(resumeJourney());
  }, [status, user?.role, dispatch]);

  if (status === 'loading') return null;
  return (
    <>
      <StatusBar style="dark" />
      {Platform.OS !== 'web' ? <NotificationTaps /> : null}
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: brandColors.brand,
          headerTitleStyle: { color: brandColors.navy, fontWeight: '600' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: brandColors.page },
          contentStyle: { backgroundColor: brandColors.page },
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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <Root />
        <Toaster position="top-center" duration={3500} richColors swipeToDismissDirection="up" />
      </Provider>
    </GestureHandlerRootView>
  );
}
