/** Test helpers: a fake fetch that answers by path, and a fresh store. */
import { makeStore } from '@/store';

type Reply = { status?: number; body?: unknown } | ((init: RequestInit | undefined) => { status?: number; body?: unknown });

export function mockFetch(routes: Record<string, Reply>) {
  const calls: { path: string; init?: RequestInit }[] = [];
  const fn = jest.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace(/^https?:\/\/[^/]+\/api/, '');
    calls.push({ path, init });
    const key = Object.keys(routes).find((k) => path === k || path.startsWith(k));
    if (!key) return new Response(JSON.stringify({ detail: `No mock for ${path}` }), { status: 404 });
    const r = routes[key];
    const { status = 200, body = {} } = typeof r === 'function' ? r(init) : r;
    return new Response(JSON.stringify(body), { status });
  });
  global.fetch = fn as unknown as typeof fetch;
  return { fn, calls };
}

export function freshStore(preloaded?: Parameters<typeof makeStore>[0]) {
  return makeStore(preloaded);
}

export const user = {
  id: 7,
  name: 'Ada Obi',
  first_name: 'Ada',
  last_name: 'Obi',
  phone: '08030000000',
  role: 'CLIENT' as const,
  avatar_url: null,
  initials: 'AO',
  username: 'ada',
  email: 'ada@example.com',
  phone_number: '08030000000',
  phone_verified: true,
  role_label: 'Client',
  language: 'en' as const,
  preferred_channel: 'SMS',
  is_office: false,
  can_use_console: false,
  client: { id: 3, name: 'Ada Obi', has_plan: false, account_manager: null },
};
