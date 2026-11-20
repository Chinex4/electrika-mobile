/** Reading the store. Screens use these through useAppSelector. */
import { createSelector } from '@reduxjs/toolkit';

import { HOME_FOR } from '@/auth/roles';
import type { Role } from '@/types/api';

import type { RootState } from './index';
import type { Entry } from './slices/resources';

export const selectSession = (s: RootState) => s.session;
export const selectUser = (s: RootState) => s.session.user;
export const selectSessionStatus = (s: RootState) => s.session.status;
export const selectRole = (s: RootState): Role | null => s.session.user?.role ?? null;
export const selectHome = (s: RootState) => (s.session.user ? HOME_FOR[s.session.user.role] : '/sign-in');
export const selectIsCustomer = (s: RootState) => s.session.user?.role === 'CLIENT';
export const selectHasPlan = (s: RootState) => !!s.session.user?.client?.has_plan;

export const selectLang = (s: RootState) => s.settings.lang;
export const selectThemePref = (s: RootState) => s.settings.theme;

const EMPTY: Entry = { status: 'idle' };
export const selectEntry = (path: string | null) => (s: RootState): Entry => (path ? (s.resources.entries[path] ?? EMPTY) : EMPTY);

export const selectCartItems = (s: RootState) => s.cart.items;
export const selectCartCount = createSelector(selectCartItems, (items) => items.reduce((n, i) => n + i.qty, 0));
/** Before the server prices it: the sum of known prices (quote-only items have none). */
export const selectCartEstimate = createSelector(selectCartItems, (items) =>
  items.reduce((sum, i) => sum + (i.price ? Number(i.price) * i.qty : 0), 0),
);
export const selectCartQty = (productId: number) => (s: RootState) => s.cart.items.find((i) => i.product_id === productId)?.qty ?? 0;
export const selectPricedCart = (s: RootState) => s.cart.priced;

export const selectJourney = (s: RootState) => s.journey;
export const selectConsole = (s: RootState) => s.console;
