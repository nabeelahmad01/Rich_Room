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

/** Player-safe settings (no admin-only fields). */
export async function GET() {
  try {
    const db = await getDb();
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const minRedemptionSC = resolveMinCashoutFromSettings(settings || {});
    const cashoutRules = resolveCashoutRulesText(settings || {});

    return NextResponse.json(
      {
        success: true,
        cashoutRules,
        minRedemptionSC,
        minCashoutUsd: minRedemptionSC || MIN_CASHOUT_USD,
      },
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } }
    );
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
