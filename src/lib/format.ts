/** Small formatting helpers shared by every dashboard. */

export type Tone = 'brand' | 'alert' | 'leaf' | 'amber' | 'grey';

export function naira(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '–';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return String(value);
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "3:40 pm" today, else "Tue 4 Nov, 3:40 pm". */
export function when(value: string | null | undefined, now = new Date()) {
  const d = asDate(value);
  if (!d) return value ?? '';
  const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

export function day(value: string | null | undefined) {
  const d = asDate(value);
  return d ? d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : (value ?? '');
}

/** "just now", "5 min ago", "3 h ago", else the day. */
export function ago(value: string | null | undefined, now = new Date()) {
  const d = asDate(value);
  if (!d) return '';
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return day(value);
}

export function jobTone(status: string): Tone {
  if (status === 'COMPLETED') return 'leaf';
  if (status === 'CANCELLED') return 'grey';
  if (status === 'EN_ROUTE' || status === 'IN_PROGRESS') return 'brand';
  if (status === 'AWAITING_SIGN_OFF') return 'amber';
  return 'amber';
}

export function slaTone(state: string | undefined): Tone {
  if (state === 'BREACHED') return 'alert';
  if (state === 'AT_RISK') return 'amber';
  if (state === 'MET') return 'leaf';
  return 'grey';
}

/** The website's colour words (blue, green, amber, grey) as app tones. */
export const WEB_TONE: Record<string, Tone> = { blue: 'brand', green: 'leaf', amber: 'amber', grey: 'grey', red: 'alert' };

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
