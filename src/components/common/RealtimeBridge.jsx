'use client';

import { useEffect, useRef } from 'react';
import { applyRealtimeEvent, buildRealtimeUrl } from '@/lib/realtimeClient';
import { refreshAdminGamesCatalog } from '@/lib/playerGamesCatalog';

const MAX_BACKOFF_MS = 8000;
const BASE_BACKOFF_MS = 400;

export default function RealtimeBridge() {
  const esRef = useRef(null);
  const backoffRef = useRef(BASE_BACKOFF_MS);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        esRef.current?.close();
      } catch {}

      const url = buildRealtimeUrl();
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => {
        backoffRef.current = BASE_BACKOFF_MS;
      };

      es.onmessage = (ev) => {
        if (!ev.data) return;
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.type === 'CONNECTED') return;
          applyRealtimeEvent(payload);
        } catch {
          /* ignore malformed */
        }
      };

      es.onerror = () => {
        try {
          es.close();
        } catch {}
        esRef.current = null;
        if (cancelled) return;
        const wait = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 1.6, MAX_BACKOFF_MS);
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connect, wait);
      };
    };

    const onGuestIdReady = () => {
      backoffRef.current = BASE_BACKOFF_MS;
      connect();
    };

    connect();
    window.addEventListener('pp-guest-chat-ready', onGuestIdReady);
    window.addEventListener('pp-player-session-ready', onGuestIdReady);

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimerRef.current);
      window.removeEventListener('pp-guest-chat-ready', onGuestIdReady);
      window.removeEventListener('pp-player-session-ready', onGuestIdReady);
      try {
        esRef.current?.close();
      } catch {}
      esRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onGames = () => refreshAdminGamesCatalog({ force: true }).catch(() => {});
    window.addEventListener('paradise-games-catalog-sync', onGames);
    return () => window.removeEventListener('paradise-games-catalog-sync', onGames);
  }, []);

  return null;
}
