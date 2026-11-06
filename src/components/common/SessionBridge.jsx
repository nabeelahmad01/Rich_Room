'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Keeps client UI in sync with the httpOnly session cookie after client-side navigation.
 * Without this, pages can render with stale user=null until a full refresh.
 */
export default function SessionBridge() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json();
        if (cancelled || typeof window === 'undefined') return;
        if (data.authenticated && data.user) {
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: data.user }));
        } else {
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: null }));
        }
      } catch {
        if (!cancelled && typeof window !== 'undefined') {
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
