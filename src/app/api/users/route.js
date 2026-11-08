import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getSessionUser, ROLES, safeIdFilter } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

// GET: List Player Accounts (Staff only)
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session || session.role === ROLES.PLAYER) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const search = (searchParams.get('search') || '').trim();
    const filterBanned = searchParams.get('banned');

    const db = await getDb();
    const usersCol = db.collection('users');

    // 1. Single User 360° Intelligence Profile
    if (userId) {
      const u = await usersCol.findOne(safeIdFilter(userId, ['username', 'email']), { projection: { passwordHash: 0 } });
      if (!u) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const depositsCol = db.collection('deposits');
      const redemptionsCol = db.collection('redemptions');
      const gameAccountsCol = db.collection('gameAccounts');
      const accountRequestsCol = db.collection('accountRequests');
      const ledgerCol = db.collection('ledger');

      const uIdStr = u._id.toString();
      const uEmail = (u.email || '').toLowerCase().trim();
      const uUsername = u.username || '';

      const depositMatch = {
        $or: [
          { userId: uIdStr },
          { username: uUsername },
          { userEmail: uEmail },
        ],
      };
      const withdrawMatch = {
        $or: [{ userId: uIdStr }, { username: uUsername }],
      };
      const approvedDepositStatuses = ['APPROVED', 'approved', 'COMPLETED', 'completed'];
      const paidWithdrawStatuses = ['COMPLETED', 'completed', 'approved', 'PAID'];

      const proofLen = (field) => ({
        $gt: [{ $strLenCP: { $ifNull: [field, ''] } }, 0],
      });

      const [
        depositTotalAgg,
        withdrawTotalAgg,
        deposits,
        withdrawals,
        gameAccounts,
        accountRequests,
        referrals,
        ledger,
      ] = await Promise.all([
        depositsCol
          .aggregate([
            { $match: { ...depositMatch, status: { $in: approvedDepositStatuses } } },
            { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } },
          ])
          .toArray(),
        redemptionsCol
          .aggregate([
            { $match: { ...withdrawMatch, status: { $in: paidWithdrawStatuses } } },
            { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } },
          ])
          .toArray(),
        depositsCol
          .aggregate([
            { $match: depositMatch },
            { $sort: { createdAt: -1 } },
            { $limit: 50 },
            {
              $project: {
                amount: 1,
                methodName: 1,
                status: 1,
                txHash: 1,
                senderNote: 1,
                createdAt: 1,
                proofUrl: 1,
                hasProofImage: {
                  $or: [
                    proofLen('$proofImage'),
                    proofLen('$receiptImage'),
                    proofLen('$screenshot'),
                    proofLen('$proofUrl'),
                  ],
                },
              },
            },
          ])
          .toArray(),
        redemptionsCol
          .aggregate([
            { $match: withdrawMatch },
            { $sort: { createdAt: -1 } },
            { $limit: 50 },
            {
              $project: {
                amount: 1,
                gameTitle: 1,
                payoutMethod: 1,
                destinationAddress: 1,
                status: 1,
                stage: 1,
                rejectionReason: 1,
                createdAt: 1,
                hasGameScreenshot: proofLen('$gameScreenshot'),
                hasQrCodeImage: proofLen('$qrCodeImage'),
              },
            },
          ])
          .toArray(),
        gameAccountsCol.find({ userEmail: uEmail }).sort({ createdAt: -1 }).limit(100).toArray(),
        accountRequestsCol
          .find({
            $or: [{ userEmail: uEmail }, { userName: uUsername }],
          })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray(),
        (async () => {
          const referralQuery = { $or: [{ referredBy: uUsername }] };
          if (u.referralCode) referralQuery.$or.push({ referredBy: u.referralCode });
          return usersCol
            .find(referralQuery)
            .project({ username: 1, email: 1, createdAt: 1, balanceSC: 1, totalDeposited: 1 })
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();
        })(),
        ledgerCol
          .find({ $or: [{ userId: uIdStr }, { username: uUsername }] })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray(),
      ]);

      const totalDepositsAmount = Number(depositTotalAgg[0]?.total || 0);
      const totalWithdrawalsAmount = Number(withdrawTotalAgg[0]?.total || 0);

      return NextResponse.json({
        success: true,
        user: {
          id: u._id.toString(),
          username: u.username,
          email: u.email,
          balanceSC: u.balanceSC ?? 0,
          balanceGC: u.balanceGC ?? 0,
          kycStatus: u.kycStatus || 'unverified',
          isBanned: Boolean(u.isBanned),
          banReason: u.banReason || '',
          referralCode: u.referralCode || '',
          referredBy: u.referredBy || '',
          deviceId: u.deviceId || u.boundDevices?.[0] || null,
          boundDevices: u.boundDevices || [],
          state: u.state || 'CA',
          country: u.country || 'US',
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
        },
        deposits: deposits.map((d) => {
          const id = d._id.toString();
          return {
            id,
            amount: Number(d.amount || 0),
            methodName: d.methodName || 'Payment Rail',
            status: (d.status || 'PENDING').toUpperCase(),
            txHash: d.txHash || '',
            senderNote: d.senderNote || '',
            hasProofImage: Boolean(d.hasProofImage),
            proofPreviewUrl: d.hasProofImage ? `/api/payments/deposit/proof?id=${id}` : null,
            createdAt: d.createdAt,
          };
        }),
        withdrawals: withdrawals.map((w) => {
          const id = w._id.toString();
          return {
            id,
            amount: Number(w.amount || 0),
            gameTitle: w.gameTitle || 'Sweepstakes Platform',
            payoutMethod: w.payoutMethod || 'Cash App',
            destinationAddress: w.destinationAddress || '',
            status: (w.status || 'PENDING').toUpperCase(),
            stage: w.stage || '',
            hasGameScreenshot: Boolean(w.hasGameScreenshot),
            hasQrCodeImage: Boolean(w.hasQrCodeImage),
            gameProofUrl: w.hasGameScreenshot
              ? `/api/payments/withdraw/proof?id=${id}&type=gameScreenshot`
              : null,
            qrProofUrl: w.hasQrCodeImage
              ? `/api/payments/withdraw/proof?id=${id}&type=qrCodeImage`
              : null,
            rejectionReason: w.rejectionReason || '',
            createdAt: w.createdAt,
          };
        }),
        gameAccounts: gameAccounts.map(g => ({
          id: g._id.toString(),
          gameTitle: g.gameTitle,
          username: g.username,
          password: g.password,
          status: g.status || 'READY',
          createdAt: g.createdAt,
        })),
        accountRequests: accountRequests.map(r => ({
          id: r._id.toString(),
          gameTitle: r.gameTitle,
          transferAmount: Number(r.transferAmount || 0),
          status: (r.status || 'PENDING').toUpperCase(),
          rejectionReason: r.rejectionReason || '',
          createdAt: r.createdAt,
        })),
        referrals: referrals.map(ref => ({
          id: ref._id.toString(),
          username: ref.username,
          email: ref.email,
          createdAt: ref.createdAt,
          balanceSC: ref.balanceSC ?? 0,
        })),
        ledger: ledger.map(l => ({
          id: l._id.toString(),
          type: l.type,
          amount: l.amount,
          currency: l.currency || 'SC',
          balanceAfter: l.balanceAfter,
          reason: l.reason || l.notes || '',
          processedBy: l.processedBy || l.performedBy || 'System',
          createdAt: l.createdAt,
        })),
        stats: {
          totalDepositsAmount,
          totalWithdrawalsAmount,
          netMargin: Number((totalDepositsAmount - totalWithdrawalsAmount).toFixed(2)),
          referralsCount: referrals.length,
          gameAccountsCount: gameAccounts.length,
          depositsCount: deposits.length,
          withdrawalsCount: withdrawals.length,
        },
      });
    }

    // 2. Directory Listing of Players with Aggregated Summary
    const query = { role: { $in: [ROLES.PLAYER, 'user', 'player', null] } };

    if (filterBanned === 'true') {
      query.isBanned = true;
    } else if (filterBanned === 'false') {
      query.isBanned = { $ne: true };
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await usersCol
      .find(query)
      .project({ passwordHash: 0 })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Fetch batch deposit & withdrawal totals and referral counts
    const depositsCol = db.collection('deposits');
    const redemptionsCol = db.collection('redemptions');

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const uIdStr = u._id.toString();
        const uEmail = (u.email || '').toLowerCase().trim();
        const uUsername = u.username || '';

        const [depSum, withSum, refCount] = await Promise.all([
          depositsCol
            .aggregate([
              {
                $match: {
                  $or: [{ userId: uIdStr }, { username: uUsername }, { userEmail: uEmail }],
                  status: { $in: ['APPROVED', 'approved', 'COMPLETED', 'completed'] },
                },
              },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ])
            .toArray(),
          redemptionsCol
            .aggregate([
              {
                $match: {
                  $or: [{ userId: uIdStr }, { username: uUsername }],
                  status: { $in: ['COMPLETED', 'completed', 'approved', 'PAID'] },
                },
              },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ])
            .toArray(),
          usersCol.countDocuments({
            $or: [{ referredBy: uUsername }, { referredBy: u.referralCode || '___none___' }],
          }),
        ]);

        return {
          id: u._id.toString(),
          username: u.username,
          email: u.email,
          balanceSC: u.balanceSC ?? 0,
          balanceGC: u.balanceGC ?? 0,
          totalDeposits: depSum[0]?.total || 0,
          totalWithdrawals: withSum[0]?.total || 0,
          referralsCount: refCount || 0,
          kycStatus: u.kycStatus || 'unverified',
          isBanned: Boolean(u.isBanned),
          banReason: u.banReason || '',
          referralCode: u.referralCode || '',
          referredBy: u.referredBy || '',
          deviceId: u.deviceId || u.boundDevices?.[0] || null,
          isSubscribed: Boolean(u.isSubscribed),
          createdAt: u.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Staff Updates to Player Account (Ban/Unban, Reset Password, Adjust Balance)
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session || session.role === ROLES.PLAYER) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action, reason, newPassword, balanceAdjustment } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Invalid user ID.' }, { status: 400 });
    }

    const db = await getDb();
    const usersCol = db.collection('users');
    const uFilter = safeIdFilter(userId, ['username', 'email']);
    const targetUser = await usersCol.findOne(uFilter);
    if (!targetUser) return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    const targetFilter = safeIdFilter(targetUser._id);

    if (action === 'toggleBan') {
      const newBannedState = !targetUser.isBanned;
      await usersCol.updateOne(
        targetFilter,
        {
          $set: {
            isBanned: newBannedState,
            banReason: newBannedState ? (reason || 'Violation of terms') : null,
            bannedAt: newBannedState ? new Date() : null,
            bannedBy: newBannedState ? session.username : null,
          },
        }
      );
      return NextResponse.json({
        success: true,
        message: newBannedState ? 'Player account banned.' : 'Player account restored and unbanned.',
        isBanned: newBannedState,
      });
    }

    if (action === 'resetPassword') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await usersCol.updateOne(targetFilter, { $set: { passwordHash: hash } });
      return NextResponse.json({ success: true, message: 'Password successfully reset.' });
    }

    if (action === 'adjustBalance') {
      const amount = Number(balanceAdjustment);
      if (isNaN(amount) || amount === 0) {
        return NextResponse.json({ success: false, error: 'Invalid adjustment amount.' }, { status: 400 });
      }

      const newBalance = Math.max(0, (targetUser.balanceSC || 0) + amount);
      await usersCol.updateOne(targetFilter, { $set: { balanceSC: newBalance } });

      // Log in ledger
      const ledgerCol = db.collection('ledger');
      await ledgerCol.insertOne({
        userId: targetUser._id.toString(),
        username: targetUser.username,
        type: amount > 0 ? 'STAFF_CREDIT' : 'STAFF_DEBIT',
        amount: Math.abs(amount),
        currency: 'SC',
        balanceAfter: newBalance,
        reason: reason || 'Staff adjustment',
        processedBy: session.username,
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, message: `Balance updated to $${newBalance.toFixed(2)}`, newBalance });
    }

    if (action === 'resetDevice') {
      await usersCol.updateOne(
        targetFilter,
        {
          $set: { deviceId: null, boundDevices: [], lastLoginDevice: null },
        }
      );

      return NextResponse.json({
        success: true,
        message: `Device binding cleared for player "${targetUser.username}". They can now bind a new device.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
