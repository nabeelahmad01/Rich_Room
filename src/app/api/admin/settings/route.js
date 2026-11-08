import { NextResponse } from 'next/server';
import { getSessionUser, ROLES } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const settings = await db.collection('system_settings').findOne({ key: 'general' });
    const defaultSettings = {
      siteName: 'Rich Room',
      welcomeBonusPercent: 120,
      welcomeBonusMax: 7500,
      welcomeBonusSpins: 150,
      welcomeBonusTitle: 'WELCOME BONUS',
      welcomeBonusSubtitle: 'Get a 120% bonus on your first deposit! Instant approval & fast cashouts.',
      regularBonusPercent: 50,
      regularBonusMax: 2500,
      regularBonusTitle: 'REGULAR BONUS',
      regularBonusSubtitle: 'Get a 50% reload bonus on every deposit you make! Boost your wallet balance anytime.',
      referralBonusPercent: 20,
      signupBonusSC: 0,
      signupBonusGC: 10000,
      freeplayAmountSC: 5.0,
      freeplayActive: true,
      welcomeBonusActive: true,
      regularBonusActive: true,
      referralBonusActive: true,
      minRedemptionSC: 40,
      cashoutRules:
        '1. All winnings from eligible sweepstakes games can be redeemed directly to your active cashout method.\n2. Minimum redeem / cashout amount is $40 USD (40 SC).\n3. Cashouts are processed 24/7 with zero processing fees.\n4. Ensure your Cashtag, handle, or crypto address matches your verified account.\n5. Processing time is usually within 5 to 15 minutes.',
      geoRestrictionEnabled: false,
      restrictedStates: [],
      maintenanceMode: false,
    };
    const merged = {
      ...defaultSettings,
      ...(settings || {}),
      restrictedStates: Array.isArray(settings?.restrictedStates)
        ? settings.restrictedStates
        : (defaultSettings.restrictedStates || []),
    };
    return NextResponse.json({ success: true, settings: merged });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session || ![ROLES.SUPER_ADMIN, ROLES.OPERATION_ADMIN, ROLES.FINANCIAL_MANAGER].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized staff action.' }, { status: 403 });
    }

    const body = await req.json();
    const db = await getDb();
    const settingsCol = db.collection('system_settings');

    const updateFields = {
      updatedAt: new Date(),
      updatedBy: session.username,
    };

    if (body.geoRestrictionEnabled !== undefined) updateFields.geoRestrictionEnabled = Boolean(body.geoRestrictionEnabled);
    if (body.restrictedStates !== undefined) updateFields.restrictedStates = body.restrictedStates;
    if (body.maintenanceMode !== undefined) updateFields.maintenanceMode = Boolean(body.maintenanceMode);
    if (body.signupBonusSC !== undefined) updateFields.signupBonusSC = Number(body.signupBonusSC);
    if (body.signupBonusGC !== undefined) updateFields.signupBonusGC = Number(body.signupBonusGC);
    if (body.freeplayAmountSC !== undefined) updateFields.freeplayAmountSC = Number(body.freeplayAmountSC);
    if (body.freeplayActive !== undefined) updateFields.freeplayActive = Boolean(body.freeplayActive);
    if (body.minRedemptionSC !== undefined) updateFields.minRedemptionSC = Number(body.minRedemptionSC);
    if (body.cashoutRules !== undefined) updateFields.cashoutRules = String(body.cashoutRules);

    // Dynamic Welcome & Regular Bonus Settings
    if (body.welcomeBonusPercent !== undefined) updateFields.welcomeBonusPercent = Number(body.welcomeBonusPercent);
    if (body.welcomeBonusActive !== undefined) updateFields.welcomeBonusActive = Boolean(body.welcomeBonusActive);
    if (body.welcomeBonusMax !== undefined) updateFields.welcomeBonusMax = Number(body.welcomeBonusMax);
    if (body.welcomeBonusSpins !== undefined) updateFields.welcomeBonusSpins = Number(body.welcomeBonusSpins);
    if (body.welcomeBonusTitle !== undefined) updateFields.welcomeBonusTitle = String(body.welcomeBonusTitle);
    if (body.welcomeBonusSubtitle !== undefined) updateFields.welcomeBonusSubtitle = String(body.welcomeBonusSubtitle);

    if (body.regularBonusPercent !== undefined) updateFields.regularBonusPercent = Number(body.regularBonusPercent);
    if (body.regularBonusActive !== undefined) updateFields.regularBonusActive = Boolean(body.regularBonusActive);
    if (body.regularBonusMax !== undefined) updateFields.regularBonusMax = Number(body.regularBonusMax);
    if (body.regularBonusTitle !== undefined) updateFields.regularBonusTitle = String(body.regularBonusTitle);
    if (body.regularBonusSubtitle !== undefined) updateFields.regularBonusSubtitle = String(body.regularBonusSubtitle);

    if (body.referralBonusPercent !== undefined) updateFields.referralBonusPercent = Number(body.referralBonusPercent);
    if (body.referralBonusActive !== undefined) updateFields.referralBonusActive = Boolean(body.referralBonusActive);

    await settingsCol.updateOne(
      { key: 'general' },
      { $set: updateFields },
      { upsert: true }
    );

    // Sync any currently PENDING freeplay requests to match the newly configured Freeplay amount
    if (body.freeplayAmountSC !== undefined) {
      const nextFp = Number(body.freeplayAmountSC);
      await db.collection('accountRequests').updateMany(
        {
          status: 'PENDING',
          $or: [{ isFreeplay: true }, { freeplayPending: true }],
        },
        {
          $set: {
            transferAmount: nextFp,
            freeplayAmount: nextFp,
          },
        }
      ).catch(() => {});
      await db.collection('freeplay_tasks').updateMany(
        { status: { $in: ['pending', 'email_sent'] } },
        { $set: { amount: nextFp } }
      ).catch(() => {});
    }

    // Sync corresponding cards in promotions collection
    const promosCol = db.collection('promotions');
    if (body.welcomeBonusPercent !== undefined || body.welcomeBonusTitle !== undefined || body.welcomeBonusActive !== undefined) {
      const matchPct = Number(body.welcomeBonusPercent ?? 300);
      await promosCol.updateOne(
        { id: 'welcome-double' },
        {
          $set: {
            title: body.welcomeBonusTitle || 'FIRST DEPOSIT WELCOME BOOST',
            badge: `${matchPct}% MATCH`,
            matchPercent: matchPct,
            description: body.welcomeBonusSubtitle || `Get a ${matchPct}% bonus on your first deposit!`,
            active: body.welcomeBonusActive !== undefined ? Boolean(body.welcomeBonusActive) : true,
            updatedAt: new Date(),
          },
        }
      ).catch(() => {});
    }

    if (body.regularBonusPercent !== undefined || body.regularBonusTitle !== undefined || body.regularBonusActive !== undefined) {
      const reloadPct = Number(body.regularBonusPercent ?? 50);
      await promosCol.updateOne(
        { id: 'reload-vip' },
        {
          $set: {
            title: body.regularBonusTitle || 'REGULAR RELOAD BOOST',
            badge: `${reloadPct}% RELOAD`,
            matchPercent: reloadPct,
            description: body.regularBonusSubtitle || `Get a ${reloadPct}% reload bonus on every deposit you make!`,
            active: body.regularBonusActive !== undefined ? Boolean(body.regularBonusActive) : true,
            updatedAt: new Date(),
          },
        }
      ).catch(() => {});
    }

    const updatedSettings = await settingsCol.findOne({ key: 'general' });
    return NextResponse.json({ success: true, message: 'Settings saved successfully.', settings: updatedSettings });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
