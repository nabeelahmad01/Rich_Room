import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser, ROLES, getUserFilter, safeIdFilter } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const usersCol = db.collection('users');
    const settingsCol = db.collection('system_settings');
    const sysSettings = await settingsCol.findOne({ key: 'general' });
    const defaultReferralPercent = Number(sysSettings?.referralBonusPercent ?? 20);

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');

    // Admin view
    if (mode === 'admin') {
      const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.OPERATION_ADMIN, ROLES.FINANCIAL_MANAGER];
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      // Fetch all users who have referral activity or commissions
      const candidates = await usersCol
        .find({
          $or: [
            { referralCode: { $exists: true, $ne: '' } },
            { affiliateCommissionsEarned: { $gt: 0 } },
            { affiliateCommissionsUnpaid: { $gt: 0 } },
          ],
        })
        .sort({ affiliateCommissionsEarned: -1, createdAt: -1 })
        .limit(100)
        .toArray();

      // Aggregate all referees for these users (by username, referralCode, or referrerId)
      const allReferrerKeys = [];
      candidates.forEach((c) => {
        if (c.username) allReferrerKeys.push(c.username);
        if (c.referralCode) allReferrerKeys.push(c.referralCode);
        if (c._id) allReferrerKeys.push(c._id.toString());
      });

      const allReferees = await usersCol
        .find({
          $or: [
            { referredBy: { $in: allReferrerKeys } },
            { referredByCode: { $in: allReferrerKeys } },
            { referrerId: { $in: allReferrerKeys } },
          ],
        })
        .project({ username: 1, email: 1, referredBy: 1, referredByCode: 1, referrerId: 1, createdAt: 1, totalDeposited: 1, balanceSC: 1 })
        .toArray();

      const refereesByReferrer = {};
      allReferees.forEach((r) => {
        const keys = [r.referredBy, r.referredByCode, r.referrerId].filter(Boolean);
        candidates.forEach((c) => {
          if (
            keys.includes(c.username) ||
            keys.includes(c.referralCode) ||
            keys.includes(c._id.toString())
          ) {
            if (!refereesByReferrer[c.username]) refereesByReferrer[c.username] = [];
            // Prevent duplicate insertion
            if (!refereesByReferrer[c.username].some((existing) => existing.username === r.username)) {
              refereesByReferrer[c.username].push(r);
            }
          }
        });
      });

      const affiliates = candidates.map(u => {
        const refs = refereesByReferrer[u.username] || [];
        const activeDepositors = refs.filter(r => (r.totalDeposited || 0) > 0);
        const totalDeposits = refs.reduce((sum, r) => sum + Number(r.totalDeposited || 0), 0);

        return {
          userId: u._id.toString(),
          username: u.username,
          email: u.email || 'N/A',
          referralCode: u.referralCode || u.username.toUpperCase(),
          commissionRate: u.affiliateRate || defaultReferralPercent,
          commissionsEarned: Number(u.affiliateCommissionsEarned || 0),
          commissionsUnpaid: Number(u.affiliateCommissionsUnpaid || 0),
          totalReferrals: refs.length,
          activeDepositors: activeDepositors.length,
          totalDepositsGenerated: Number(totalDeposits.toFixed(2)),
          currentWalletSC: Number(u.balanceSC || 0),
          createdAt: u.createdAt,
          referees: refs.map(r => ({
            id: r._id.toString(),
            username: r.username,
            email: r.email,
            joinedAt: r.createdAt,
            totalDeposited: Number(r.totalDeposited || 0),
            balanceSC: Number(r.balanceSC || 0),
          })),
        };
      });

      const totalPartners = affiliates.length;
      const totalReferees = allReferees.length;
      const totalEarned = affiliates.reduce((sum, a) => sum + a.commissionsEarned, 0);
      const totalUnpaid = affiliates.reduce((sum, a) => sum + a.commissionsUnpaid, 0);
      const totalVolume = affiliates.reduce((sum, a) => sum + a.totalDepositsGenerated, 0);

      return NextResponse.json({
        success: true,
        affiliates,
        summary: {
          totalPartners,
          totalReferees,
          totalEarned: Number(totalEarned.toFixed(2)),
          totalUnpaid: Number(totalUnpaid.toFixed(2)),
          totalVolume: Number(totalVolume.toFixed(2)),
        },
      });
    }

    // Player stats
    let user = await usersCol.findOne(getUserFilter(session));
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Ensure user has a persistent unique referral code
    if (!user.referralCode) {
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const newRefCode = `PP-${randomSuffix}`;
      await usersCol.updateOne({ _id: user._id }, { $set: { referralCode: newRefCode } });
      user.referralCode = newRefCode;
    }

    // Comprehensive query: match referred users by username, referralCode, or userId
    const searchConditions = [
      { referredBy: user.username },
      { referredBy: { $regex: new RegExp(`^${user.username}$`, 'i') } },
    ];
    if (user.referralCode) {
      const safeCode = user.referralCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchConditions.push(
        { referredBy: user.referralCode },
        { referredByCode: user.referralCode },
        { referredBy: { $regex: new RegExp(`^${safeCode}$`, 'i') } },
        { referredByCode: { $regex: new RegExp(`^${safeCode}$`, 'i') } }
      );
    }
    if (user._id) {
      searchConditions.push(
        { referrerId: user._id.toString() },
        { referrerId: user._id }
      );
    }

    const referredUsers = await usersCol
      .find({ $or: searchConditions })
      .project({ username: 1, email: 1, createdAt: 1, totalDeposited: 1, balanceSC: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      stats: {
        referralCode: user.referralCode || user.username || '',
        referralLink: `https://richroom.games/register?ref=${user.referralCode || user.username || ''}`,
        commissionRate: user.affiliateRate || defaultReferralPercent,
        totalReferrals: referredUsers.length,
        activeDepositors: referredUsers.filter(u => (u.totalDeposited || 0) > 0).length,
        commissionsEarned: Number(user.affiliateCommissionsEarned || 0),
        commissionsUnpaid: Number(user.affiliateCommissionsUnpaid || 0),
        referees: referredUsers.map(r => ({
          username: r.username,
          joinedAt: r.createdAt,
          hasDeposited: (r.totalDeposited || 0) > 0,
          totalDeposited: Number(r.totalDeposited || 0),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Player Claims Unpaid Affiliate Commission
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const usersCol = db.collection('users');
    const ledgerCol = db.collection('ledger');

    const user = await usersCol.findOne(getUserFilter(session));
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const claimable = Number(user.affiliateCommissionsUnpaid || 0);
    if (claimable <= 0) {
      return NextResponse.json({ success: false, error: 'No unpaid commission available to claim.' }, { status: 400 });
    }

    const oldSC = Number(user.balanceSC || 0);
    const newSC = Number((oldSC + claimable).toFixed(2));

    await usersCol.updateOne(
      { _id: user._id },
      {
        $inc: { balanceSC: claimable },
        $set: { affiliateCommissionsUnpaid: 0 },
      }
    );

    // Ledger record
    await ledgerCol.insertOne({
      userId: user._id.toString(),
      username: user.username,
      type: 'referral_bonus',
      currency: 'SC',
      amount: claimable,
      balanceBefore: oldSC,
      balanceAfter: newSC,
      performedBy: 'player',
      notes: `Claimed ${claimable} SC affiliate commission into playable wallet`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${claimable} SC into your playable balance!`,
      claimedAmount: claimable,
      newBalance: newSC,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Admin Operations (Instant Payout, Batch Payout, Custom Rate)
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.OPERATION_ADMIN, ROLES.FINANCIAL_MANAGER];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Permission denied.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, userId, customRate } = body;
    const db = await getDb();
    const usersCol = db.collection('users');
    const ledgerCol = db.collection('ledger');

    // 1. Single Partner Payout
    if (action === 'admin_payout') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Target userId required' }, { status: 400 });
      }

      const user = await usersCol.findOne(safeIdFilter(userId, ['username', 'email']));
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const claimable = Number(user.affiliateCommissionsUnpaid || 0);
      if (claimable <= 0) {
        return NextResponse.json({ success: false, error: 'This affiliate has no unpaid commissions to settle.' }, { status: 400 });
      }

      const oldSC = Number(user.balanceSC || 0);
      const newSC = Number((oldSC + claimable).toFixed(2));

      await usersCol.updateOne(
        { _id: user._id },
        {
          $inc: { balanceSC: claimable },
          $set: { affiliateCommissionsUnpaid: 0 },
        }
      );

      await ledgerCol.insertOne({
        userId: user._id.toString(),
        username: user.username,
        type: 'referral_bonus',
        currency: 'SC',
        amount: claimable,
        balanceBefore: oldSC,
        balanceAfter: newSC,
        performedBy: session.username || 'Admin Staff',
        notes: `Admin manual commission settlement: +$${claimable.toFixed(2)} SC paid directly to user wallet`,
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: `Successfully settled $${claimable.toFixed(2)} SC commission for ${user.username}!`,
        settledAmount: claimable,
        newBalance: newSC,
      });
    }

    // 2. Batch Payout (Settle All Unpaid)
    if (action === 'admin_payout_all') {
      const pendingUsers = await usersCol.find({ affiliateCommissionsUnpaid: { $gt: 0 } }).toArray();

      if (pendingUsers.length === 0) {
        return NextResponse.json({ success: false, error: 'No affiliates currently have pending unpaid commissions.' }, { status: 400 });
      }

      let totalSettled = 0;
      let count = 0;

      for (const u of pendingUsers) {
        const claimable = Number(u.affiliateCommissionsUnpaid || 0);
        if (claimable > 0) {
          const oldSC = Number(u.balanceSC || 0);
          const newSC = Number((oldSC + claimable).toFixed(2));

          await usersCol.updateOne(
            { _id: u._id },
            {
              $inc: { balanceSC: claimable },
              $set: { affiliateCommissionsUnpaid: 0 },
            }
          );

          await ledgerCol.insertOne({
            userId: u._id.toString(),
            username: u.username,
            type: 'referral_bonus',
            currency: 'SC',
            amount: claimable,
            balanceBefore: oldSC,
            balanceAfter: newSC,
            performedBy: session.username || 'Admin Staff',
            notes: `Batch commission payout settlement: +$${claimable.toFixed(2)} SC`,
            createdAt: new Date(),
          });

          totalSettled += claimable;
          count++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Batch settlement complete! Paid total of $${totalSettled.toFixed(2)} SC across ${count} affiliates.`,
        totalSettled,
        count,
      });
    }

    // 3. Update Custom Commission Rate
    if (action === 'update_rate') {
      if (!userId || customRate === undefined) {
        return NextResponse.json({ success: false, error: 'userId and customRate required' }, { status: 400 });
      }

      const rate = Math.min(100, Math.max(1, Number(customRate)));
      await usersCol.updateOne(
        safeIdFilter(userId, ['username', 'email']),
        { $set: { affiliateRate: rate } }
      );

      return NextResponse.json({
        success: true,
        message: `Affiliate commission rate updated to ${rate}%!`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
