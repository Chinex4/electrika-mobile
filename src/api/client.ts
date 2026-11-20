/**
 * Talks to the Django backend's /api/. Every request carries the signed-in
 * person's token (kept in the phone's secure storage, never in plain
 * storage) and the app's language, so the server's own words come back in it.
 */
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ApiFailure, Lang } from '@/types/api';

// EXPO_PUBLIC_API_URL points a development copy at a local or test server
// (e.g. http://127.0.0.1:8000/api); otherwise app.json's apiUrl (the live site).
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL || ((Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'https://electrika.ng/api');

const TOKEN_KEY = 'electrika.token';

// Secure storage can fail (or not exist, on the web preview). Never let that
// leave the app stuck on its splash screen: treat it as signed out.
let memoryToken: string | null = null;

export const tokenStore = {
  get: async () => {
    try {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (saved) memoryToken = saved;
      return saved ?? memoryToken;
    } catch {
      return memoryToken;
    }
  },
  set: async (token: string) => {
    memoryToken = token;
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      // kept in memory for this session only
    }
  },
  clear: async () => {
    memoryToken = null;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // nothing stored
    }
  },
};

/**
 * An image from the server, as expo-image's source. Private files (a profile
 * photo, job photos) are served at /files/ to whoever is signed in, so the
 * app's token goes with the request; without it the server sent the sign-in
 * page instead and the photo never showed.
 */
export function remoteImage(url: string) {
  const origin = API_URL.replace(/\/api\/?$/, '');
  if (memoryToken && url.startsWith(`${origin}/files/`)) return { uri: url, headers: { Authorization: `Token ${memoryToken}` } };
  return { uri: url };
}

/** Kept in step with the store's language (src/store/index.ts). */
let language: Lang = 'en';
export const setApiLanguage = (lang: Lang) => {
  language = lang;
};
export const apiLanguage = () => language;

// In a web browser the request is blocked before it leaves (electrika.ng
// doesn't allow other websites to call it), so say what's really wrong.
const WEB_BLOCKED = 'The browser preview can\'t reach electrika.ng. Open the app on a phone (Expo Go or a test build) to sign in.';

const OFFLINE: Record<Lang, string> = {
  en: "We couldn't reach ElectriKa. Check your internet and try again.",
  ig: 'Anyị enweghị ike ịkpọtụrụ ElectriKa. Lelee ịntanetị gị ma nwaa ọzọ.',
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
  }

  get errors(): Record<string, string[]> | undefined {
    const d = this.data as { errors?: Record<string, string[]> } | null | undefined;
    return d && typeof d === 'object' && d.errors ? d.errors : undefined;
  }
}

/** Any thrown thing, as something the store can keep and the screen can show. */
export function toFailure(e: unknown): ApiFailure {
  if (e instanceof ApiError) return { message: e.message, status: e.status, errors: e.errors };
  return { message: e instanceof Error ? e.message : String(e), status: -1 };
}

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type Options = Omit<RequestInit, 'body' | 'method'> & { method?: Method; body?: unknown; auth?: boolean };

export async function api<T>(path: string, { body, auth = true, headers, ...rest }: Options = {}): Promise<T> {
  const token = auth ? await tokenStore.get() : null;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        'Accept-Language': language,
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Token ${token}` } : {}),
        ...(headers as Record<string, string> | undefined),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, Platform.OS === 'web' ? WEB_BLOCKED : OFFLINE[language]);
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'detail' in data && String((data as { detail: unknown }).detail)) ||
      'Something went wrong. Please try again.';
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** A photo from the camera or library, ready for a multipart upload. */
export function photoPart(uri: string, name = 'photo.jpg', type = 'image/jpeg') {
  return { uri, name, type } as unknown as Blob;
}
