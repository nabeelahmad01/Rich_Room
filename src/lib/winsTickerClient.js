import { CACHE_KEYS, readLocalCache, readSessionCache, writeLocalCache, writeSessionCache } from '@/lib/playerDataCache';
import { cleanGameTitle } from '@/lib/fastDiff';

const FRESH_MS = 30 * 60 * 1000;

/** Shown at 0ms before API/cache (matches server demo feed shape). */
export const INSTANT_WINS_FALLBACK = [
  { username: 'raze77', gameTitle: 'Ultra Panda', amount: 340.5, currency: 'SC' },
  { username: 'nyx_pro', gameTitle: 'Fire Kirin', amount: 820.0, currency: 'SC' },
  { username: 'lucky_bella', gameTitle: 'Orion Stars', amount: 450.0, currency: 'SC' },
  { username: 'crypto_ace', gameTitle: 'Game Vault', amount: 1250.0, currency: 'SC' },
  { username: 'halcyon_vip', gameTitle: 'Juwa City', amount: 290.75, currency: 'SC' },
  { username: 'drake99', gameTitle: 'Milky Way', amount: 620.0, currency: 'SC' },
];

function sanitizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({
    ...item,
    gameTitle: cleanGameTitle(item.gameTitle || item.game || 'VIP Casino'),
    username: item.username || 'Player',
    currency: item.currency || 'SC',
    amount: Number(item.amount) || 0,
  }));
}

export function readWinsTickerCache({ allowStale = true } = {}) {
  const fresh =
    readSessionCache(CACHE_KEYS.WINS_TICKER, '', FRESH_MS) ||
    readLocalCache(CACHE_KEYS.WINS_TICKER, '', FRESH_MS);
  if (fresh?.length) return sanitizeList(fresh);
  if (!allowStale) return null;
  const stale =
    readSessionCache(CACHE_KEYS.WINS_TICKER, '', 0) ||
    readLocalCache(CACHE_KEYS.WINS_TICKER, '', 0);
  return stale?.length ? sanitizeList(stale) : null;
}

export function writeWinsTickerCache(list) {
  const rows = sanitizeList(list);
  if (!rows.length) return;
  writeLocalCache(CACHE_KEYS.WINS_TICKER, rows);
  writeSessionCache(CACHE_KEYS.WINS_TICKER, rows);
}

export function getInstantWinsTicker() {
  return readWinsTickerCache() || INSTANT_WINS_FALLBACK;
}

let inFlight = null;

export async function fetchWinsTicker({ force = false } = {}) {
  if (typeof window === 'undefined') return getInstantWinsTicker();
  if (!force) {
    const cached = readWinsTickerCache({ allowStale: false });
    if (cached?.length) return cached;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch('/api/games/activity', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      const raw = data.activity || data.ticker || [];
      if (data.success && Array.isArray(raw) && raw.length > 0) {
        const sanitized = sanitizeList(raw);
        writeWinsTickerCache(sanitized);
        return sanitized;
      }
      const cached = readWinsTickerCache();
      return cached?.length ? cached : INSTANT_WINS_FALLBACK;
    } catch {
      return readWinsTickerCache() || INSTANT_WINS_FALLBACK;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function prefetchWinsTicker() {
  if (typeof window === 'undefined') return;
  const cached = readWinsTickerCache({ allowStale: false });
  if (cached?.length) return;
  fetchWinsTicker({ force: true }).catch(() => {});
}
