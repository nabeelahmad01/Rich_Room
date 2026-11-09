import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, ROLES } from '@/lib/auth';
import { withGameDescription } from '@/lib/gameDescriptions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let gamesCache = null;
let gamesCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache (player catalog only; admin ?all=true bypasses)

function invalidateGamesCache() {
  gamesCache = null;
  gamesCacheTime = 0;
}

async function loadAllGamesFromDb() {
  const db = await getDb();
  const gamesCol = db.collection('games');
  const rawGames = await gamesCol.find({}).sort({ isFeatured: -1, playsCount: -1, createdAt: -1 }).toArray();

  return rawGames.map((g) => {
    const sid = g._id ? g._id.toString() : (g.id || g.gameId);
    const resolvedImage = g.thumbnail || g.image || g.imageUrl || '/images/vegas-777.svg';
    const base = {
      id: sid,
      _id: sid,
      gameId: g.gameId || sid,
      title: g.title,
      category: (g.category || 'sweepstakes').toLowerCase().trim(),
      provider: g.provider || 'Rich Room Studio',
      thumbnail: resolvedImage,
      image: resolvedImage,
      imageUrl: resolvedImage,
      fallbackImage: resolvedImage,
      type: g.type || 'internal',
      url: g.url || null,
      playUrl: g.playUrl || g.url || null,
      badge: g.badge || (g.isHot ? 'HOT' : (g.isFeatured ? 'EXCLUSIVE' : '')),
      isActive: g.isActive !== false,
      isHot: g.isHot ?? false,
      isFeatured: g.isFeatured ?? false,
      playsCount: g.playsCount || 0,
      description: g.description || '',
      platform: g.platform || g.provider || 'Rich Room',
      isInternal: g.isInternal ?? (g.type === 'internal'),
      rtp: g.rtp || 98.2,
      rating: g.rating || 4.9,
      createdAt: g.createdAt || null,
    };
    return withGameDescription(base);
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const all = searchParams.get('all') === 'true';

    const now = Date.now();
    let baseList;
    if (all) {
      baseList = await loadAllGamesFromDb();
    } else {
      if (!gamesCache || now - gamesCacheTime > CACHE_TTL_MS) {
        gamesCache = await loadAllGamesFromDb();
        gamesCacheTime = now;
      }
      baseList = gamesCache;
    }

    let filtered = baseList;

    if (!all) {
      filtered = filtered.filter((g) => g.isActive !== false);
    }

    if (category && category !== 'all' && category !== 'lobby') {
      const catLower = category.toLowerCase().trim();
      if (catLower === 'sweeps' || catLower === 'sweepstakes') {
        filtered = filtered.filter((g) => g.category === 'sweeps' || g.category === 'sweepstakes');
      } else {
        filtered = filtered.filter((g) => g.category === catLower);
      }
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim().toLowerCase();
      filtered = filtered.filter((g) =>
        (g.title && g.title.toLowerCase().includes(cleanSearch)) ||
        (g.provider && g.provider.toLowerCase().includes(cleanSearch)) ||
        (g.category && g.category.toLowerCase().includes(cleanSearch)) ||
        (g.description && g.description.toLowerCase().includes(cleanSearch))
      );
    }

    return NextResponse.json(
      {
        success: true,
        games: filtered,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper for safe game lookup
function getGameFilter(targetId) {
  if (!targetId) return { _id: null };
  const strId = String(targetId);
  const or = [
    { _id: strId },
    { id: strId },
    { gameId: strId },
  ];
  if (/^[0-9a-fA-F]{24}$/.test(strId)) {
    try {
      or.push({ _id: new ObjectId(strId) });
    } catch {}
  }
  return { $or: or };
}

// Admin Add Game
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.ADMIN && session.role !== ROLES.OPERATION_ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Staff only.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, provider, thumbnail, type = 'internal', url, badge, isActive } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 });
    }

    const db = await getDb();
    const gamesCol = db.collection('games');

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const normalizedBadge = (badge || '').toUpperCase().trim();
    const gameId = slug + '-' + Math.floor(Math.random() * 1000);
    const resolvedImage = thumbnail || body.image || body.imageUrl || '/images/vegas-777.svg';
    const newGame = {
      gameId,
      title,
      category: body.category ? body.category.toLowerCase() : 'sweepstakes',
      provider: provider || 'Rich Room Studio',
      thumbnail: resolvedImage,
      image: resolvedImage,
      imageUrl: resolvedImage,
      type: type || 'internal',
      url: url || '',
      badge: normalizedBadge,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isHot: normalizedBadge === 'HOT',
      isFeatured: normalizedBadge === 'EXCLUSIVE' || normalizedBadge === 'POPULAR',
      playsCount: 0,
      description: body.description || '',
      createdAt: new Date(),
    };

    const res = await gamesCol.insertOne(newGame);
    invalidateGamesCache();
    const idStr = res.insertedId ? res.insertedId.toString() : gameId;
    return NextResponse.json({
      success: true,
      gameId: idStr,
      message: 'Game added successfully',
      game: { ...newGame, id: idStr, _id: idStr }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Admin Edit Game
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.ADMIN && session.role !== ROLES.OPERATION_ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Staff only.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, provider, thumbnail, isActive, badge, url, category } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Game ID required' }, { status: 400 });
    }

    const db = await getDb();
    const gamesCol = db.collection('games');

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (provider !== undefined) updateFields.provider = provider;
    
    const resolvedThumb = thumbnail !== undefined ? thumbnail : (body.image !== undefined ? body.image : body.imageUrl);
    if (resolvedThumb !== undefined) {
      updateFields.thumbnail = resolvedThumb;
      updateFields.image = resolvedThumb;
      updateFields.imageUrl = resolvedThumb;
    }

    if (url !== undefined) updateFields.url = url;
    if (category !== undefined) updateFields.category = category.toLowerCase();
    if (body.description !== undefined) updateFields.description = body.description;
    if (isActive !== undefined) updateFields.isActive = Boolean(isActive);
    if (badge !== undefined) {
      const normalizedBadge = (badge || '').toUpperCase().trim();
      updateFields.badge = normalizedBadge;
      updateFields.isHot = normalizedBadge === 'HOT';
      updateFields.isFeatured = normalizedBadge === 'EXCLUSIVE' || normalizedBadge === 'POPULAR';
    }

    await gamesCol.updateOne(getGameFilter(id), { $set: updateFields });
    invalidateGamesCache();

    return NextResponse.json({ success: true, message: 'Game updated successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Admin Delete Game
export async function DELETE(req) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.ADMIN && session.role !== ROLES.OPERATION_ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Staff only.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Game ID required' }, { status: 400 });
    }

    const db = await getDb();
    const gamesCol = db.collection('games');

    await gamesCol.deleteOne(getGameFilter(id));
    invalidateGamesCache();
    return NextResponse.json({ success: true, message: 'Game deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
