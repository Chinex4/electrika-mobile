import { useResource } from '@/store/hooks';
import type { Config } from '@/types/api';

/** The app's start-up settings from the server: areas, request choices, how to reach us. */
export function useConfig() {
  return useResource<Config>('/config/', { auth: false, refetchOnFocus: false });
}

export const FALLBACK_SUPPORT_PHONE = '0702 549 5897';
