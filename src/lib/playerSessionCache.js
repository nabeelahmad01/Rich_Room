const STORAGE_KEY = 'pp_player_session';

/** Lightweight player profile for instant UI hydrate (no secrets). */
export function readCachedPlayer() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedPlayer(user) {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* quota / private mode */
  }
}

export function clearCachedPlayer() {
  writeCachedPlayer(null);
}

export function getInitialPlayerUser() {
  return readCachedPlayer();
}

/** Call on logout so every tab and navbar loses guest/login flash state. */
export function broadcastPlayerLogout() {
  clearCachedPlayer();
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('pp_user_email');
  } catch {}
  window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: null }));
}
