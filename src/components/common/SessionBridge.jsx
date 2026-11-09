'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { fetchCurrentUser, getCachedUser, mergePlayerUser } from '@/lib/authClient';
import { fetchPublicSettings, prefetchPublicSettings } from '@/lib/publicSettingsClient';
import { prefetchWinsTicker } from '@/lib/winsTickerClient';
import { prefetchPaymentMethods } from '@/lib/paymentMethodsClient';

/**
 * Keeps client UI in sync with the httpOnly session cookie after client-side navigation.
 * Without this, pages can render with stale user=null until a full refresh.
 */
export default function SessionBridge() {
  const pathname = usePathname();

  useEffect(() => {
    prefetchPublicSettings();
    prefetchWinsTicker();
    prefetchPaymentMethods();

    const onSettingsSync = () => {
      fetchPublicSettings({ force: true }).catch(() => {});
    };
    const onGatewaysSync = () => {
      prefetchPaymentMethods();
    };
    window.addEventListener('paradise-public-settings-sync', onSettingsSync);
    window.addEventListener('paradise-games-catalog-sync', onGatewaysSync);
    window.addEventListener('paradise-cashier-refresh', onGatewaysSync);
    return () => {
      window.removeEventListener('paradise-public-settings-sync', onSettingsSync);
      window.removeEventListener('paradise-games-catalog-sync', onGatewaysSync);
      window.removeEventListener('paradise-cashier-refresh', onGatewaysSync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const data = await fetchCurrentUser();
        if (cancelled || typeof window === 'undefined') return;
        if (data?.authenticated && data?.user) {
          const merged = mergePlayerUser(data.user);
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: merged }));
          window.dispatchEvent(new CustomEvent('pp-player-session-ready'));
        } else {
          const cached = getCachedUser();
          if (cached) {
            window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: cached }));
          } else {
            window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: null }));
          }
        }
      } catch {
        if (!cancelled && typeof window !== 'undefined') {
          const cached = getCachedUser();
          if (cached) {
            window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: cached }));
          }
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
