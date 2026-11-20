import { Appearance } from 'react-native';

import palette from '@/theme/palette';
import { applyTheme } from '@/store';
import { setTheme } from '@/store/slices/settings';

import { freshStore } from './helpers';

/** WCAG contrast ratio between two #RRGGBB colours. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('colours', () => {
  it.each(['light', 'dark'] as const)('%s: text is readable on every background', (name) => {
    const t = palette[name];
    for (const bg of [t.page, t.surface, t.mist]) {
      expect(contrast(t.navy, bg)).toBeGreaterThanOrEqual(7); // headings
      expect(contrast(t.ink, bg)).toBeGreaterThanOrEqual(7); // body
      expect(contrast(t.muted, bg)).toBeGreaterThanOrEqual(4.5); // secondary
      expect(contrast(t.accent, bg)).toBeGreaterThanOrEqual(4.5); // links
    }
    expect(contrast(t.faint, t.surface)).toBeGreaterThanOrEqual(3); // placeholders
    for (const [bg, ink] of [['alert-bg', 'alert-ink'], ['amber-bg', 'amber-ink'], ['leaf-bg', 'leaf-ink']]) {
      expect(contrast(t[ink], t[bg])).toBeGreaterThanOrEqual(4.5); // pills and banners
    }
  });

  it('white text stays readable on the brand fills in both themes', () => {
    for (const fill of [palette.fixed.brand, palette.fixed['navy-fill']]) {
      expect(contrast('#FFFFFF', fill)).toBeGreaterThanOrEqual(4.5);
    }
    // The brand red is 4.4:1 with white (bold labels only); kept as the brand colour.
    expect(contrast('#FFFFFF', palette.fixed.alert)).toBeGreaterThanOrEqual(4.4);
  });

  it('every themed colour has a light and a dark value', () => {
    expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort());
  });
});

describe('theme setting', () => {
  it('is System by default, and a choice is handed to the system', () => {
    const spy = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
    const store = freshStore();
    expect(store.getState().settings.theme).toBe('system');
    store.dispatch(setTheme('dark'));
    expect(store.getState().settings.theme).toBe('dark');
    expect(spy).toHaveBeenLastCalledWith('dark');
    applyTheme('system');
    expect(spy).toHaveBeenLastCalledWith('unspecified');
    spy.mockRestore();
  });
});
