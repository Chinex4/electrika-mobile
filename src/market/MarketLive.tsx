/**
 * Keeps the marketplace socket open while someone is signed in and the app
 * is in front, and marks the inbox and unread count stale when a message
 * arrives, so every screen showing them updates.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/auth/session';
import { useAppDispatch } from '@/store/hooks';
import { invalidate } from '@/store/slices/resources';

import { marketSocket, useMarketEvents } from './socket';

export function MarketLive() {
  const { status } = useSession();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (status !== 'signed-in') {
      marketSocket.stop();
      return;
    }
    marketSocket.start();
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? marketSocket.start() : marketSocket.stop()));
    return () => {
      sub.remove();
      marketSocket.stop();
    };
  }, [status]);

  useMarketEvents((e) => {
    if (e.type === 'message.new' || e.type === 'message.read' || e.type === 'offer.updated') {
      dispatch(invalidate(['/market/unread/', '/market/conversations/']));
    }
  });
  return null;
}
