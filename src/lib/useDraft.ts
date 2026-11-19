import { useCallback, useState } from 'react';

/**
 * A form's values that start from `initial` and start again whenever
 * `resetKey` changes (a sheet opening, a record loading). This is React's
 * "adjust state when a prop changes" pattern, without an effect.
 */
export function useDraft<T>(initial: T, resetKey: string | number | boolean | null | undefined) {
  const [state, setState] = useState({ key: resetKey, value: initial });
  if (state.key !== resetKey) setState({ key: resetKey, value: initial });
  const value = state.key === resetKey ? state.value : initial;
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState((s) => ({ key: s.key, value: typeof next === 'function' ? (next as (p: T) => T)(s.value) : next }));
  }, []);
  return [value, set] as const;
}
