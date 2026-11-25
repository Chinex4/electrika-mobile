/**
 * ElectriKa's live socket (25 Nov 2026): one connection while the app is
 * open and someone is signed in. It carries live events only (new messages,
 * read receipts, offers, typing); messages are always sent with the API.
 *
 * Sign-in is a 60-second ticket from POST /market/ws-ticket/, so the
 * long-lived app token never goes in a URL. If the socket drops, it
 * reconnects after 1, 2, 4… up to 30 seconds; screens poll meanwhile
 * (see useLive).
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { api, API_URL, tokenStore } from '@/api/client';
import type { Message, Offer, Side } from '@/types/market';

export type MarketEvent =
  | { type: 'hello'; user: number }
  | { type: 'pong' }
  | { type: 'message.new'; conversation: number; message: Message; preview: string }
  | { type: 'message.read'; conversation: number; side: Side; read_at: string }
  | { type: 'offer.updated'; conversation: number; offer: Offer }
  | { type: 'typing'; conversation: number; side: Side }
  | { type: 'conversation.blocked'; conversation: number };

type Listener = (event: MarketEvent) => void;

export const socketUrl = (path: string, ticket: string) =>
  `${API_URL.replace(/\/api\/?$/, '').replace(/^http/, 'ws')}${path}?ticket=${encodeURIComponent(ticket)}`;

class MarketSocket {
  private ws: WebSocket | null = null;
  private wanted = false;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<() => void>();
  live = false;

  start() {
    this.wanted = true;
    if (!this.ws && !this.timer) void this.connect();
  }

  stop() {
    this.wanted = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.ws?.close();
    this.ws = null;
    this.setLive(false);
  }

  send(data: object) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(data));
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onStatus(listener: () => void) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setLive(live: boolean) {
    if (this.live === live) return;
    this.live = live;
    this.statusListeners.forEach((l) => l());
  }

  private later() {
    if (!this.wanted || this.timer) return;
    const wait = Math.min(30_000, 1000 * 2 ** this.retry++) + Math.random() * 500;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.connect();
    }, wait);
  }

  private async connect() {
    if (!this.wanted || this.ws) return;
    if (!(await tokenStore.get())) return;
    let ticket: { ticket: string; path: string };
    try {
      ticket = await api('/market/ws-ticket/', { method: 'POST' });
    } catch {
      this.later();
      return;
    }
    if (!this.wanted) return;
    const ws = new WebSocket(socketUrl(ticket.path, ticket.ticket));
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setLive(true);
      if (this.ping) clearInterval(this.ping);
      this.ping = setInterval(() => this.send({ type: 'ping' }), 30_000);
    };
    ws.onmessage = (e) => {
      let event: MarketEvent;
      try {
        event = JSON.parse(String(e.data));
      } catch {
        return;
      }
      this.listeners.forEach((l) => l(event));
    };
    ws.onclose = () => {
      if (this.ping) clearInterval(this.ping);
      this.ping = null;
      if (this.ws === ws) this.ws = null;
      this.setLive(false);
      this.later();
    };
    ws.onerror = () => ws.close();
  }
}

export const marketSocket = new MarketSocket();

/** Calls `handler` for each live event while the component is mounted. */
export function useMarketEvents(handler: Listener) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => marketSocket.on((e) => ref.current(e)), []);
}

/** Is the live socket connected right now? */
export function useLive() {
  return useSyncExternalStore(
    (cb) => marketSocket.onStatus(cb),
    () => marketSocket.live,
    () => false,
  );
}
