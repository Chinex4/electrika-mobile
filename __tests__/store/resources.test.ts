import { tokenStore } from '@/api/client';
import { selectEntry } from '@/store/selectors';
import { fetchResource, invalidate, performAction } from '@/store/slices/resources';
import { signIn } from '@/store/slices/session';

import { freshStore, mockFetch, user } from '../helpers';

describe('server data in the store', () => {
  beforeEach(async () => {
    await tokenStore.clear();
  });

  it('caches a GET by path, with the language it came in', async () => {
    mockFetch({ '/customer/home/': { body: { name: 'Ada' } } });
    const store = freshStore();
    await store.dispatch(fetchResource({ path: '/customer/home/' }));
    const entry = selectEntry('/customer/home/')(store.getState());
    expect(entry.status).toBe('succeeded');
    expect(entry.data).toEqual({ name: 'Ada' });
    expect(entry.lang).toBe('en');
  });

  it('keeps the readable error the server sent', async () => {
    mockFetch({ '/tech/jobs/': { status: 403, body: { detail: "This isn't part of your account." } } });
    const store = freshStore();
    await store.dispatch(fetchResource({ path: '/tech/jobs/' }));
    const entry = selectEntry('/tech/jobs/')(store.getState());
    expect(entry.status).toBe('failed');
    expect(entry.error).toEqual({ message: "This isn't part of your account.", status: 403, errors: undefined });
  });

  it('says so plainly when offline', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const store = freshStore();
    await store.dispatch(fetchResource({ path: '/config/' }));
    expect(selectEntry('/config/')(store.getState()).error?.status).toBe(0);
    expect(selectEntry('/config/')(store.getState()).error?.message).toMatch(/couldn't reach ElectriKa/);
  });

  it('marks matching paths stale after an action, and sends the token', async () => {
    const { calls } = mockFetch({
      '/auth/token/': { body: { token: 'tok-123', user } },
      '/tech/duty/': { body: { on_duty: true, detail: "You're on duty." } },
      '/tech/jobs/': { body: { jobs: [] } },
    });
    const store = freshStore();
    await store.dispatch(signIn({ username: 'ada', password: 'pw' }));
    await store.dispatch(fetchResource({ path: '/tech/jobs/' }));
    const res = await store.dispatch(performAction({ path: '/tech/duty/', body: { on: true }, invalidate: ['/tech/'] })).unwrap();
    expect(res).toEqual({ on_duty: true, detail: "You're on duty." });
    expect(selectEntry('/tech/jobs/')(store.getState()).stale).toBe(true);
    const duty = calls.find((c) => c.path === '/tech/duty/');
    expect((duty?.init?.headers as Record<string, string>).Authorization).toBe('Token tok-123');
  });

  it('sends the chosen language with every request', async () => {
    const { calls } = mockFetch({ '/plans/': { body: { results: [] } } });
    const store = freshStore({ settings: { lang: 'ig', loaded: true, theme: 'system' } });
    await store.dispatch(fetchResource({ path: '/plans/', auth: false }));
    expect((calls[0].init?.headers as Record<string, string>)['Accept-Language']).toBe('ig');
  });

  it('signs the phone out when the server says the token is no good', async () => {
    mockFetch({ '/auth/token/': { body: { token: 'tok', user } }, '/customer/home/': { status: 401, body: { detail: 'Signed out.' } } });
    const store = freshStore();
    await store.dispatch(signIn({ username: 'ada', password: 'pw' }));
    await store.dispatch(fetchResource({ path: '/customer/home/' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(store.getState().session.status).toBe('signed-out');
    expect(await tokenStore.get()).toBeNull();
    expect(store.getState().resources.entries).toEqual({});
  });

  it('can be invalidated by hand', () => {
    const store = freshStore({
      resources: { entries: { '/office/orders/?show=open': { status: 'succeeded', data: {} }, '/shop/': { status: 'succeeded', data: {} } } },
    });
    store.dispatch(invalidate(['/office/']));
    expect(store.getState().resources.entries['/office/orders/?show=open'].stale).toBe(true);
    expect(store.getState().resources.entries['/shop/'].stale).toBeFalsy();
  });
});
