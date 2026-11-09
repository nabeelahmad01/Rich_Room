import { cleanGameTitle } from '@/lib/fastDiff';
import { writeGameAccountsCache } from '@/lib/gameAccountsClientCache';
import { parseResponseJson } from '@/lib/fetchWithTimeout';

const inflightByEmail = new Map();

/** Same source as My Game IDs — always pass player email. */
export async function loadPlayerGameAccountsForEmail(email) {
  if (!email) {
    return { active: [], pending: [], ok: false };
  }
  const key = email.toLowerCase().trim();
  if (inflightByEmail.has(key)) {
    return inflightByEmail.get(key);
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/game-accounts?email=${encodeURIComponent(email)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseResponseJson(res);
      if (!data.success) {
        return { active: [], pending: [], ok: false };
      }
      const active = (data.gameAccounts || []).map((a) => ({
        ...a,
        gameTitle: cleanGameTitle(a.gameTitle),
      }));
      const pending = (data.pendingRequests || []).map((r) => ({
        ...r,
        gameTitle: cleanGameTitle(r.gameTitle),
      }));
      writeGameAccountsCache(email, {
        active,
        pending,
        rejected: [],
      });
      return { active, pending, ok: true };
    } catch {
      return { active: [], pending: [], ok: false };
    }
  })();

  inflightByEmail.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightByEmail.delete(key);
  }
}
