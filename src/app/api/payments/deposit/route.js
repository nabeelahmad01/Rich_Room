import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser, ROLES, getUserFilter } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import {
  publishFinanceDeposit,
  publishAccountRequestCreated,
} from '@/lib/realtimePublish';
import { findUserGameAccount } from '@/lib/gameAccounts';
import { runDepositApproveSideEffects } from '@/lib/depositApproveSideEffects';

// GET: List Deposits (Admin / Financial Manager) or Player's own
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const lightweight = searchParams.get('lightweight') === 'true';

    const db = await getDb();
    const depositsCol = db.collection('deposits');

    const query = {};
    const isStaff =
      session.role === ROLES.SUPER_ADMIN ||
      session.role === ROLES.FINANCIAL_MANAGER ||
      session.role === ROLES.OPERATION_ADMIN;

    if (!isStaff) {
      query.userId = session.userId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    let deposits;
    if (lightweight) {
      deposits = await depositsCol
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $limit: 100 },
          {
            $addFields: {
              hasProofImage: {
                $or: [
                  { $ne: [{ $ifNull: ['$proofImage', ''] }, ''] },
                  { $ne: [{ $ifNull: ['$proofUrl', ''] }, ''] },
                  { $ne: [{ $ifNull: ['$receiptImage', ''] }, ''] },
                  { $ne: [{ $ifNull: ['$screenshot', ''] }, ''] },
                ],
              },
            },
          },
          {
            $project: {
              proofImage: 0,
              receiptImage: 0,
              screenshot: 0,
            },
          },
        ])
        .toArray();
    } else {
      deposits = await depositsCol.find(query).sort({ createdAt: -1 }).limit(100).toArray();
    }

    return NextResponse.json({
      success: true,
      deposits: deposits.map(d => {
        const bonusType = d.bonusType || 'welcome';
        const bonusPercent = d.bonusPercent ?? (bonusType === 'welcome' ? 120 : 50);
        const bonusSC = d.bonusSC !== undefined ? d.bonusSC : Number(((d.amount * bonusPercent) / 100).toFixed(2));
        const totalSC = d.totalSC !== undefined ? d.totalSC : Number((d.amount + bonusSC).toFixed(2));
        const totalGC = d.totalGC !== undefined ? d.totalGC : (d.amount * 10000);

        const hasProof = d.hasProofImage !== undefined
          ? Boolean(d.hasProofImage)
          : Boolean(d.proofImage || d.proofUrl || d.receiptImage || d.screenshot);

        let resolvedProofImage = null;
        if (hasProof) {
          if (d.proofUrl) {
            resolvedProofImage = d.proofUrl;
          } else if (d.proofImage && !d.proofImage.startsWith('data:')) {
            resolvedProofImage = d.proofImage;
          } else {
            resolvedProofImage = `/api/payments/deposit/proof?id=${d._id}`;
          }
        }

        return {
          id: d._id.toString(),
          userId: d.userId,
          username: d.username,
          amount: d.amount,
          methodName: d.methodName || d.method || 'Payment',
          method: d.method || d.methodName || 'Payment',
          playerTagName: d.playerTagName || d.senderNote || '',
          playerPaymentEmail: d.playerPaymentEmail || '',
          senderNote: d.senderNote || d.playerTagName || '',
          proofImage: resolvedProofImage,
          hasProof: hasProof,
          txHash: d.txHash || '',
          bonusType,
          bonusPercent,
          bonusSC,
          totalSC,
          totalGC,
          creditedSC: d.creditedSC || null,
          gameTitle: d.gameTitle || null,
          gameId: d.gameId || null,
          gameAccountUsername: d.gameAccountUsername || null,
          hasGameAccount: Boolean(d.gameAccountUsername),
          status: d.status,
          processedBy: d.processedBy || null,
          rejectReason: d.rejectReason || null,
          createdAt: d.createdAt,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Player Submit Deposit Request
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      amount,
      methodId,
      methodName,
      playerTagName,
      playerPaymentEmail,
      senderNote,
      proofImage,
      txHash,
      gameTitle,
      gameId,
    } = body;

    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount < 5) {
      return NextResponse.json({ success: false, error: 'Minimum deposit is $5.00.' }, { status: 400 });
    }

    const resolvedMethodName = String(methodName || body.method || body.gateway || '').trim();
    const resolvedMethodId = String(methodId || body.methodId || body.gatewayId || 'cashapp').trim();
    const resolvedTxHash = String(txHash || body.transactionId || body.txId || '').trim();

    if (!resolvedMethodName) {
      return NextResponse.json({ success: false, error: 'Payment method is required.' }, { status: 400 });
    }

    const tagName = (playerTagName || senderNote || '').trim();
    if (!tagName) {
      return NextResponse.json({ success: false, error: 'Your payment tag name / handle is required.' }, { status: 400 });
    }

    const proofDeferred = Boolean(body.proofDeferred);
    if (!proofImage && !proofDeferred) {
      return NextResponse.json({ success: false, error: 'Payment proof screenshot is required.' }, { status: 400 });
    }

    const db = await getDb();
    const depositsCol = db.collection('deposits');
    const usersCol = db.collection('users');
    const settingsCol = db.collection('system_settings');

    const [user, settings] = await Promise.all([
      usersCol.findOne(getUserFilter(session)),
      settingsCol.findOne({ key: 'general' }),
    ]);

    // Check whether player is claiming Welcome Bonus (first deposit) or Regular Bonus (repeat reload)
    let hasClaimedWelcome = Boolean(
      user?.welcomeBonusClaimed || (user?.totalDeposited && user.totalDeposited > 0)
    );
    if (!hasClaimedWelcome) {
      const approvedDepositsCount = await depositsCol.countDocuments({
        userId: session.userId,
        status: 'approved',
      });
      hasClaimedWelcome = approvedDepositsCount > 0;
    }

    const bonusType = hasClaimedWelcome ? 'regular' : 'welcome';
    const isBonusActive = hasClaimedWelcome
      ? settings?.regularBonusActive !== false
      : settings?.welcomeBonusActive !== false;

    const bonusPercent = !isBonusActive
      ? 0
      : hasClaimedWelcome
      ? Number(settings?.regularBonusPercent ?? 50)
      : Number(settings?.welcomeBonusPercent ?? 120);
    const bonusMax = hasClaimedWelcome
      ? Number(settings?.regularBonusMax ?? 2500)
      : Number(settings?.welcomeBonusMax ?? 7500);

    const bonusSC = Number(Math.min((depositAmount * bonusPercent) / 100, bonusMax).toFixed(2));
    const totalSC = Number((depositAmount + bonusSC).toFixed(2));
    const totalGC = depositAmount * 10000;

    const resolvedUserId = (user && user._id) ? user._id.toString() : (session.userId || 'custom');

    const requestedGame = String(gameTitle || body.game || '').trim();
    const resolvedGameUsername = String(body.gameAccountUsername || '').trim();
    const proofPayload = proofImage || null;
    const deferGameUsernameLookup = Boolean(requestedGame && !resolvedGameUsername);

    const newDeposit = {
      userId: resolvedUserId,
      username: user?.username || session.username,
      amount: depositAmount,
      methodId: resolvedMethodId || 'custom',
      methodName: resolvedMethodName,
      method: resolvedMethodName,
      playerTagName: tagName,
      playerPaymentEmail: (playerPaymentEmail || user?.email || '').trim(),
      senderNote: tagName,
      proofImage: null,
      proofPending: Boolean(proofDeferred),
      txHash: resolvedTxHash,
      gameTitle: requestedGame || null,
      gameId: gameId || (requestedGame ? requestedGame.toLowerCase().replace(/\s+/g, '-') : null),
      gameAccountUsername: resolvedGameUsername || null,
      hasGameAccount: Boolean(resolvedGameUsername),
      bonusType,
      bonusPercent,
      bonusSC,
      totalSC,
      totalGC,
      status: 'pending',
      processedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await depositsCol.insertOne(newDeposit);
    const depositIdStr = res.insertedId.toString();

    publishFinanceDeposit({
      action: 'created',
      status: 'pending',
      userEmail: user?.email || session.email,
      userId: resolvedUserId,
      depositId: depositIdStr,
      amount: depositAmount,
      username: user?.username || session.username,
      methodName: resolvedMethodName,
      totalSC,
      bonusSC,
      gameTitle: requestedGame || '',
      playerTagName: tagName,
      txHash: resolvedTxHash,
      hasProof: Boolean(proofPayload),
    });

    const insertedId = res.insertedId;
    void (async () => {
      try {
        if (proofPayload) {
          await depositsCol.updateOne(
            { _id: insertedId },
            { $set: { proofImage: proofPayload, updatedAt: new Date() } }
          );
        }
        if (deferGameUsernameLookup) {
          const accCheck = await findUserGameAccount(
            db,
            {
              userId: user?._id || session.userId,
              userEmail: user?.email || session.email,
              username: user?.username || session.username,
            },
            requestedGame
          );
          if (accCheck.exists && accCheck.username) {
            await depositsCol.updateOne(
              { _id: insertedId },
              {
                $set: {
                  gameAccountUsername: accCheck.username,
                  hasGameAccount: true,
                  updatedAt: new Date(),
                },
              }
            );
          }
        }
        notifyStaff({
          title: '💵 New Deposit Submitted',
          message: `@${user?.username || session.username} submitted a deposit of $${depositAmount.toFixed(2)} via ${resolvedMethodName}.`,
          type: 'deposit_submitted',
          data: {
            depositId: depositIdStr,
            url: '/admin?tab=finance',
          },
        });
      } catch {
        /* background */
      }
    })();

    return NextResponse.json({
      success: true,
      depositId: depositIdStr,
      calculatedCoins: {
        totalSC,
        bonusSC,
        bonusType,
        bonusPercent,
        totalGC,
      },
      message: `Deposit of $${depositAmount.toFixed(2)} with ${bonusPercent}% bonus (${totalSC} SC total) submitted! Verification in progress.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Financial Manager & Super Admin Approve / Reject Deposit
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    const authorizedRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.FINANCIAL_MANAGER,
      ROLES.OPERATION_ADMIN,
    ];
    if (!session || !authorizedRoles.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Financial Manager access required.' }, { status: 403 });
    }

    const { depositId, action, rejectReason, customSC, customGC } = await req.json();

    if (!depositId || !action) {
      return NextResponse.json({ success: false, error: 'Deposit ID and action required.' }, { status: 400 });
    }

    const db = await getDb();
    const depositsCol = db.collection('deposits');
    const usersCol = db.collection('users');
    const ledgerCol = db.collection('ledger');

    const safeFilter = (targetId) => {
      if (!targetId) return { _id: null };
      const is24Hex = typeof targetId === 'string' && targetId.length === 24 && /^[0-9a-fA-F]{24}$/.test(targetId);
      if (is24Hex && ObjectId.isValid(targetId)) {
        return { $or: [{ _id: new ObjectId(targetId) }, { _id: targetId }, { id: targetId }] };
      }
      return { $or: [{ _id: targetId }, { id: targetId }] };
    };

    const deposit = await depositsCol.findOne(safeFilter(depositId));
    if (!deposit) {
      return NextResponse.json({ success: false, error: 'Deposit record not found.' }, { status: 404 });
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json({ success: false, error: `Deposit is already marked as ${deposit.status}.` }, { status: 400 });
    }

    let user = await usersCol.findOne(getUserFilter({
      userId: deposit.userId,
      username: deposit.username,
      email: deposit.playerPaymentEmail,
    }));

    if (!user && deposit.username) {
      user = await usersCol.findOne({
        username: { $regex: new RegExp(`^${deposit.username.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
    }

    if (!user && deposit.playerPaymentEmail) {
      user = await usersCol.findOne({
        email: { $regex: new RegExp(`^${deposit.playerPaymentEmail.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
    }

    if (!user) {
      if (action === 'reject') {
        const finalRejectReason = rejectReason || 'Associated player not found / unverified';
        await depositsCol.updateOne(
          { _id: deposit._id },
          {
            $set: {
              status: 'rejected',
              rejectReason: finalRejectReason,
              processedBy: `${session.username} (${session.role})`,
              updatedAt: new Date(),
            },
          }
        );
        return NextResponse.json({ success: true, message: 'Deposit rejected.' });
      }

      if (action === 'approve') {
        // Auto-provision / restore player account so player deposit and balance are not lost
        const is24Hex = typeof deposit.userId === 'string' && deposit.userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(deposit.userId);
        const resolvedId = (is24Hex && ObjectId.isValid(deposit.userId)) ? new ObjectId(deposit.userId) : new ObjectId();
        const resolvedUsername = String(deposit.username || deposit.playerPaymentEmail?.split('@')[0] || 'player').trim();
        const resolvedEmail = String(deposit.playerPaymentEmail || `${resolvedUsername}@richroom.games`).toLowerCase().trim();

        user = {
          _id: resolvedId,
          username: resolvedUsername,
          email: resolvedEmail,
          role: 'player',
          balanceSC: 0,
          balanceGC: 0,
          totalDeposited: 0,
          availableSpins: 2,
          welcomeBonusClaimed: false,
          createdAt: new Date(),
          autoRestored: true,
        };

        await usersCol.insertOne(user);
        await depositsCol.updateOne({ _id: deposit._id }, { $set: { userId: user._id.toString() } });
      } else {
        return NextResponse.json({ success: false, error: 'Associated player not found.' }, { status: 404 });
      }
    }

    if (action === 'approve') {
      // Determine final coins to credit (use custom if provided, otherwise auto-calculated totalSC)
      const creditedSC = customSC !== undefined && customSC !== null && customSC !== ''
        ? Number(customSC)
        : (deposit.totalSC !== undefined ? Number(deposit.totalSC) : Number((deposit.amount + (deposit.bonusSC || 0)).toFixed(2)));
      const creditedGC = customGC !== undefined && customGC !== null && customGC !== ''
        ? Number(customGC)
        : (deposit.totalGC !== undefined ? Number(deposit.totalGC) : deposit.amount * 10000);

      const oldSC = user.balanceSC || 0;
      const newSC = Number((oldSC + creditedSC).toFixed(2));

      // 1. Credit Player Balance & mark welcome bonus claimed if first time
      const userUpdate = {
        $inc: {
          balanceSC: creditedSC,
          balanceGC: creditedGC,
          totalDeposited: deposit.amount,
          availableSpins: 2, // 2 Free Spins unlocked per approved deposit
        },
      };

      if (!user.welcomeBonusClaimed) {
        userUpdate.$set = { welcomeBonusClaimed: true };
      }

      await usersCol.updateOne({ _id: user._id }, userUpdate);

      // 2. Mark Deposit as Approved
      await depositsCol.updateOne(
        { _id: deposit._id },
        {
          $set: {
            status: 'approved',
            creditedSC,
            creditedGC,
            processedBy: `${session.username} (${session.role})`,
            updatedAt: new Date(),
          },
        }
      );

      publishFinanceDeposit({
        action: 'approve',
        status: 'approved',
        userEmail: user.email,
        userId: user._id.toString(),
        depositId: deposit._id.toString(),
        creditedSC,
      });

      notifyPlayer({
        userId: user._id,
        userEmail: user.email,
        username: user.username,
        title: 'Deposit Approved! 🎉',
        message: `Your deposit of $${deposit.amount} was approved! ${creditedSC} SC credited to your wallet + 2 Free Spins unlocked!`,
        type: 'deposit_approved',
        data: { amount: String(creditedSC) },
      });

      void runDepositApproveSideEffects({
        db,
        depositsCol,
        usersCol,
        ledgerCol,
        deposit,
        user,
        session,
        depositId,
        creditedSC,
        creditedGC,
        oldSC,
        newSC,
      }).catch((err) => console.warn('[deposit approve side effects]', err?.message || err));

      return NextResponse.json({
        success: true,
        creditedSC,
        message: `Deposit approved! Credited ${creditedSC} SC to ${user.username}.`,
      });

    } else if (action === 'reject') {
      const finalRejectReason = rejectReason || 'Payment receipt unverified';
      await depositsCol.updateOne(
        { _id: deposit._id },
        {
          $set: {
            status: 'rejected',
            rejectReason: finalRejectReason,
            processedBy: `${session.username} (${session.role})`,
            updatedAt: new Date(),
          },
        }
      );

      if (user) {
        publishFinanceDeposit({
          action: 'reject',
          status: 'rejected',
          userEmail: user.email,
          userId: user._id.toString(),
          depositId: deposit._id.toString(),
        });

        notifyPlayer({
          userId: user._id,
          userEmail: user.email,
          username: user.username,
          title: 'Deposit Update ⚠️',
          message: `Your deposit request ($${deposit.amount}) could not be approved: ${finalRejectReason}`,
          type: 'deposit_rejected',
        });
      }

      return NextResponse.json({ success: true, message: 'Deposit rejected.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
