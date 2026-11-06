import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { cleanGameTitle } from '@/lib/fastDiff';

/** Build lookups so player "My Game IDs" cards get the same thumbnail as admin catalog (by id or title). */
async function buildGamesThumbnailLookup(db) {
  const games = await db.collection('games').find({}).toArray();
  const byId = new Map();
  const byTitleNorm = new Map();
  const byTitleClean = new Map();

  for (const g of games) {
    const oid = g._id ? g._id.toString() : null;
    const thumb = g.thumbnail || g.image || g.imageUrl || null;
    const meta = { gameId: oid, thumbnail: thumb };
    const candidates = new Set(
      [oid, g.gameId, g.id].filter(Boolean).map((x) => String(x))
    );
    candidates.forEach((id) => {
      if (id) byId.set(id, meta);
    });
    const tn = (g.title || '').toLowerCase().trim();
    if (tn) byTitleNorm.set(tn, meta);
    const tc = cleanGameTitle(g.title || '').toLowerCase().trim();
    if (tc) byTitleClean.set(tc, meta);
  }
  return { byId, byTitleNorm, byTitleClean };
}

function resolveThumbnailFromLookup(lookup, gameTitle, gameId) {
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

// GET game credentials (by player email)
export async function GET(req) {
  try {
    const session = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || session?.email;

    if (!email) {
      return NextResponse.json({ success: true, gameAccounts: [] });
    }

    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };

    // 1. Fetch from gameAccounts collection
    const accounts = await db
      .collection('gameAccounts')
      .find({ userEmail: emailRegex, status: 'READY' })
      .toArray();

    // 2. Also fetch approved READY requests from accountRequests
    const readyRequests = await db
      .collection('accountRequests')
      .find({ userEmail: emailRegex, status: 'READY' })
      .toArray();

    // 3. Fetch any PENDING account requests
    const pending = await db
      .collection('accountRequests')
      .find({
        userEmail: emailRegex,
        status: 'PENDING',
        requestType: { $ne: 'COIN_LOAD' },
      })
      .toArray();

    const gameLookup = await buildGamesThumbnailLookup(db);

    const mergedMap = new Map();
    accounts.forEach((acc) => {
      const key = (acc.gameTitle || '').toLowerCase().trim();
      const resolved = resolveThumbnailFromLookup(gameLookup, acc.gameTitle, acc.gameId);
      mergedMap.set(key, {
        id: acc._id.toString(),
        userEmail: acc.userEmail,
        gameTitle: acc.gameTitle,
        gameId: resolved?.gameId || acc.gameId || null,
        thumbnail: resolved?.thumbnail || null,
        username: acc.username,
        password: acc.password,
        status: acc.status || 'READY',
        createdAt: acc.createdAt || new Date(),
      });
    });

    readyRequests.forEach((req) => {
      const key = (req.gameTitle || '').toLowerCase().trim();
      const resolved = resolveThumbnailFromLookup(gameLookup, req.gameTitle, req.gameId);
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          id: req._id.toString(),
          userEmail: req.userEmail,
          gameTitle: req.gameTitle,
          gameId: resolved?.gameId || req.gameId || null,
          thumbnail: resolved?.thumbnail || null,
          username: req.gameAccountUsername || req.userName,
          password: req.gameAccountPassword || 'VegasWin777!',
          status: 'READY',
          createdAt: req.createdAt || new Date(),
        });
      } else {
        const existing = mergedMap.get(key);
        const gid = existing.gameId || resolved?.gameId || req.gameId || null;
        const thumb = existing.thumbnail || resolved?.thumbnail || null;
        mergedMap.set(key, { ...existing, gameId: gid, thumbnail: thumb });
      }
    });

    const enrichedAccounts = Array.from(mergedMap.values()).map((row) => {
      if (row.thumbnail && row.gameId) return row;
      const resolved = resolveThumbnailFromLookup(gameLookup, row.gameTitle, row.gameId);
      if (!resolved) return row;
      return {
        ...row,
        gameId: row.gameId || resolved.gameId,
        thumbnail: row.thumbnail || resolved.thumbnail,
      };
    });

    return NextResponse.json({
      success: true,
      gameAccounts: enrichedAccounts,
      pendingRequests: pending.map((p) => {
        const resolved = resolveThumbnailFromLookup(gameLookup, p.gameTitle, p.gameId);
        return {
          id: p._id.toString(),
          gameTitle: p.gameTitle,
          gameId: resolved?.gameId || p.gameId || null,
          thumbnail: resolved?.thumbnail || null,
          status: 'PENDING',
          createdAt: p.createdAt || new Date(),
        };
      }),
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
