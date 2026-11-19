/**
 * Who is signed in. Everyone can use the app; the role picks the dashboard
 * (src/auth/roles.ts). Backed by /api/auth/ and /api/me/.
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { api, ApiError, photoPart, toFailure, tokenStore } from '@/api/client';
import type { ApiFailure, CodeCheck, SignedIn, User } from '@/types/api';

import { changeLanguage, languageFromAccount } from './settings';

export type SessionState = {
  status: 'loading' | 'signed-out' | 'signed-in';
  user: User | null;
};
const initialState: SessionState = { status: 'loading', user: null };

type Reject = { rejectValue: ApiFailure };

export function deviceInfo() {
  return {
    device_name: Device.modelName ?? Device.deviceName ?? '',
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'other',
  };
}

/** Keep the token, take the account's language, and say who it is. */
async function accept(res: SignedIn, dispatch: (a: unknown) => unknown) {
  await tokenStore.set(res.token);
  if (res.user.language === 'en' || res.user.language === 'ig') dispatch(languageFromAccount(res.user.language));
  return res.user;
}

/** On launch: a saved token means signed in, if the server still agrees. */
export const restoreSession = createAsyncThunk<User | null, void, Reject>('session/restore', async (_, { dispatch }) => {
  if (!(await tokenStore.get())) return null;
  try {
    const user = await api<User>('/me/');
    if (user.language === 'en' || user.language === 'ig') dispatch(languageFromAccount(user.language));
    return user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) await tokenStore.clear();
    return null;
  }
});

export const signIn = createAsyncThunk<User, { username: string; password: string }, Reject>(
  'session/signIn',
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api<SignedIn>('/auth/token/', { method: 'POST', auth: false, body: { username, password, ...deviceInfo() } });
      return await accept(res, dispatch);
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

export type SignUpData = { name: string; phone: string; email?: string; password: string };

/** A new free account. Returns the code check when a code was sent, else signs straight in. */
export const signUp = createAsyncThunk<{ user: User | null; check: CodeCheck | null }, SignUpData, Reject>(
  'session/signUp',
  async (data, { dispatch, rejectWithValue }) => {
    try {
      const res = await api<SignedIn | CodeCheck>('/auth/signup/', { method: 'POST', auth: false, body: { ...data, ...deviceInfo() } });
      if ('token' in res) return { user: await accept(res, dispatch), check: null };
      return { user: null, check: res };
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

export const verifyCode = createAsyncThunk<User | null, { check: string; code: string }, Reject>(
  'session/verifyCode',
  async ({ check, code }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api<SignedIn | Record<string, unknown>>(`/codes/${check}/verify/`, {
        method: 'POST',
        auth: false,
        body: { code, ...deviceInfo() },
      });
      return res && 'token' in res ? await accept(res as SignedIn, dispatch) : null;
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

/** Signing out on the phone works even offline. */
export const signOut = createAsyncThunk('session/signOut', async () => {
  await api('/me/push-token/', { method: 'DELETE' }).catch(() => undefined);
  await api('/auth/logout/', { method: 'POST' }).catch(() => undefined);
  await tokenStore.clear();
});

export const refreshMe = createAsyncThunk<User, void, Reject>('session/refresh', async (_, { rejectWithValue }) => {
  try {
    return await api<User>('/me/');
  } catch (e) {
    return rejectWithValue(toFailure(e));
  }
});

export type MePatch = Partial<Pick<User, 'first_name' | 'last_name' | 'email' | 'preferred_channel' | 'language'>>;

export const updateMe = createAsyncThunk<User, MePatch, Reject>('session/update', async (patch, { rejectWithValue }) => {
  try {
    return await api<User>('/me/', { method: 'PATCH', body: patch });
  } catch (e) {
    return rejectWithValue(toFailure(e));
  }
});

/** Set (a photo's uri) or remove (null) the profile photo. */
export const setPhoto = createAsyncThunk<User, string | null, Reject>('session/photo', async (uri, { rejectWithValue }) => {
  try {
    if (uri === null) return await api<User>('/me/photo/', { method: 'DELETE' });
    const form = new FormData();
    form.append('photo', photoPart(uri));
    return await api<User>('/me/photo/', { method: 'POST', body: form });
  } catch (e) {
    return rejectWithValue(toFailure(e));
  }
});

const session = createSlice({
  name: 'session',
  initialState,
  reducers: {
    /** The server said the token is no good any more (401). */
    signedOutByServer(state) {
      state.status = 'signed-out';
      state.user = null;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
  extraReducers: (b) => {
    const signedIn = (state: SessionState, user: User) => {
      state.user = user;
      state.status = 'signed-in';
    };
    b.addCase(restoreSession.fulfilled, (state, a) => {
      if (a.payload) signedIn(state, a.payload);
      else state.status = 'signed-out';
    });
    b.addCase(restoreSession.rejected, (state) => {
      state.status = 'signed-out';
    });
    b.addCase(signIn.fulfilled, (state, a) => signedIn(state, a.payload));
    b.addCase(signUp.fulfilled, (state, a) => {
      if (a.payload.user) signedIn(state, a.payload.user);
    });
    b.addCase(verifyCode.fulfilled, (state, a) => {
      if (a.payload) signedIn(state, a.payload);
    });
    b.addCase(signOut.fulfilled, (state) => {
      state.user = null;
      state.status = 'signed-out';
    });
    b.addCase(changeLanguage.fulfilled, (state, a) => {
      if (state.user) state.user.language = a.payload;
    });
    for (const thunk of [refreshMe, updateMe, setPhoto]) {
      b.addCase(thunk.fulfilled, (state, a) => {
        state.user = a.payload;
      });
    }
  },
});

export const { signedOutByServer, setUser } = session.actions;
export default session.reducer;
