/**
 * ElectriKa in the app (25 Nov 2026): push taps and shared links land
 * on the right screen, the socket address is right, and every marketplace
 * text the screens use exists.
 */
import fs from 'fs';
import path from 'path';

import { en } from '@/i18n/strings';
import { socketUrl } from '@/market/socket';
import { routeForNotification } from '@/notifications/route';

const SRC = path.join(__dirname, '..', 'src');

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : [],
  );
}

describe('marketplace', () => {
  it('opens marketplace notifications on the matching screen', () => {
    expect(routeForNotification('/market/messages/12/', 'CLIENT')).toBe('/market/messages/12');
    expect(routeForNotification('https://electrika.ng/market/vendor/plan/', 'CLIENT')).toBe('/market/vendor/plan');
    expect(routeForNotification('/market/vendor/listings/7/', 'CLIENT')).toBe('/market/vendor/listing/7');
    expect(routeForNotification('/market/vendor/', 'CLIENT')).toBe('/market/vendor');
    expect(routeForNotification('/store/bright-sparks/', 'CLIENT')).toBe('/store/bright-sparks');
    expect(routeForNotification('/market/item/deye-5kw/', 'CLIENT')).toBe('/market/item/deye-5kw');
  });

  it('builds the socket address from the API address', () => {
    expect(socketUrl('/ws/market/', 'a b')).toMatch(/^wss?:\/\/.+\/ws\/market\/\?ticket=a%20b$/);
    expect(socketUrl('/ws/market/', 'x')).not.toContain('/api/');
  });

  it('has every marketplace text the screens use', () => {
    const missing: string[] = [];
    for (const file of files(SRC)) {
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/t\('(mk\.[\w.]+)'/g)) {
        if (!(m[1] in en)) missing.push(`${path.relative(SRC, file)}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps the payment rule in front of buyers', () => {
    const notice = fs.readFileSync(path.join(SRC, 'components', 'market', 'index.tsx'), 'utf8');
    expect(notice).toContain('payment_notice');
    expect(en['mk.payDirect']).toContain("doesn't take or hold payment");
  });
});

describe('marketplace in Igbo', () => {
  it('has Igbo for every marketplace text, with the same {placeholders}', () => {
    const { marketEn } = jest.requireActual('@/i18n/market.en');
    const { marketIg } = jest.requireActual('@/i18n/market.ig');
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    const missing = Object.keys(marketEn).filter((k) => !(k in marketIg));
    const wrong = Object.keys(marketIg).filter((k) => k in marketEn && holes(marketIg[k]) !== holes((marketEn as Record<string, string>)[k]));
    expect(missing).toEqual([]);
    expect(wrong).toEqual([]);
  });
});
