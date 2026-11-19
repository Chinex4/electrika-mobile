/**
 * An engineer's live location while "on my way", sent to
 * POST /api/job/<id>/location/ so the customer can follow on the map.
 *
 * - With "Always" location permission it keeps going with the screen off
 *   (a background task; on Android a visible notification says so).
 * - Without it, it shares while the app is open.
 *
 * The task must be defined at the top level, so the root layout imports
 * this file once. It stops itself when the server says the journey is
 * over (the engineer arrived, or the job moved on).
 */
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';

import { api, ApiError } from '@/api/client';

export const JOURNEY_TASK = 'electrika-journey';
const JOB_KEY = 'electrika.journeyJob';

export type SharingMode = 'background' | 'foreground' | 'off';

let watcher: Location.LocationSubscription | null = null;

async function send(jobId: string | number, pos: Location.LocationObject) {
  try {
    await api(`/job/${jobId}/location/`, {
      method: 'POST',
      body: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? undefined },
    });
  } catch (e) {
    // 409: the journey is over on the server. 401/403: not ours any more.
    if (e instanceof ApiError && [401, 403, 404, 409].includes(e.status)) await stopSharing();
  }
}

if (!TaskManager.isTaskDefined(JOURNEY_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(JOURNEY_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const jobId = await SecureStore.getItemAsync(JOB_KEY).catch(() => null);
    if (jobId) await send(jobId, data.locations[data.locations.length - 1]);
  });
}

export async function startSharing(jobId: number): Promise<SharingMode> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'off';
  await SecureStore.setItemAsync(JOB_KEY, String(jobId)).catch(() => undefined);

  // First position straight away, so the customer sees the pin at once.
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    .then((pos) => send(jobId, pos))
    .catch(() => undefined);

  let background = false;
  try {
    background = (await Location.requestBackgroundPermissionsAsync()).status === 'granted';
  } catch {
    background = false;
  }
  if (background) {
    try {
      await Location.startLocationUpdatesAsync(JOURNEY_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 20_000,
        distanceInterval: 40,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Sharing your location',
          notificationBody: 'Your customer can follow you until you tap "I\'ve arrived".',
          notificationColor: '#0051A2',
        },
      });
      return 'background';
    } catch {
      // Fall through to sharing while the app is open.
    }
  }
  watcher?.remove();
  watcher = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 20_000, distanceInterval: 40 },
    (pos) => send(jobId, pos),
  );
  return 'foreground';
}

export async function stopSharing() {
  watcher?.remove();
  watcher = null;
  await SecureStore.deleteItemAsync(JOB_KEY).catch(() => undefined);
  try {
    if (await Location.hasStartedLocationUpdatesAsync(JOURNEY_TASK)) await Location.stopLocationUpdatesAsync(JOURNEY_TASK);
  } catch {
    // not running
  }
}

/** Where the phone is now, for "I've arrived" (pins the site). Null if location is off. */
export async function hereNow(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? undefined };
  } catch {
    return null;
  }
}

export async function sharingJob(): Promise<number | null> {
  const id = await SecureStore.getItemAsync(JOB_KEY).catch(() => null);
  return id ? Number(id) : null;
}
