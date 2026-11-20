/**
 * Checks a form before it's sent, so people see what to fix next to the
 * field at once. The server still checks everything and has the last word:
 * its field errors are shown the same way (fieldErrors in store/hooks).
 *
 * Each rule returns an i18n key for the message, or null when it's fine.
 */
import { useCallback } from 'react';

import { translate, type Lang } from '@/i18n';
import { useAppSelector } from '@/store/hooks';
import { selectLang } from '@/store/selectors';

export type Rule = (value: string, all: Record<string, unknown>) => string | null;

const digits = (v: string) => v.replace(/\D/g, '');

/** A Nigerian mobile number however it's typed (the server's apps/front/phone.py rule). */
export function isNigerianMobile(v: string) {
  let d = digits(v);
  if (d.startsWith('234')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^[789]\d{9}$/.test(d);
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const rules = {
  required: ((v) => (v.trim() ? null : 'v.required')) as Rule,
  phone: ((v) => (!v.trim() || isNigerianMobile(v) ? null : 'v.phone')) as Rule,
  email: ((v) => (!v.trim() || isEmail(v) ? null : 'v.email')) as Rule,
  /** A phone number, an email or a username. */
  identifier: ((v) => {
    const t = v.trim();
    if (!t) return 'v.required';
    if (t.includes('@')) return isEmail(t) ? null : 'v.email';
    return null;
  }) as Rule,
  password: ((v) => (!v ? 'v.required' : v.length < 8 ? 'v.passwordShort' : /^\d+$/.test(v) ? 'v.passwordDigits' : null)) as Rule,
  code: ((v) => (digits(v).length === 6 ? null : 'v.code')) as Rule,
  sameAs:
    (other: string): Rule =>
    (v, all) =>
      v === String(all[other] ?? '') ? null : 'v.mismatch',
  minLength:
    (n: number): Rule =>
    (v) =>
      !v.trim() || v.trim().length >= n ? null : `v.min${n}`,
  amount: ((v) => (!v.trim() || /^\d+(\.\d{1,2})?$/.test(v.replace(/,/g, '').trim()) ? null : 'v.amount')) as Rule,
};

export type Schema<T> = Partial<Record<keyof T & string, Rule[]>>;

/** {field: message} for every field that fails its first broken rule. */
export function validate<T extends Record<string, unknown>>(values: T, schema: Schema<T>, lang: Lang): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, list] of Object.entries(schema) as [string, Rule[]][]) {
    const value = values[field];
    const text = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
    for (const rule of list) {
      const key = rule(text, values);
      if (key) {
        errors[field] = translate(lang, key);
        break;
      }
    }
  }
  return errors;
}

/** validate() in the app's current language. */
export function useValidate() {
  const lang = useAppSelector(selectLang);
  return useCallback(<T extends Record<string, unknown>>(values: T, schema: Schema<T>) => validate(values, schema, lang), [lang]);
}

/** Drops one field's error once the person changes that field. */
export const clearError = (setErrors: (fn: (e: Record<string, string>) => Record<string, string>) => void, field: string) =>
  setErrors((e) => {
    if (!(field in e)) return e;
    const next = { ...e };
    delete next[field];
    return next;
  });
