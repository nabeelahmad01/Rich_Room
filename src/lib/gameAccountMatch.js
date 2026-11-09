import { cleanGameTitle } from '@/lib/fastDiff';

const NOISE_TOKENS = new Set([
  'cyber',
  'slots',
  'slot',
  'game',
  'games',
  'room',
  'hub',
  'online',
  'casino',
  'master',
  '777',
]);

export function gameTitleKey(title) {
  return cleanGameTitle(title || '').toLowerCase().trim();
}

function compactTitle(title) {
  return gameTitleKey(title)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NOISE_TOKENS.has(w))
    .join(' ');
}

function titleTokens(title) {
  return compactTitle(title).split(/\s+/).filter(Boolean);
}

function tokenOverlapRatio(a, b) {
  const ta = new Set(titleTokens(a));
  const tb = new Set(titleTokens(b));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared += 1;
  }
  return shared / Math.min(ta.size, tb.size);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) row[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Fuzzy match — catalog vs DB titles (FIRE KIRN / FIRE KIRIN, Panda 777 Cyber Slots, etc.) */
export function titlesMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const ca = compactTitle(a);
  const cb = compactTitle(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;

  if (tokenOverlapRatio(a, b) >= 0.5) return true;

  const sa = ca.replace(/\s+/g, '');
  const sb = cb.replace(/\s+/g, '');
  const dist = levenshtein(sa, sb);
  const maxLen = Math.max(sa.length, sb.length);
  if (maxLen > 3 && dist <= 2) return true;

  return false;
}

function catalogGameForTitle(adminGames, catalogTitle) {
  if (!catalogTitle || !Array.isArray(adminGames)) return null;
  const key = gameTitleKey(catalogTitle);
  return (
    adminGames.find((g) => {
      const t = g?.title || g?.name || '';
      return titlesMatch(gameTitleKey(t), key);
    }) || null
  );
}

function sameGameId(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

export function findAccountForGame(accounts, catalogTitle, adminGames = []) {
  if (!Array.isArray(accounts) || !catalogTitle) return null;
  const title = typeof catalogTitle === 'string' ? catalogTitle : catalogTitle?.title || catalogTitle?.name;
  if (!title) return null;

  const catalog = catalogGameForTitle(adminGames, title);
  const catalogId = catalog?.gameId || catalog?.id || catalog?._id;
  if (catalogId) {
    const byId = accounts.find(
      (a) =>
        (a.gameId && sameGameId(a.gameId, catalogId)) ||
        (a.game_id && sameGameId(a.game_id, catalogId))
    );
    if (byId) return byId;
  }

  const key = gameTitleKey(title);
  return accounts.find((a) => titlesMatch(gameTitleKey(a.gameTitle), key)) || null;
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

/** Redeem dropdown — READY accounts only */
export function listRedeemableGameTitles(accounts) {
  if (!Array.isArray(accounts) || !accounts.length) return [];
  const seen = new Map();
  for (const a of accounts) {
    const display = cleanGameTitle(a.gameTitle);
    if (!display) continue;
    const key = compactTitle(display) || gameTitleKey(display);
    if (!seen.has(key)) seen.set(key, display);
  }
  return [...seen.values()];
}
