import { translate } from '@/i18n';
import { en, ig } from '@/i18n/strings';

describe('English and Igbo', () => {
  it('fills in values', () => {
    expect(translate('en', 'home.response', { h: 3 })).toBe('We respond within 3 hours');
    expect(translate('en', 'shop.deliveryFee', { fee: '₦1,500', days: 'next day' })).toBe('Delivery ₦1,500, usually next day.');
  });

  it('uses Igbo where there is a translation, else English', () => {
    expect(translate('ig', 'tab.home')).toBe('Ụlọ');
    expect(translate('ig', 'common.all')).toBe('Niile');
    expect(translate('ig', 'console.sub')).toBe(en['console.sub']);
  });

  it('falls back to the key for unknown text, so nothing shows blank', () => {
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });

  it('has an English text for every Igbo one', () => {
    const missing = Object.keys(ig).filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it('keeps the same {placeholders} in Igbo as in English', () => {
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    const wrong = Object.entries(ig).filter(([k, v]) => v && holes(v) !== holes((en as Record<string, string>)[k]));
    expect(wrong.map(([k]) => k)).toEqual([]);
  });
});

describe('placeholders', () => {
  it('every placeholder key used on a screen has English text', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const used = new Set<string>();
    for (const f of walk(path.join(__dirname, '..', 'src')).filter((f) => f.endsWith('.tsx'))) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/placeholder=\{t\('([^']+)'\)\}/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(40);
    expect([...used].filter((k) => !(k in en))).toEqual([]);
  });
});
