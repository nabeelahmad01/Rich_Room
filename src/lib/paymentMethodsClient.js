/**
 * Admin-configured deposit gateways only — session cache for instant paint, deduped fetch.
 */

import { fetchJsonQuick } from '@/lib/fetchWithTimeout';
import {
  CACHE_KEYS,
  readSessionCache,
  readLocalCache,
  writeSessionCache,
  writeLocalCache,
} from '@/lib/playerDataCache';

const SESSION_TTL_MS = 10 * 60 * 1000;
const LOCAL_TTL_MS = 30 * 60 * 1000;

let inFlight = null;
let lastFetchAt = 0;

/** Instant read (stale session OK) for deposit / cashier UI. */
export function readPaymentMethodsInstant() {
  if (typeof window === 'undefined') return null;
  const freshSession = readSessionCache(CACHE_KEYS.PAYMENT_METHODS, '', SESSION_TTL_MS);
  if (freshSession?.length) return freshSession;
  const staleSession = readSessionCache(CACHE_KEYS.PAYMENT_METHODS, '', 0);
  if (staleSession?.length) return staleSession;
  const local = readLocalCache(CACHE_KEYS.PAYMENT_METHODS, '', LOCAL_TTL_MS);
  return local?.length ? local : null;
}

function writePaymentMethodsAll(methods) {
  if (!Array.isArray(methods) || methods.length === 0) return;
  writeSessionCache(CACHE_KEYS.PAYMENT_METHODS, methods);
  writeLocalCache(CACHE_KEYS.PAYMENT_METHODS, methods);
}

/** Only gateways marked active in admin — no demo / seed rows. */
export function filterAdminActiveMethods(methods) {
  if (!Array.isArray(methods)) return [];
  return methods.filter((m) => m && m.isActive !== false);
}

/**
 * @returns {Promise<Array>}
 */
export async function fetchPaymentMethods({ force = false, timeoutMs = 8000 } = {}) {
  const cached = readPaymentMethodsInstant();
  if (!force && cached?.length) {
    return cached;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data } = await fetchJsonQuick(
        '/api/payments/methods',
        { credentials: 'include', cache: 'no-store' },
        timeoutMs
      );
      if (!data?.success) {
        return readPaymentMethodsInstant() || [];
      }
      const methods = filterAdminActiveMethods(data.methods || []);
      if (methods.length > 0) {
        writePaymentMethodsAll(methods);
      } else {
        try {
          sessionStorage.removeItem(CACHE_KEYS.PAYMENT_METHODS);
          localStorage.removeItem(CACHE_KEYS.PAYMENT_METHODS);
        } catch {}
      }
      lastFetchAt = Date.now();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('paradise-payment-methods', { detail: { methods } })
        );
      }
      return methods;
    } catch {
      return readPaymentMethodsInstant() || [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Call once on app load so /deposit shows gateways immediately. */
export function prefetchPaymentMethods() {
  if (typeof window === 'undefined') return;
  if (readSessionCache(CACHE_KEYS.PAYMENT_METHODS, '', SESSION_TTL_MS)?.length) {
    fetchPaymentMethods({ force: true }).catch(() => {});
    return;
  }
  fetchPaymentMethods({ force: true }).catch(() => {});
}
