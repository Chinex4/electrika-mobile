/**
 * English and Igbo. The choice lives in the store (settings slice): kept on
 * the phone, synced to the account (PATCH /api/me/ {language}) when signed
 * in, and sent with every request (Accept-Language) so the server's own
 * messages come back in it too.
 */
import { useCallback } from 'react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectLang } from '@/store/selectors';
import { changeLanguage } from '@/store/slices/settings';
import type { Lang } from '@/types/api';

import { en, ig, type StringKey } from './strings';

export type { Lang };
export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: string, vars?: Vars) {
  const table = lang === 'ig' ? (ig as Record<string, string>) : {};
  let text: string = table[key] ?? (en as Record<string, string>)[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

export function useLanguage() {
  const lang = useAppSelector(selectLang);
  const dispatch = useAppDispatch();
  const setLang = useCallback((next: Lang) => dispatch(changeLanguage(next)), [dispatch]);
  return { lang, setLang };
}

export function useT() {
  const lang = useAppSelector(selectLang);
  return useCallback((key: StringKey | (string & {}), vars?: Vars) => translate(lang, key, vars), [lang]);
}
