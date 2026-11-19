/**
 * The Program Manager's admin console lock, per phone, the same as the
 * website's: type the password again to unlock, it locks itself after a
 * quiet spell, and any console request answered 423 locks it here too.
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api, toFailure } from '@/api/client';
import type { ApiFailure } from '@/types/api';

import { fetchResource } from './resources';

export type ConsoleState = { checked: boolean; unlocked: boolean; idleMinutes: number; blocked: boolean; unlocking: boolean };
const initialState: ConsoleState = { checked: false, unlocked: false, idleMinutes: 15, blocked: false, unlocking: false };

type StateReply = { unlocked: boolean; idle_minutes: number; blocked?: boolean };

export const checkConsole = createAsyncThunk<StateReply, void, { rejectValue: ApiFailure }>('console/check', async (_, { rejectWithValue }) => {
  try {
    return await api<StateReply>('/console/');
  } catch (e) {
    return rejectWithValue(toFailure(e));
  }
});

export const unlockConsole = createAsyncThunk<StateReply, string, { rejectValue: ApiFailure }>(
  'console/unlock',
  async (password, { rejectWithValue }) => {
    try {
      return await api<StateReply>('/console/unlock/', { method: 'POST', body: { password } });
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

export const lockConsole = createAsyncThunk('console/lock', async () => {
  await api('/console/lock/', { method: 'POST' }).catch(() => undefined);
});

const consoleSlice = createSlice({
  name: 'console',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(checkConsole.fulfilled, (state, a) => {
      state.checked = true;
      state.unlocked = a.payload.unlocked;
      state.idleMinutes = a.payload.idle_minutes;
      state.blocked = !!a.payload.blocked;
    });
    b.addCase(checkConsole.rejected, (state) => {
      state.checked = true;
      state.unlocked = false;
    });
    b.addCase(unlockConsole.pending, (state) => {
      state.unlocking = true;
    });
    b.addCase(unlockConsole.fulfilled, (state, a) => {
      state.unlocking = false;
      state.unlocked = true;
      state.blocked = false;
      state.idleMinutes = a.payload.idle_minutes;
    });
    b.addCase(unlockConsole.rejected, (state, a) => {
      state.unlocking = false;
      if (a.payload?.status === 429) state.blocked = true;
    });
    b.addCase(lockConsole.pending, (state) => {
      state.unlocked = false;
    });
    // A console page answered "locked": it timed out on the server.
    b.addCase(fetchResource.rejected, (state, a) => {
      if (a.payload?.status === 423 || (a.payload?.status === 403 && a.meta.arg.path.startsWith('/console/'))) state.unlocked = false;
    });
  },
});

export default consoleSlice.reducer;
