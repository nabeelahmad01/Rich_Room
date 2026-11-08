/**
 * Unified session/local cache for player-facing API data.
 * Pattern: hydrate from cache (no spinner) → silent background refresh → write cache.
 */

export const CACHE_KEYS = {
  PAYMENT_METHODS: 'rr_payment_methods_v1',
  CASHOUT_METHODS: 'rr_cashout_methods_v1',
  PROMOTIONS: 'rr_promotions_v1',
  AFFILIATE_STATS: 'rr_affiliate_stats_v1',
  DEPOSIT_HISTORY: 'pp_deposit_history_v1',
  WITHDRAW_HISTORY: 'pp_withdraw_history_v1',
  WALLET_SNAPSHOT: 'rr_wallet_snapshot_v1',
  SPIN_STATUS: 'rr_spin_status_v1',
  GAMES_LIST: 'cached_games_list',
  SETTINGS_SNIPPET: 'rr_settings_snippet_v1',
};

const DEFAULT_TTL = 10 * 60 * 1000;

function storageKey(key, scope) {
  return scope ? `${key}::${String(scope).toLowerCase().trim()}` : key;
}

function readRaw(store, fullKey, ttlMs) {
  try {
    const raw = store.getItem(fullKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.payload === undefined) return null;
    if (ttlMs > 0 && Date.now() - (parsed.t || 0) > ttlMs) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeRaw(store, fullKey, payload) {
  try {
    store.setItem(fullKey, JSON.stringify({ t: Date.now(), payload }));
  } catch {}
}

export function readSessionCache(key, scope = '', ttlMs = DEFAULT_TTL) {
  if (typeof window === 'undefined') return null;
  return readRaw(sessionStorage, storageKey(key, scope), ttlMs);
}

export function writeSessionCache(key, payload, scope = '') {
  if (typeof window === 'undefined') return;
  writeRaw(sessionStorage, storageKey(key, scope), payload);
}

export function readLocalCache(key, scope = '', ttlMs = DEFAULT_TTL) {
  if (typeof window === 'undefined') return null;
  return readRaw(localStorage, storageKey(key, scope), ttlMs);
}

export function writeLocalCache(key, payload, scope = '') {
  if (typeof window === 'undefined') return;
  writeRaw(localStorage, storageKey(key, scope), payload);
}

/** @returns {boolean} true if caller should show primary loading UI */
export function shouldShowInitialLoad(cachedValue) {
  if (cachedValue == null) return true;
  if (Array.isArray(cachedValue)) return cachedValue.length === 0;
  if (typeof cachedValue === 'object') return Object.keys(cachedValue).length === 0;
  return false;
}
