import { tokenStore } from '@/api/client';
import { selectHome, selectRole, selectUser } from '@/store/selectors';
import { changeLanguage } from '@/store/slices/settings';
import { restoreSession, signIn, signOut, signUp, updateMe, verifyCode } from '@/store/slices/session';

import { freshStore, mockFetch, user } from '../helpers';

describe('session', () => {
  beforeEach(async () => {
    await tokenStore.clear();
  });

  it('signs in, keeps the token and sends each role home', async () => {
    const { calls } = mockFetch({ '/auth/token/': { body: { token: 'abc', user: { ...user, role: 'TECHNICIAN' } } } });
    const store = freshStore();
    await store.dispatch(signIn({ username: 'ada', password: 'pw' }));
    expect(store.getState().session.status).toBe('signed-in');
    expect(selectRole(store.getState())).toBe('TECHNICIAN');
    expect(selectHome(store.getState())).toBe('/tech');
    expect(await tokenStore.get()).toBe('abc');
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ username: 'ada', password: 'pw' });
  });

  it('gives back the server message when sign-in fails', async () => {
    mockFetch({ '/auth/token/': { status: 400, body: { detail: "Those details don't match an account." } } });
    const store = freshStore();
    const res = await store.dispatch(signIn({ username: 'x', password: 'y' }));
    expect(res.payload).toMatchObject({ status: 400, message: "Those details don't match an account." });
    expect(store.getState().session.status).not.toBe('signed-in');
  });

  it('takes the account language at sign-in', async () => {
    mockFetch({ '/auth/token/': { body: { token: 'abc', user: { ...user, language: 'ig' } } } });
    const store = freshStore();
    await store.dispatch(signIn({ username: 'ada', password: 'pw' }));
    expect(store.getState().settings.lang).toBe('ig');
  });

  it('sign-up returns the code check, then the code signs in', async () => {
    mockFetch({
      '/auth/signup/': { status: 202, body: { check: 'chk', purpose: 'SIGNUP', sent_by: 'EMAIL', sent_to: 'a***@example.com', can_email: false, resend_in: 40 } },
      '/codes/chk/verify/': { status: 201, body: { token: 'new', user } },
    });
    const store = freshStore();
    const res = await store.dispatch(signUp({ name: 'Ada', phone: '0803', password: 'longpassword' })).unwrap();
    expect(res.check?.check).toBe('chk');
    expect(store.getState().session.status).toBe('loading');
    await store.dispatch(verifyCode({ check: 'chk', code: '123456' }));
    expect(selectUser(store.getState())?.id).toBe(7);
  });

  it('restores a saved token, and drops one the server refuses', async () => {
    await tokenStore.set('saved');
    mockFetch({ '/me/': { body: user } });
    const store = freshStore();
    await store.dispatch(restoreSession());
    expect(store.getState().session.status).toBe('signed-in');

    mockFetch({ '/me/': { status: 401, body: { detail: 'no' } } });
    const other = freshStore();
    await other.dispatch(restoreSession());
    expect(other.getState().session.status).toBe('signed-out');
    expect(await tokenStore.get()).toBeNull();
  });

  it('signs out even when offline', async () => {
    mockFetch({ '/auth/token/': { body: { token: 'abc', user } } });
    const store = freshStore();
    await store.dispatch(signIn({ username: 'ada', password: 'pw' }));
    global.fetch = jest.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    await store.dispatch(signOut());
    expect(store.getState().session.status).toBe('signed-out');
    expect(await tokenStore.get()).toBeNull();
  });

  it('updates details and language on the account', async () => {
    const { calls } = mockFetch({
      '/auth/token/': { body: { token: 'abc', user } },
      '/me/': (init) => ({ body: { ...user, ...JSON.parse(String(init?.body ?? '{}')) } }),
    });
    const store = freshStore();
    await store.dispatch(signIn({ username: 'ada', password: 'pw' }));
    await store.dispatch(updateMe({ first_name: 'Adaeze' }));
    expect(selectUser(store.getState())?.first_name).toBe('Adaeze');
    await store.dispatch(changeLanguage('ig'));
    expect(store.getState().settings.lang).toBe('ig');
    expect(selectUser(store.getState())?.language).toBe('ig');
    expect(calls.filter((c) => c.path === '/me/').map((c) => c.init?.method)).toEqual(['PATCH', 'PATCH']);
  });
});
