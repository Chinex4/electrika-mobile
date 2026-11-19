/**
 * The app's Redux store (Redux Toolkit).
 *
 * - session: who is signed in (thunks: restoreSession, signIn, signUp, verifyCode, signOut, updateMe, setPhoto)
 * - settings: the language
 * - resources: server data cached by API path (fetchResource, performAction)
 * - cart: the Shop cart, kept on the phone
 * - journey: an engineer's duty, "on my way" and arrival
 * - console: the Program Manager's console lock
 *
 * A listener keeps the API client's language in step, saves the cart and
 * language on the phone, and tidies up when someone signs out.
 */
import { combineReducers, configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

import { setApiLanguage, tokenStore } from '@/api/client';

import cart, { addToCart, CART_KEY, clearCart, loadCart, priceCart, removeFromCart, setQty } from './slices/cart';
import consoleLock from './slices/console';
import journey from './slices/journey';
import resources, { clearResources, fetchResource, performAction } from './slices/resources';
import session, { signedOutByServer, signOut } from './slices/session';
import settings, { changeLanguage, LANG_KEY, languageFromAccount, loadLanguage } from './slices/settings';

export const rootReducer = combineReducers({ session, settings, resources, cart, journey, console: consoleLock });
export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloaded?: Partial<RootState>) {
  const listener = createListenerMiddleware();

  listener.startListening({
    matcher: isAnyOf(loadLanguage.fulfilled, changeLanguage.pending, languageFromAccount),
    effect: (action, api) => {
      const lang = (api.getState() as RootState).settings.lang;
      setApiLanguage(lang);
      if (languageFromAccount.match(action)) SecureStore.setItemAsync(LANG_KEY, lang).catch(() => undefined);
    },
  });

  listener.startListening({
    matcher: isAnyOf(addToCart, setQty, removeFromCart, clearCart, priceCart.fulfilled),
    effect: (_action, api) => {
      const { items, loaded } = (api.getState() as RootState).cart;
      if (loaded || items.length) SecureStore.setItemAsync(CART_KEY, JSON.stringify(items)).catch(() => undefined);
    },
  });

  // A 401 anywhere means this phone's sign-in has ended (signed out from the
  // console, or the password changed on another phone).
  listener.startListening({
    matcher: isAnyOf(fetchResource.rejected, performAction.rejected),
    effect: async (action, api) => {
      const status = ((action as { payload?: { status?: number } }).payload ?? {}).status;
      if (status === 401 && (api.getState() as RootState).session.status === 'signed-in') {
        await tokenStore.clear();
        api.dispatch(signedOutByServer());
      }
    },
  });

  listener.startListening({
    matcher: isAnyOf(signOut.fulfilled, signedOutByServer),
    effect: (_action, api) => {
      api.dispatch(clearResources());
    },
  });

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: preloaded as RootState | undefined,
    middleware: (getDefault) => getDefault().prepend(listener.middleware),
  });
  setApiLanguage(store.getState().settings.lang);
  return store;
}

export const store = makeStore();

/** Start-up: the saved language and cart. The session is restored by the root layout. */
export function bootStore(s: AppStore = store) {
  s.dispatch(loadLanguage());
  s.dispatch(loadCart());
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
