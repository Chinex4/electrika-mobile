/**
 * Server data, cached by API path. Screens read it with useResource(path)
 * (src/store/hooks.ts), which fetches on first use, again when the language
 * changes (the server's words come back in it) and again after an action
 * marks it stale. Actions (POST/PATCH/DELETE) go through performAction.
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { api, toFailure, type Method } from '@/api/client';
import type { ApiFailure, Lang } from '@/types/api';

export type Entry = {
  data?: unknown;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: ApiFailure;
  fetchedAt?: number;
  lang?: Lang;
  stale?: boolean;
};

export type ResourcesState = { entries: Record<string, Entry> };
const initialState: ResourcesState = { entries: {} };

type ThunkConfig = { state: { resources: ResourcesState; settings: { lang: Lang } }; rejectValue: ApiFailure };

export const fetchResource = createAsyncThunk<{ data: unknown; lang: Lang }, { path: string; auth?: boolean }, ThunkConfig>(
  'resources/fetch',
  async ({ path, auth = true }, { getState, rejectWithValue }) => {
    const lang = getState().settings.lang;
    try {
      return { data: await api(path, { auth }), lang };
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
  { condition: ({ path }, { getState }) => getState().resources.entries[path]?.status !== 'loading' },
);

export type ActionArgs = {
  path: string;
  method?: Method;
  body?: unknown;
  auth?: boolean;
  /** Cached paths starting with any of these are fetched again afterwards. */
  invalidate?: string[];
};

/** Change something on the server, then refresh what it affects. */
export const performAction = createAsyncThunk<unknown, ActionArgs, ThunkConfig>(
  'resources/perform',
  async ({ path, method = 'POST', body, auth = true, invalidate: prefixes }, { dispatch, rejectWithValue }) => {
    try {
      const data = await api(path, { method, body, auth });
      if (prefixes?.length) dispatch(invalidate(prefixes));
      return data;
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

const resources = createSlice({
  name: 'resources',
  initialState,
  reducers: {
    /** Mark cached paths stale; any screen showing them fetches again. */
    invalidate(state, action: PayloadAction<string[]>) {
      for (const key of Object.keys(state.entries)) {
        if (action.payload.some((prefix) => key.startsWith(prefix))) state.entries[key].stale = true;
      }
    },
    /** Put a fresh copy straight in, e.g. the record an action returned. */
    setResource(state, action: PayloadAction<{ path: string; data: unknown }>) {
      const old = state.entries[action.payload.path];
      state.entries[action.payload.path] = { ...old, status: 'succeeded', data: action.payload.data, fetchedAt: Date.now(), stale: false };
    },
    clearResources() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchResource.pending, (state, action) => {
      const path = action.meta.arg.path;
      state.entries[path] = { ...state.entries[path], status: 'loading' };
    });
    b.addCase(fetchResource.fulfilled, (state, action) => {
      state.entries[action.meta.arg.path] = {
        status: 'succeeded',
        data: action.payload.data,
        lang: action.payload.lang,
        fetchedAt: Date.now(),
        stale: false,
      };
    });
    b.addCase(fetchResource.rejected, (state, action) => {
      const path = action.meta.arg.path;
      state.entries[path] = {
        ...state.entries[path],
        status: 'failed',
        stale: false,
        error: action.payload ?? { message: action.error.message ?? 'Something went wrong.', status: -1 },
      };
    });
  },
});

export const { invalidate, setResource, clearResources } = resources.actions;
export default resources.reducer;
