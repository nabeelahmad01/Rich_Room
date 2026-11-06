/**
 * Short-lived session cache so games grid can paint instantly on navigation
 * without flashing "LOADING..." every time (still refetches in background).
 */

const STORAGE_KEY = 'rr_games_catalog_v1';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function gamesCacheKey(category, search) {
  return `${category || 'all'}|${(search || '').trim().toLowerCase()}`;
}

export function readGamesFromSession(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { t, k, games } = JSON.parse(raw);
    if (k !== key || !Array.isArray(games)) return null;
    if (Date.now() - t > TTL_MS) return null;
    return games;
  } catch {
    return null;
  }
}

export function writeGamesToSession(key, games) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ t: Date.now(), k: key, games })
    );
  } catch {
    // quota / private mode
  }
}
