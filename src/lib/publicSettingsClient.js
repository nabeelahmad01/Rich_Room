import {
  CACHE_KEYS,
  readLocalCache,
  readSessionCache,
  writeLocalCache,
  writeSessionCache,
} from '@/lib/playerDataCache';
import {
  DEFAULT_CASHOUT_RULES,
  formatPlayerFacingCopy,
  resolveCashoutRulesText,
} from '@/lib/cashoutPolicy';

const FRESH_MS = 15 * 60 * 1000;
let inFlight = null;

export function readPublicSettingsCache({ allowStale = true } = {}) {
  const fresh =
    readSessionCache(CACHE_KEYS.SETTINGS_SNIPPET, '', FRESH_MS) ||
    readLocalCache(CACHE_KEYS.SETTINGS_SNIPPET, '', FRESH_MS);
  if (fresh) return fresh;
  if (!allowStale) return null;
  return (
    readSessionCache(CACHE_KEYS.SETTINGS_SNIPPET, '', 0) ||
    readLocalCache(CACHE_KEYS.SETTINGS_SNIPPET, '', 0)
  );
}

export function getInstantCashoutRulesDisplay() {
  const cached = readPublicSettingsCache();
  if (cached?.cashoutRules) {
    return formatPlayerFacingCopy(resolveCashoutRulesText(cached));
  }
  return formatPlayerFacingCopy(DEFAULT_CASHOUT_RULES);
}

export function writePublicSettingsCache(payload) {
  writeLocalCache(CACHE_KEYS.SETTINGS_SNIPPET, payload);
  writeSessionCache(CACHE_KEYS.SETTINGS_SNIPPET, payload);
}

export async function fetchPublicSettings({ force = false } = {}) {
  if (typeof window === 'undefined') return null;
  if (!force) {
    const cached = readPublicSettingsCache({ allowStale: false });
    if (cached?.cashoutRules) return cached;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch('/api/settings/public', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!data?.success) return readPublicSettingsCache();
      const text = resolveCashoutRulesText(data);
      const payload = {
        cashoutRules: text,
        minRedemptionSC: data.minRedemptionSC,
        minCashoutUsd: data.minCashoutUsd,
      };
      writePublicSettingsCache(payload);
      return payload;
    } catch {
      return readPublicSettingsCache();
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Call once on app load — rules/promos ready before user opens Cashout Rules tab. */
export function prefetchPublicSettings() {
  if (typeof window === 'undefined') return;
  const cached = readPublicSettingsCache({ allowStale: false });
  if (cached?.cashoutRules) return;
  fetchPublicSettings({ force: true }).catch(() => {});
}
