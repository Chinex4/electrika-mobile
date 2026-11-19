/**
 * The app's language. Kept on the phone, synced to the account when signed
 * in (PATCH /api/me/ {language}), and sent with every request.
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

import { api } from '@/api/client';
import type { Lang } from '@/types/api';

export const LANG_KEY = 'electrika.lang';
const KEY = LANG_KEY;

export type SettingsState = { lang: Lang; loaded: boolean };
const initialState: SettingsState = { lang: 'en', loaded: false };

export const loadLanguage = createAsyncThunk('settings/load', async () => {
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    return saved === 'ig' || saved === 'en' ? saved : null;
  } catch {
    return null;
  }
});

/** Choose a language: on the phone at once, and on the account if signed in. */
export const changeLanguage = createAsyncThunk<Lang, Lang, { state: { session: { status: string } } }>(
  'settings/change',
  async (lang, { getState }) => {
    SecureStore.setItemAsync(KEY, lang).catch(() => undefined);
    if (getState().session.status === 'signed-in') {
      await api('/me/', { method: 'PATCH', body: { language: lang } }).catch(() => undefined);
    }
    return lang;
  },
);

const settings = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /** The account's saved language, after sign-in (saved on the phone by the store's listener). */
    languageFromAccount(state, action: PayloadAction<Lang>) {
      state.lang = action.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(loadLanguage.fulfilled, (state, action) => {
      if (action.payload) state.lang = action.payload;
      state.loaded = true;
    });
    b.addCase(changeLanguage.pending, (state, action) => {
      state.lang = action.meta.arg;
    });
  },
});

export const { languageFromAccount } = settings.actions;
export default settings.reducer;
