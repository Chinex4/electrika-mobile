import { selectConsole } from '@/store/selectors';
import { checkConsole, lockConsole, unlockConsole } from '@/store/slices/console';
import { fetchResource } from '@/store/slices/resources';

import { freshStore, mockFetch } from '../helpers';

describe('console lock', () => {
  it('unlocks with the password and locks again', async () => {
    mockFetch({
      '/console/unlock/': { body: { unlocked: true, idle_minutes: 20 } },
      '/console/lock/': { body: { unlocked: false } },
      '/console/': { body: { unlocked: false, idle_minutes: 20, blocked: false } },
    });
    const store = freshStore();
    await store.dispatch(checkConsole());
    expect(selectConsole(store.getState())).toMatchObject({ checked: true, unlocked: false });
    await store.dispatch(unlockConsole('secret'));
    expect(selectConsole(store.getState())).toMatchObject({ unlocked: true, idleMinutes: 20 });
    await store.dispatch(lockConsole());
    expect(selectConsole(store.getState()).unlocked).toBe(false);
  });

  it('shows the 15-minute block after too many wrong passwords', async () => {
    mockFetch({ '/console/unlock/': { status: 429, body: { detail: 'Too many wrong passwords.' } } });
    const store = freshStore();
    const res = await store.dispatch(unlockConsole('nope'));
    expect(res.payload).toMatchObject({ status: 429 });
    expect(selectConsole(store.getState()).blocked).toBe(true);
  });

  it('locks itself here when a console page is refused (idle timeout on the server)', async () => {
    mockFetch({ '/console/unlock/': { body: { unlocked: true, idle_minutes: 20 } }, '/console/overview/': { status: 403, body: { detail: 'The console is locked.' } } });
    const store = freshStore();
    await store.dispatch(unlockConsole('secret'));
    await store.dispatch(fetchResource({ path: '/console/overview/' }));
    expect(selectConsole(store.getState()).unlocked).toBe(false);
  });
});
