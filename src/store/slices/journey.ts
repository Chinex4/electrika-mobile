/**
 * The engineer's day: on/off duty, "I'm on my way" (with location sharing)
 * and "I've arrived". Same rules as the website's job page.
 */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api, toFailure } from '@/api/client';
import { hereNow, sharingJob, startSharing, stopSharing, type SharingMode } from '@/tracking/journey';
import type { ApiFailure, Job } from '@/types/api';

import { invalidate } from './resources';

export type JourneyState = { jobId: number | null; sharing: SharingMode; busy: boolean; needsConsent: boolean };
const initialState: JourneyState = { jobId: null, sharing: 'off', busy: false, needsConsent: false };

type Reject = { rejectValue: ApiFailure };
type Reply = { job: Job; detail: string };

/** After a restart: still sharing for a job? */
export const resumeJourney = createAsyncThunk('journey/resume', async () => ({ jobId: await sharingJob() }));

/**
 * "I'm on my way". The first time, the server answers 428 until the
 * engineer agrees to share their location ({consent: true}).
 */
export const startJourney = createAsyncThunk<Reply & { sharing: SharingMode }, { jobId: number; consent?: boolean }, Reject>(
  'journey/start',
  async ({ jobId, consent }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api<Reply>(`/job/${jobId}/on-my-way/`, { method: 'POST', body: consent ? { consent: true } : {} });
      const sharing = await startSharing(jobId);
      dispatch(invalidate(['/tech/', `/job/${jobId}/`]));
      return { ...res, sharing };
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

/** "I've arrived": stops sharing, pins the site from here if location is on. */
export const arrive = createAsyncThunk<Reply, { jobId: number; pin?: boolean }, Reject>(
  'journey/arrive',
  async ({ jobId, pin = true }, { dispatch, rejectWithValue }) => {
    try {
      await stopSharing();
      const here = pin ? await hereNow() : null;
      const res = await api<Reply>(`/job/${jobId}/arrived/`, { method: 'POST', body: here ?? {} });
      dispatch(invalidate(['/tech/', `/job/${jobId}/`, '/dispatch/']));
      return res;
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

export const setDuty = createAsyncThunk<{ on_duty: boolean; detail: string }, boolean, Reject>(
  'journey/duty',
  async (on, { dispatch, rejectWithValue }) => {
    try {
      const res = await api<{ on_duty: boolean; detail: string }>('/tech/duty/', { method: 'POST', body: { on } });
      dispatch(invalidate(['/tech/', '/me/technician/']));
      return res;
    } catch (e) {
      return rejectWithValue(toFailure(e));
    }
  },
);

export const endSharing = createAsyncThunk('journey/end', async () => {
  await stopSharing();
});

const journey = createSlice({
  name: 'journey',
  initialState,
  reducers: {
    consentShown(state) {
      state.needsConsent = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(resumeJourney.fulfilled, (state, a) => {
      state.jobId = a.payload.jobId;
      state.sharing = a.payload.jobId ? 'background' : 'off';
    });
    b.addCase(startJourney.pending, (state) => {
      state.busy = true;
    });
    b.addCase(startJourney.fulfilled, (state, a) => {
      state.busy = false;
      state.needsConsent = false;
      state.jobId = a.meta.arg.jobId;
      state.sharing = a.payload.sharing;
    });
    b.addCase(startJourney.rejected, (state, a) => {
      state.busy = false;
      state.needsConsent = a.payload?.status === 428;
    });
    b.addCase(arrive.pending, (state) => {
      state.busy = true;
    });
    b.addCase(arrive.fulfilled, (state) => {
      state.busy = false;
      state.jobId = null;
      state.sharing = 'off';
    });
    b.addCase(arrive.rejected, (state) => {
      state.busy = false;
    });
    b.addCase(endSharing.fulfilled, (state) => {
      state.jobId = null;
      state.sharing = 'off';
    });
  },
});

export const { consentShown } = journey.actions;
export default journey.reducer;
