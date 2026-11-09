import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, ROLES } from '@/lib/auth';

let tickerCache = null;
let tickerCacheAt = 0;
const TICKER_CACHE_MS = 45 * 1000;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'ticker'; // 'ticker' or 'admin'
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = await getDb();
    const activityCol = db.collection('game_activity');

    if (mode === 'admin') {
      const session = await getSessionUser();
      if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.FINANCIAL_MANAGER)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      const activities = await activityCol
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return NextResponse.json({
        success: true,
        activities: activities.map(a => ({
          id: a._id.toString(),
          gameId: a.gameId,
          username: a.username,
          betAmount: a.betAmount,
          winAmount: a.winAmount,
          multiplier: a.multiplier,
          currency: a.currency,
          outcome: a.outcome,
          createdAt: a.createdAt,
        })),
      });
    }

    // Ticker mode (Public)
    const now = Date.now();
    if (tickerCache && now - tickerCacheAt < TICKER_CACHE_MS) {
      return NextResponse.json({
        success: true,
        ticker: tickerCache,
        activity: tickerCache,
      });
    }

    const recentWins = await activityCol
      .find({ winAmount: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    let displayWins = [];
    if (recentWins.length > 0) {
      displayWins = recentWins.map(w => ({
        username: w.username,
        game: w.gameId.replace(/-/g, ' ').toUpperCase(),
        gameTitle: w.gameId.replace(/-/g, ' ').toUpperCase(),
        amount: w.winAmount,
        currency: w.currency || 'SC',
      }));
    } else {
      // Dynamically fetch active games from the database
      const gamesCol = db.collection('games');
      const activeGames = await gamesCol
        .find({ $or: [{ isActive: { $ne: false } }, { active: { $ne: false } }] })
        .limit(10)
        .toArray();
      const mockUsers = ['raze77', 'nyx_pro', 'satoshi.j', 'halcyon_vip', 'crypto_ace', 'lucky_bella', 'drake99', 'matrix_neo'];
      const sampleAmounts = [340.5, 820.0, 450.0, 1250.0, 290.75, 620.0, 380.0, 750.25];

      displayWins = activeGames.map((g, idx) => ({
        username: mockUsers[idx % mockUsers.length],
        game: g.title,
        gameTitle: g.title,
        amount: sampleAmounts[idx % sampleAmounts.length],
        currency: 'SC',
      }));
    }

    tickerCache = displayWins;
    tickerCacheAt = Date.now();

    return NextResponse.json({
      success: true,
      ticker: displayWins,
      activity: displayWins,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
