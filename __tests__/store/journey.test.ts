jest.mock('@/tracking/journey', () => ({
  startSharing: jest.fn(async () => 'background'),
  stopSharing: jest.fn(async () => undefined),
  hereNow: jest.fn(async () => ({ lat: 6.45, lng: 7.5, accuracy: 12 })),
  sharingJob: jest.fn(async () => 42),
}));

import { selectJourney } from '@/store/selectors';
import { arrive, resumeJourney, setDuty, startJourney } from '@/store/slices/journey';
import { startSharing, stopSharing } from '@/tracking/journey';

import { freshStore, mockFetch } from '../helpers';

const job = { id: 42, status: 'EN_ROUTE' };

describe("an engineer's journey", () => {
  it('asks for consent first (428), then starts sharing', async () => {
    let consented = false;
    const { calls } = mockFetch({
      '/job/42/on-my-way/': (init) => {
        consented = JSON.parse(String(init?.body ?? '{}')).consent === true;
        return consented ? { body: { job, detail: 'Safe journey.' } } : { status: 428, body: { detail: 'Please agree to share your location.' } };
      },
    });
    const store = freshStore();
    const first = await store.dispatch(startJourney({ jobId: 42 }));
    expect(first.payload).toMatchObject({ status: 428 });
    expect(selectJourney(store.getState()).needsConsent).toBe(true);
    expect(startSharing).not.toHaveBeenCalled();

    await store.dispatch(startJourney({ jobId: 42, consent: true }));
    expect(selectJourney(store.getState())).toMatchObject({ jobId: 42, sharing: 'background', needsConsent: false });
    expect(startSharing).toHaveBeenCalledWith(42);
    expect(calls).toHaveLength(2);
  });

  it('arriving stops sharing and pins the site from here', async () => {
    const { calls } = mockFetch({ '/job/42/arrived/': { body: { job: { ...job, status: 'IN_PROGRESS' }, detail: 'Arrival noted.' } } });
    const store = freshStore({ journey: { jobId: 42, sharing: 'background', busy: false, needsConsent: false } });
    await store.dispatch(arrive({ jobId: 42 }));
    expect(stopSharing).toHaveBeenCalled();
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ lat: 6.45, lng: 7.5, accuracy: 12 });
    expect(selectJourney(store.getState())).toMatchObject({ jobId: null, sharing: 'off' });
  });

  it('switches duty, and picks a journey back up after a restart', async () => {
    mockFetch({ '/tech/duty/': { body: { on_duty: false, detail: "You're off duty." } } });
    const store = freshStore();
    const res = await store.dispatch(setDuty(false)).unwrap();
    expect(res.on_duty).toBe(false);
    await store.dispatch(resumeJourney());
    expect(selectJourney(store.getState()).jobId).toBe(42);
  });
});
