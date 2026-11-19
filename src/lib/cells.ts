/** A console cell's value as text: people by name, dates readable, yes/no for booleans. */
export function cellText(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return (v as { name?: string; label?: string }).name ?? (v as { label?: string }).label ?? '—';
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}T/.test(s) ? new Date(s).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : s;
}
