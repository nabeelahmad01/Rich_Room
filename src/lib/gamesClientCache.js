/**
 * Short-lived session cache so games grid can paint instantly on navigation
 * without flashing "LOADING..." every time (still refetches in background).
 */

import { readAdminGamesFromCache } from '@/lib/playerGamesCatalog';
import { cleanGameTitle } from '@/lib/fastDiff';

const STORAGE_KEY = 'rr_games_catalog_v1';
const LEGACY_LOCAL_KEY = 'pp_games_cache';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Admin catalog only — never placeholder/demo games. */
export function readInitialGamesCatalog(category = 'all', search = '') {
  if (typeof window === 'undefined') return [];

  const key = gamesCacheKey(category, search);
  const session = readGamesFromSession(key);
  if (session?.length) {
    return session.map((g) => ({ ...g, title: cleanGameTitle(g.title) }));
  }

  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((g) => ({ ...g, title: cleanGameTitle(g.title) }));
      }
    }
  } catch {}

  if (category === 'all' && !search) {
    const admin = readAdminGamesFromCache({ allowStale: true });
    if (admin?.length) {
      return admin.map((g) => ({ ...g, title: cleanGameTitle(g.title || g.name) }));
    }
  }

  return [];
}

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
