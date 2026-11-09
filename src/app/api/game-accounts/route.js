import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getPlayerSessionUser } from '@/lib/auth';
import { getGamesThumbnailLookup, resolveThumbnailFromLookup } from '@/lib/gamesThumbnailLookup';

const RESPONSE_CACHE = new Map();
const RESPONSE_TTL_MS = 4000;

const ACCOUNT_PROJECTION = {
  gameTitle: 1,
  gameId: 1,
  userEmail: 1,
  username: 1,
  password: 1,
  status: 1,
  createdAt: 1,
};

const REQUEST_PROJECTION = {
  gameTitle: 1,
  gameId: 1,
  userEmail: 1,
  userName: 1,
  gameAccountUsername: 1,
  gameAccountPassword: 1,
  status: 1,
  requestType: 1,
  createdAt: 1,
};

// GET game credentials (by player email)
export async function GET(req) {
  try {
    const session = await getPlayerSessionUser();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || session?.email;

    if (!email) {
      return NextResponse.json({ success: true, gameAccounts: [] });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cached = RESPONSE_CACHE.get(cleanEmail);
    if (cached && Date.now() - cached.at < RESPONSE_TTL_MS) {
      return NextResponse.json(cached.body);
    }

    const db = await getDb();
    const emailRegex = { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    const readyStatus = { $in: ['READY', 'ready', 'Ready'] };
    const approvedReadyStatus = { $in: ['READY', 'ready', 'Ready', 'APPROVED'] };
    const pendingStatus = { $in: ['PENDING', 'pending', 'Pending'] };

    const [accounts, readyRequests, pendingRaw, gameLookup] = await Promise.all([
      db.collection('gameAccounts').find({ userEmail: emailRegex, status: readyStatus }, { projection: ACCOUNT_PROJECTION }).toArray(),
      db
        .collection('accountRequests')
        .find({ userEmail: emailRegex, status: approvedReadyStatus }, { projection: REQUEST_PROJECTION })
        .toArray(),
      db
        .collection('accountRequests')
        .find(
          { userEmail: emailRegex, status: pendingStatus, requestType: { $ne: 'COIN_LOAD' } },
          { projection: REQUEST_PROJECTION }
        )
        .toArray(),
      getGamesThumbnailLookup(db),
    ]);

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

    const readyTitleKeys = new Set(Array.from(mergedMap.keys()));
    const pending = pendingRaw.filter((p) => {
      const key = (p.gameTitle || '').toLowerCase().trim();
      return key && !readyTitleKeys.has(key);
    });

    const body = {
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
    };
    RESPONSE_CACHE.set(cleanEmail, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
