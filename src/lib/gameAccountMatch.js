import { cleanGameTitle } from '@/lib/fastDiff';

export function gameTitleKey(title) {
  return cleanGameTitle(title || '').toLowerCase().trim();
}

function titlesMatch(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Fast lookup maps for game grid ID / pending badges */
export function buildGameAccountIndex(readyAccounts = [], pendingRequests = []) {
  const ready = [];
  const pending = [];

  for (const a of readyAccounts) {
    const k = gameTitleKey(a.gameTitle);
    if (k) ready.push(k);
  }

  const readySet = new Set(ready);
  for (const p of pendingRequests) {
    const k = gameTitleKey(p.gameTitle);
    if (k && !readySet.has(k)) pending.push(k);
  }

  return { ready, pending };
}

export function gameHasReadyAccount(gameTitle, index) {
  const g = gameTitleKey(gameTitle);
  if (!g) return false;
  return index.ready.some((k) => titlesMatch(g, k));
}

export function gameHasPendingAccount(gameTitle, index) {
  const g = gameTitleKey(gameTitle);
  if (!g) return false;
  if (gameHasReadyAccount(gameTitle, index)) return false;
  return index.pending.some((k) => titlesMatch(g, k));
}
