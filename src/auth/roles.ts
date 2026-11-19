import type { Href } from 'expo-router';

import type { Role } from '@/types/api';

/**
 * Each role's own part of the app. Everyone signs in to the same app; the
 * dashboard and tabs follow their responsibilities, as on the website.
 * The Program Manager is the super admin: everything, plus the console.
 */
export const HOME_FOR: Record<Role, Href> = {
  CLIENT: '/customer',
  TECHNICIAN: '/tech',
  DISPATCH_COORDINATOR: '/dispatch',
  ACCOUNT_MANAGER: '/am',
  ACCOUNTS: '/accounts',
  ADMIN: '/pm',
};

export const AREA_ROLE: Record<string, Role> = {
  customer: 'CLIENT',
  tech: 'TECHNICIAN',
  dispatch: 'DISPATCH_COORDINATOR',
  am: 'ACCOUNT_MANAGER',
  accounts: 'ACCOUNTS',
  pm: 'ADMIN',
};

/** Office roles that may coordinate jobs (assign, cancel, sign off reports). */
export const COORDINATORS: Role[] = ['ADMIN', 'DISPATCH_COORDINATOR'];
