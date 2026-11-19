/**
 * Push notifications. After sign-in the phone asks once, then hands its Expo
 * push token to the server (POST /api/me/push-token/), which sends every
 * message that goes out as web push to the app too (apps/api/push.py).
 *
 * Needs a development build and an EAS project id (expo.extra.eas.projectId,
 * set by `eas init`); without one this quietly does nothing.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  return (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;
}

export async function registerForPush(): Promise<boolean> {
  if (!Device.isDevice || !projectId()) return false;
  if (Platform.OS === 'android') {
    // Android 13+ shows the permission prompt only once a channel exists.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ElectriKa',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#0051A2',
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return false;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await api('/me/push-token/', { method: 'POST', body: { push_token: data } });
    return true;
  } catch {
    return false;
  }
}

export async function pushIsOn(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
