/**
 * authClient.js - High-performance client-side auth & session manager
 * 1. Deduplicates simultaneous calls to /api/auth/me (3 calls become 1 call).
 * 2. Caches session in localStorage for 0ms instant page loads without UI flicker.
 * 3. Throttles rapid focus/sync triggers.
 */

const STORAGE_KEY = 'pp_player_session';
const LEGACY_KEY = 'pp_user_session';

let inFlightAuthPromise = null;
let lastAuthResponseTime = 0;
let lastAuthResult = null;

export function getCachedUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Call on logout so polls do not resurrect the old session for minutes. */
export function invalidateAuthCache() {
  lastAuthResult = { authenticated: false, user: null };
  lastAuthResponseTime = 0;
  inFlightAuthPromise = null;
  setCachedUser(null);
}

/** After login/register — skip redundant /api/auth/me round-trips. */
export function primeAuthCache(user) {
  if (!user) return;
  lastAuthResult = { authenticated: true, user };
  lastAuthResponseTime = Date.now();
  inFlightAuthPromise = null;
  setCachedUser(user);
}

export function setCachedUser(user) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.removeItem(LEGACY_KEY);
      if (user.email) {
        localStorage.setItem('pp_user_email', user.email);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem('pp_user_email');
    }
  } catch {}
}

/** Merge partial user patches without zeroing balance during optimistic updates. */
export function mergePlayerUser(patch, prev = null) {
  if (!patch) {
    const cached = getCachedUser();
    return prev || cached || null;
  }
  const base = { ...(prev || getCachedUser() || {}) };
  const nextBal =
    patch.balanceSC != null
      ? Number(patch.balanceSC)
      : patch.balance != null
        ? Number(patch.balance)
        : base.balanceSC != null
          ? Number(base.balanceSC)
          : Number(base.balance || 0);

  const merged = {
    ...base,
    ...patch,
    balanceSC: Number.isFinite(nextBal) ? nextBal : 0,
    balance:
      patch.balance != null && Number.isFinite(Number(patch.balance))
        ? Number(patch.balance)
        : Number.isFinite(nextBal)
          ? nextBal
          : 0,
  };
  setCachedUser(merged);
  lastAuthResult = { authenticated: true, user: merged };
  lastAuthResponseTime = Date.now();
  return merged;
}

export function readCachedBalance() {
  const u = getCachedUser();
  if (!u) return null;
  const sc = u.balanceSC ?? u.balance;
  return sc != null && Number.isFinite(Number(sc)) ? Number(sc) : null;
}

export async function fetchCurrentUser({ force = false } = {}) {
  const now = Date.now();

  if (!force && lastAuthResult && now - lastAuthResponseTime < 15000) {
    return lastAuthResult;
  }

  if (inFlightAuthPromise) {
    return inFlightAuthPromise;
  }

  inFlightAuthPromise = (async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setCachedUser(null);
          lastAuthResult = { authenticated: false, user: null };
        } else {
          const cached = getCachedUser();
          if (cached) {
            lastAuthResult = { authenticated: true, user: cached };
          } else {
            lastAuthResult = { authenticated: false, user: null };
          }
        }
        lastAuthResponseTime = Date.now();
        return lastAuthResult;
      }

      const data = await res.json();
      if (data?.authenticated && data?.user) {
        setCachedUser(data.user);
        lastAuthResult = data;
      } else {
        const cached = getCachedUser();
        if (cached) {
          lastAuthResult = { authenticated: true, user: cached };
        } else {
          setCachedUser(null);
          lastAuthResult = { authenticated: false, user: null };
        }
      }
      lastAuthResponseTime = Date.now();
      return lastAuthResult;
    } catch {
      const cached = getCachedUser();
      if (cached) {
        lastAuthResult = { authenticated: true, user: cached };
        lastAuthResponseTime = Date.now();
        return lastAuthResult;
      }
      return { authenticated: false, user: null };
    } finally {
      inFlightAuthPromise = null;
    }
  })();

  return inFlightAuthPromise;
}
