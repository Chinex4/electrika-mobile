import { ago, day, jobTone, naira, plural, slaTone } from '@/lib/format';

describe('format', () => {
  it('shows naira without kobo, with thousands separators', () => {
    expect(naira('180000.00')).toBe('₦180,000');
    expect(naira(2500)).toBe('₦2,500');
    expect(naira(null)).toBe('–');
    expect(naira('')).toBe('–');
  });

  it('says how long ago', () => {
    const now = new Date('2026-11-19T12:00:00Z');
    expect(ago('2026-11-19T11:59:40Z', now)).toBe('just now');
    expect(ago('2026-11-19T11:30:00Z', now)).toBe('30 min ago');
    expect(ago('2026-11-19T09:00:00Z', now)).toBe('3 h ago');
    expect(ago(null, now)).toBe('');
  });

  it('formats a day and survives bad input', () => {
    expect(day('2026-11-04')).toMatch(/2026/);
    expect(day('not a date')).toBe('not a date');
  });

  it('picks a tone for each job status and response state', () => {
    expect(jobTone('COMPLETED')).toBe('leaf');
    expect(jobTone('CANCELLED')).toBe('grey');
    expect(jobTone('EN_ROUTE')).toBe('brand');
    expect(jobTone('ASSIGNED')).toBe('amber');
    expect(slaTone('BREACHED')).toBe('alert');
    expect(slaTone('MET')).toBe('leaf');
  });

  it('pluralises', () => {
    expect(plural(1, 'visit', 'visits')).toBe('1 visit');
    expect(plural(3, 'visit', 'visits')).toBe('3 visits');
  });
});
