/**
 * Typed Redux hooks, and the two every screen uses:
 * - useResource(path): server data for a screen, fetched and kept fresh.
 * - useAction(): change something on the server, with a toast either way.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';

import { notify } from '@/lib/toast';
import type { ApiFailure } from '@/types/api';

import type { AppDispatch, AppStore, RootState } from './index';
import { selectEntry, selectLang } from './selectors';
import { fetchResource, performAction, type ActionArgs } from './slices/resources';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();

export type Resource<T> = {
  data: T | undefined;
  error: ApiFailure | undefined;
  /** First load, nothing to show yet. */
  isLoading: boolean;
  /** Pull-to-refresh, with data already showing. */
  isRefetching: boolean;
  refetch: () => void;
};

type ResourceOptions = {
  /** Refetch every so many ms while the screen is in view. */
  poll?: number;
  /** Public endpoints (no token sent). */
  auth?: boolean;
  /** Fetch again whenever the screen comes back into view. */
  refetchOnFocus?: boolean;
};

export function useResource<T>(path: string | null, { poll, auth = true, refetchOnFocus = true }: ResourceOptions = {}): Resource<T> {
  const dispatch = useAppDispatch();
  const entry = useAppSelector(selectEntry(path));
  const lang = useAppSelector(selectLang);
  const [pulling, setPulling] = useState(false);

  const load = useCallback(() => {
    if (!path) return Promise.resolve();
    return dispatch(fetchResource({ path, auth }));
  }, [dispatch, path, auth]);

  // First use, a language change, or marked stale by an action.
  const needs = !!path && (entry.status === 'idle' || entry.stale || (entry.status === 'succeeded' && entry.lang !== lang));
  useEffect(() => {
    if (needs) load();
  }, [needs, load]);

  // Coming back to the screen: quietly refresh if it's more than 20 s old.
  const fetchedAt = useRef(entry.fetchedAt);
  useEffect(() => {
    fetchedAt.current = entry.fetchedAt;
  }, [entry.fetchedAt]);
  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus || !path) return;
      if (fetchedAt.current && Date.now() - fetchedAt.current > 20_000) load();
    }, [refetchOnFocus, path, load]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!poll || !path) return;
      const id = setInterval(load, poll);
      return () => clearInterval(id);
    }, [poll, path, load]),
  );

  const refetch = useCallback(() => {
    setPulling(true);
    Promise.resolve(load()).finally(() => setPulling(false));
  }, [load]);

  return {
    data: entry.data as T | undefined,
    error: entry.status === 'failed' ? entry.error : undefined,
    isLoading: !!path && entry.data === undefined && entry.status !== 'failed',
    isRefetching: pulling,
    refetch,
  };
}

export type RunOptions = Omit<ActionArgs, 'path'> & {
  /** Toast the server's `detail` (or this text) on success. Default: true. */
  success?: boolean | string;
  /** Toast the error. Default: true. Form screens show field errors instead. */
  toastError?: boolean;
};

/**
 * Returns run(path, options) → the server's reply, or throws the failure
 * (already shown as a toast unless toastError is false).
 */
export function useAction() {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T = Record<string, unknown>>(path: string, { success = true, toastError = true, ...args }: RunOptions = {}): Promise<T> => {
      setBusy(true);
      try {
        const data = (await dispatch(performAction({ path, ...args })).unwrap()) as T;
        const detail = (data as { detail?: string } | null)?.detail;
        if (success) {
          const text = typeof success === 'string' ? success : detail;
          if (text) notify.success(text);
        }
        return data;
      } catch (e) {
        const failure = e as ApiFailure;
        if (toastError) notify.error(failure.message ?? String(e));
        throw failure;
      } finally {
        setBusy(false);
      }
    },
    [dispatch],
  );
  return { run, busy };
}

/** For forms: field errors from a failed action, by field name. */
export function fieldErrors(e: unknown): Record<string, string> {
  const errors = (e as ApiFailure | undefined)?.errors ?? {};
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v[0]]));
}
