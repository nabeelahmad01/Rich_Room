import { CACHE_KEYS, readSessionCache, writeSessionCache } from '@/lib/playerDataCache';

/** Admin games list — refresh at most once per interval unless forced. */
export const ADMIN_GAMES_REFRESH_MS = 5 * 60 * 1000;

export function readAdminGamesFromCache({ allowStale = true } = {}) {
  const fresh = readSessionCache(CACHE_KEYS.GAMES_LIST, '', ADMIN_GAMES_REFRESH_MS);
  if (fresh?.length) return fresh;
  if (!allowStale) return null;
  return readSessionCache(CACHE_KEYS.GAMES_LIST, '', 0);
}

/**
 * Loads admin game catalog. Skips network when session cache is still fresh.
 * @returns {Promise<Array|null>} games array, or null on failure with no cache
 */
export async function refreshAdminGamesCatalog({ force = false } = {}) {
  if (typeof window === 'undefined') return [];

  if (!force) {
    const cached = readAdminGamesFromCache({ allowStale: false });
    if (cached?.length) return cached;
  }

  try {
    const res = await fetch('/api/games', { cache: 'no-store' });
    const data = await res.json();
    if (data.success && Array.isArray(data.games) && data.games.length > 0) {
      writeSessionCache(CACHE_KEYS.GAMES_LIST, data.games);
      return data.games;
    }
  } catch (err) {
    console.error(err);
  }

  return readAdminGamesFromCache({ allowStale: true }) || [];
}
