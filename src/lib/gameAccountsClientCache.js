import { cleanGameTitle } from '@/lib/fastDiff';

const STORAGE_KEY = 'rr_game_accounts_v1';
const TTL_MS = 10 * 60 * 1000;

function safeEmail(email) {
  return (email || '').toLowerCase().trim();
}

export function readGameAccountsCache(email) {
  if (typeof window === 'undefined') return null;
  const key = safeEmail(email);
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email !== key) return null;
    if (Date.now() - (parsed.t || 0) > TTL_MS) return null;
    return {
      active: Array.isArray(parsed.active) ? parsed.active : [],
      pending: Array.isArray(parsed.pending) ? parsed.pending : [],
      rejected: Array.isArray(parsed.rejected) ? parsed.rejected : [],
    };
  } catch {
    return null;
  }
}

export function readCachedGameAccountSeeds(email) {
  const cached = readGameAccountsCache(email);
  if (!cached) return { active: [], pending: [] };
  const active = (cached.active || []).map((a) => ({
    ...a,
    gameTitle: cleanGameTitle(a.gameTitle),
  }));
  const pending = (cached.pending || []).map((r) => ({
    ...r,
    gameTitle: cleanGameTitle(r.gameTitle),
  }));
  return { active, pending };
}

export function writeGameAccountsCache(email, { active, pending, rejected }) {
  if (typeof window === 'undefined') return;
  const key = safeEmail(email);
  if (!key) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        t: Date.now(),
        email: key,
        active: active || [],
        pending: pending || [],
        rejected: rejected || [],
      })
    );
  } catch {}
}
