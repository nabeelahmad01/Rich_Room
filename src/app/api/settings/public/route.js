import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import {
  DEFAULT_CASHOUT_RULES,
  MIN_CASHOUT_USD,
  resolveCashoutRulesText,
  resolveMinCashoutFromSettings,
} from '@/lib/cashoutPolicy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let memCache = null;
let memCacheAt = 0;
const MEM_TTL_MS = 60 * 1000;

/** Player-safe settings (no admin-only fields). */
export async function GET() {
  try {
    const now = Date.now();
    if (memCache && now - memCacheAt < MEM_TTL_MS) {
      return NextResponse.json(memCache, {
        headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' },
      });
    }

    const db = await getDb();
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const minRedemptionSC = resolveMinCashoutFromSettings(settings || {});
    const cashoutRules = resolveCashoutRulesText(settings || {});

    const body = {
      success: true,
      cashoutRules,
      minRedemptionSC,
      minCashoutUsd: minRedemptionSC || MIN_CASHOUT_USD,
    };
    memCache = body;
    memCacheAt = now;

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: true,
        cashoutRules: DEFAULT_CASHOUT_RULES,
        minRedemptionSC: MIN_CASHOUT_USD,
        minCashoutUsd: MIN_CASHOUT_USD,
        fromFallback: true,
        error: error.message,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
