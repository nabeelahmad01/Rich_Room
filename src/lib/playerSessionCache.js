import {
  getCachedUser,
  setCachedUser,
  fetchCurrentUser,
  invalidateAuthCache,
  primeAuthCache,
} from '@/lib/authClient';

export { fetchCurrentUser };

/** Lightweight player profile for instant UI hydrate (no secrets). */
export function readCachedPlayer() {
  return getCachedUser();
}

export function writeCachedPlayer(user) {
  primeAuthCache(user);
}

export function clearCachedPlayer() {
  setCachedUser(null);
}

export function getInitialPlayerUser() {
  return getCachedUser();
}

/** Call on logout so every tab and navbar loses guest/login flash state. */
export function broadcastPlayerLogout() {
  invalidateAuthCache();
  clearCachedPlayer();
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: null }));
}
