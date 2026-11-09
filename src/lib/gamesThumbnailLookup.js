import { cleanGameTitle } from '@/lib/fastDiff';

let cachedLookup = null;
let cachedAt = 0;
const LOOKUP_TTL_MS = 60 * 1000;

export function invalidateGamesThumbnailLookup() {
  cachedLookup = null;
  cachedAt = 0;
}

/**
 * Lightweight in-memory thumbnail index for player account cards (shared across requests).
 */
export async function getGamesThumbnailLookup(db) {
  if (cachedLookup && Date.now() - cachedAt < LOOKUP_TTL_MS) {
    return cachedLookup;
  }

  const games = await db
    .collection('games')
    .find(
      {},
      {
        projection: {
          title: 1,
          gameId: 1,
          id: 1,
          thumbnail: 1,
          image: 1,
          imageUrl: 1,
        },
      }
    )
    .toArray();

  const byId = new Map();
  const byTitleNorm = new Map();
  const byTitleClean = new Map();

  for (const g of games) {
    const oid = g._id ? g._id.toString() : null;
    const thumb = g.thumbnail || g.image || g.imageUrl || null;
    const meta = { gameId: oid, thumbnail: thumb };
    const candidates = new Set([oid, g.gameId, g.id].filter(Boolean).map((x) => String(x)));
    candidates.forEach((id) => {
      if (id) byId.set(id, meta);
    });
    const tn = (g.title || '').toLowerCase().trim();
    if (tn) byTitleNorm.set(tn, meta);
    const tc = cleanGameTitle(g.title || '').toLowerCase().trim();
    if (tc) byTitleClean.set(tc, meta);
  }

  cachedLookup = { byId, byTitleNorm, byTitleClean };
  cachedAt = Date.now();
  return cachedLookup;
}

export function resolveThumbnailFromLookup(lookup, gameTitle, gameId) {
  const { byId, byTitleNorm, byTitleClean } = lookup;
  if (gameId) {
    const idStr = String(gameId);
    if (byId.has(idStr)) return byId.get(idStr);
  }
  const tn = (gameTitle || '').toLowerCase().trim();
  if (tn && byTitleNorm.has(tn)) return byTitleNorm.get(tn);
  const tc = cleanGameTitle(gameTitle || '').toLowerCase().trim();
  if (tc && byTitleClean.has(tc)) return byTitleClean.get(tc);
  return null;
}
