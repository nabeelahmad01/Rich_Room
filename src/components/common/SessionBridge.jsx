'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { readCachedPlayer } from '@/lib/playerSessionCache';
import { fetchCurrentUser } from '@/lib/authClient';

/**
 * Keeps client UI in sync with the httpOnly session cookie after client-side navigation.
 * Without this, pages can render with stale user=null until a full refresh.
 */
export default function SessionBridge() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const cached = readCachedPlayer();
    if (cached && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: cached }));
    }

    const sync = async () => {
      try {
        const data = await fetchCurrentUser();
        if (cancelled || typeof window === 'undefined') return;
        if (data?.authenticated && data?.user) {
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: data.user }));
        } else {
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: null }));
        }
      } catch {
        if (!cancelled && typeof window !== 'undefined' && !readCachedPlayer()) {
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: null }));
        }
      }
    };
    sync();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
