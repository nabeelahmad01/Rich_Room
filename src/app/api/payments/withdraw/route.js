import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser, ROLES, getUserFilter } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { publishFinanceWithdraw } from '@/lib/realtimePublish';
import { findUserGameAccount } from '@/lib/gameAccounts';
import { resolveMinCashoutFromSettings } from '@/lib/cashoutPolicy';

// GET: List Redemptions
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const stage = searchParams.get('stage');
    const lightweight = searchParams.get('lightweight') === 'true';

    const db = await getDb();
    const redemptionsCol = db.collection('redemptions');

    const isStaff =
      session.role === ROLES.SUPER_ADMIN ||
      session.role === ROLES.FINANCIAL_MANAGER ||
      session.role === ROLES.OPERATION_ADMIN ||
      session.role === ROLES.COIN_MANAGER;
    const query = {};

    if (!isStaff) {
      query.userId = session.userId;
    }

    if (status && status !== 'all') {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    if (stage && stage !== 'all') {
      query.stage = stage;
    }

    let items;
    if (lightweight) {
      items = await redemptionsCol
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $limit: 100 },
          {
            $addFields: {
              hasGameScreenshot: { $ne: [{ $ifNull: ['$gameScreenshot', ''] }, ''] },
              hasQrCodeImage: { $ne: [{ $ifNull: ['$qrCodeImage', ''] }, ''] },
            },
          },
          {
            $project: {
              gameScreenshot: 0,
              qrCodeImage: 0,
            },
          },
        ])
        .toArray();
    } else {
      items = await redemptionsCol.find(query).sort({ createdAt: -1 }).limit(100).toArray();
    }

    return NextResponse.json({
      success: true,
      redemptions: items.map(r => {
        const hasScreenshot = r.hasGameScreenshot !== undefined
          ? Boolean(r.hasGameScreenshot)
          : Boolean(r.gameScreenshot);
        const hasQr = r.hasQrCodeImage !== undefined
          ? Boolean(r.hasQrCodeImage)
          : Boolean(r.qrCodeImage);

        let resolvedScreenshot = null;
        if (hasScreenshot) {
          if (r.gameScreenshot && !r.gameScreenshot.startsWith('data:')) {
            resolvedScreenshot = r.gameScreenshot;
          } else {
            resolvedScreenshot = `/api/payments/withdraw/proof?id=${r._id}&type=gameScreenshot`;
          }
        }

        let resolvedQrCode = null;
        if (hasQr) {
          if (r.qrCodeImage && !r.qrCodeImage.startsWith('data:')) {
            resolvedQrCode = r.qrCodeImage;
          } else {
            resolvedQrCode = `/api/payments/withdraw/proof?id=${r._id}&type=qrCodeImage`;
          }
        }

        return {
          id: r._id.toString(),
          userId: r.userId,
          username: r.username,
          amount: r.amount,
          gameTitle: r.gameTitle || 'Standard Platform',
          gameAccountUsername: r.gameAccountUsername || '',
          gameScreenshot: resolvedScreenshot,
          qrCodeImage: resolvedQrCode,
          hasScreenshot: hasScreenshot,
          hasQrCode: hasQr,
        payoutMethod: r.payoutMethod,
        destinationTag: r.destinationTag || r.destinationAddress || '',
        destinationAddress: r.destinationAddress || r.destinationTag || '',
        status: r.status,
        stage: r.stage || (r.status === 'pending_coin' ? 'coin_verification' : 'finance_payout'),
        processedBy: r.processedBy || null,
        coinApprovedBy: r.coinApprovedBy || null,
        coinApprovedAt: r.coinApprovedAt || null,
        rejectReason: r.rejectReason || r.coinRejectReason || r.financeRejectReason || null,
        coinRejectReason: r.coinRejectReason || null,
        financeRejectReason: r.financeRejectReason || null,
        createdAt: r.createdAt,
      };
    }),
  });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Safe ID filter helper
const safeFilter = (targetId) => {
  if (!targetId) return { _id: null };
  const is24Hex = typeof targetId === 'string' && targetId.length === 24 && /^[0-9a-fA-F]{24}$/.test(targetId);
  if (is24Hex && ObjectId.isValid(targetId)) {
    return { $or: [{ _id: new ObjectId(targetId) }, { _id: targetId }, { id: targetId }] };
  }
  return { $or: [{ _id: targetId }, { id: targetId }] };
};

// POST: Player Request Redemption
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please login.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      amount,
      payoutMethod,
      destinationTag,
      destinationAddress,
      gameTitle,
      gameScreenshot,
      qrCodeImage,
      resubmitFrom,
      resubmitOfId,
    } = body;

    const redeemAmount = Number(amount);
    if (!redeemAmount || redeemAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Please enter a valid withdrawal amount.' }, { status: 400 });
    }

    const db = await getDb();
    const settingsDoc = await db.collection('system_settings').findOne({ key: 'general' });
    const minCashout = resolveMinCashoutFromSettings(settingsDoc || {});
    if (redeemAmount < minCashout) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum cashout is $${minCashout.toFixed(0)}. Please enter $${minCashout.toFixed(0)} or more.`,
        },
        { status: 400 }
      );
    }

    const finalTag = (destinationTag || destinationAddress || '').trim();
    if (!finalTag) {
      return NextResponse.json({ success: false, error: 'Your Payout Tag Name / Cashtag is required.' }, { status: 400 });
    }

    if (!payoutMethod) {
      return NextResponse.json({ success: false, error: 'Payout method is required.' }, { status: 400 });
    }

    if (!gameScreenshot) {
      return NextResponse.json({ success: false, error: 'Game winning screenshot is required to verify your winnings.' }, { status: 400 });
    }

    if (!qrCodeImage) {
      return NextResponse.json({ success: false, error: 'Your Payout QR Code screenshot is required.' }, { status: 400 });
    }

    const usersCol = db.collection('users');
    const redemptionsCol = db.collection('redemptions');
    const ledgerCol = db.collection('ledger');

    const user = await usersCol.findOne(getUserFilter(session));
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // Check user's current wallet balance
    const currentSC = Number(user.balanceSC ?? user.balance ?? 0);
    const frozen = Number(user.frozenBalance || 0);
    const availableSC = Math.max(0, Number((currentSC - frozen).toFixed(2)));

    // Verify player has an active game account for this game (Withdrawal blocked without game account!)
    const requestedGame = String(gameTitle || '').trim();
    if (!requestedGame) {
      return NextResponse.json(
        { success: false, error: 'Please select the game platform you won from.' },
        { status: 400 }
      );
    }

    const accountCheck = await findUserGameAccount(
      db,
      {
        userId: user._id,
        userEmail: user.email,
        username: user.username,
      },
      requestedGame
    );

    if (!accountCheck.exists) {
      return NextResponse.json(
        {
          success: false,
          noAccount: true,
          error: `Withdrawal Blocked: You do not have an active game account for "${requestedGame}". You must first create and play on a verified game account before requesting a cashout.`,
        },
        { status: 400 }
      );
    }

    const gameAccountUsername = accountCheck.username;

    // Redeem / Cashout is directly from external game winnings:
    // Do NOT deduct, freeze, or add to website wallet balance (balanceSC / frozenBalance stay untouched)
    const escrowFrozen = 0;

    // Initial cashout must go to Coin Allotment (Coin Operations Desk) first
    const initialStatus = 'pending_coin';
    const initialStage = 'coin_verification';

    // Create Redemption Record
    const insertRes = await redemptionsCol.insertOne({
      userId: user._id.toString(),
      username: user.username,
      amount: redeemAmount,
      escrowFrozen: escrowFrozen,
      gameTitle: requestedGame,
      gameAccountUsername: gameAccountUsername,
      gameScreenshot: gameScreenshot || null,
      qrCodeImage: qrCodeImage || null,
      destinationTag: finalTag,
      destinationAddress: (destinationAddress || finalTag).trim(),
      payoutMethod,
      status: initialStatus,
      stage: initialStage,
      processedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Write Ledger Entry for Cashout Audit Trail
    await ledgerCol.insertOne({
      userId: user._id.toString(),
      username: user.username,
      type: 'redemption_request',
      currency: 'SC',
      amount: redeemAmount,
      balanceBefore: currentSC,
      balanceAfter: currentSC,
      performedBy: 'player',
      referenceId: insertRes.insertedId.toString(),
      notes: `Cashout requested: $${redeemAmount.toFixed(2)} SC for ${requestedGame} (Game Account: @${gameAccountUsername}) via ${payoutMethod} to tag ${finalTag} (Routed to Coin Allotment; wallet balance unchanged)`,
      createdAt: new Date(),
    });

    notifyPlayer({
      userId: user._id.toString(),
      userEmail: user.email,
      username: user.username,
      title: 'Cashout Request Submitted ⏳',
      message: `Your cashout request for $${redeemAmount.toFixed(2)} SC has been sent to Coin Allotment Desk for game verification.`,
      type: 'withdraw_pending_coin',
    });

    // Notify staff desk immediately (Never sent to players)
    notifyStaff({
      title: '💸 New Cashout Request',
      message: `@${user.username} requested a cashout of $${redeemAmount.toFixed(2)} SC via ${payoutMethod}.`,
      type: 'withdraw_request',
      data: {
        redemptionId: insertRes.insertedId.toString(),
        url: '/admin?tab=finance',
      },
    });

    publishFinanceWithdraw({
      action: 'created',
      status: 'pending',
      userEmail: user.email,
      userId: user._id.toString(),
      redemptionId: insertRes.insertedId.toString(),
    });

    return NextResponse.json({
      success: true,
      message: `Cashout request for $${redeemAmount.toFixed(2)} submitted! It has been routed to Coin Allotment for game screenshot verification.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Approve or Reject Redemption (Coin Desk & Finance Desk)
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    const authorizedRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.FINANCIAL_MANAGER,
      ROLES.OPERATION_ADMIN,
      ROLES.COIN_MANAGER,
    ];
    if (!session || !authorizedRoles.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized staff action.' }, { status: 403 });
    }

    const { redemptionId, action, rejectReason } = await req.json();

    if (!redemptionId || !action) {
      return NextResponse.json({ success: false, error: 'Redemption ID and action required.' }, { status: 400 });
    }

    const db = await getDb();
    const redemptionsCol = db.collection('redemptions');
    const usersCol = db.collection('users');
    const ledgerCol = db.collection('ledger');

    const redemption = await redemptionsCol.findOne(safeFilter(redemptionId));
    if (!redemption) {
      return NextResponse.json({ success: false, error: 'Redemption not found.' }, { status: 404 });
    }

    const user = await usersCol.findOne(getUserFilter({
      userId: redemption.userId,
      username: redemption.username,
      email: redemption.userEmail || redemption.email,
    }));

    // ACTION 1: COIN DESK APPROVAL (Verify game score & forward to Finance / Cashier)
    if (action === 'coin_approve') {
      await redemptionsCol.updateOne(
        { _id: redemption._id },
        {
          $set: {
            status: 'pending',
            stage: 'finance_payout',
            coinApprovedBy: `${session.username} (${session.role})`,
            coinApprovedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      const currentSC = user ? Number(user.balanceSC ?? user.balance ?? 0) : 0;
      await ledgerCol.insertOne({
        userId: redemption.userId,
        username: redemption.username,
        type: 'coin_verification_passed',
        currency: 'SC',
        amount: redemption.amount,
        balanceBefore: currentSC,
        balanceAfter: currentSC,
        performedBy: session.username,
        staffRole: session.role,
        referenceId: redemptionId,
        notes: `Game score screenshot verified for ${redemption.gameTitle || 'platform'}. Forwarded to Finance Ledger for payout dispatch.`,
        createdAt: new Date(),
      });

      notifyPlayer({
        userId: redemption.userId,
        userEmail: user?.email,
        username: redemption.username,
        title: 'Cashout Verified by Coin Desk! 🎮',
        message: `Your winnings of $${redemption.amount} SC from ${redemption.gameTitle} have been verified by Coin Operations and forwarded to Finance Cashier for payout dispatch!`,
        type: 'withdraw_coin_approved',
      });

      publishFinanceWithdraw({
        action: 'coin_approve',
        status: 'pending',
        userEmail: user?.email,
        userId: redemption.userId,
        redemptionId,
      });

      return NextResponse.json({
        success: true,
        message: 'Game score verified! Cashout passed to Finance Cashier for payout dispatch.',
      });
    }

    // ACTION 2: COIN DESK REJECTION (Invalid screenshot, wrong score, etc.)
    if (action === 'coin_reject') {
      const reason = rejectReason || 'Game winning screenshot could not be verified or score mismatch.';

      // Wallet balance (balanceSC / frozenBalance) remains completely untouched on Redeem

      await redemptionsCol.updateOne(
        { _id: redemption._id },
        {
          $set: {
            status: 'rejected_by_coin',
            stage: 'rejected_coin',
            rejectReason: reason,
            coinRejectReason: reason,
            processedBy: `${session.username} (${session.role})`,
            updatedAt: new Date(),
          },
        }
      );

      const currentSC = user ? Number(user.balanceSC ?? user.balance ?? 0) : 0;
      await ledgerCol.insertOne({
        userId: redemption.userId,
        username: redemption.username,
        type: 'redemption_rejected_by_coin',
        currency: 'SC',
        amount: redemption.amount,
        balanceBefore: currentSC,
        balanceAfter: currentSC,
        performedBy: session.username,
        staffRole: session.role,
        referenceId: redemptionId,
        notes: `Coin Manager rejected cashout ($${redemption.amount} SC): ${reason}`,
        createdAt: new Date(),
      });

      notifyPlayer({
        userId: redemption.userId,
        userEmail: user?.email,
        username: redemption.username,
        title: 'Cashout Rejected by Coin Desk ⚠️',
        message: `Your cashout request ($${redemption.amount} SC) was not approved by Coin Operations: ${reason}.`,
        type: 'withdraw_rejected_by_coin',
      });

      publishFinanceWithdraw({
        action: 'coin_reject',
        status: 'rejected_by_coin',
        userEmail: user?.email,
        userId: redemption.userId,
        redemptionId,
      });

      return NextResponse.json({
        success: true,
        message: 'Cashout rejected by Coin Desk. Reason saved for player.',
      });
    }

    // ACTION 3: FINANCE DESK APPROVAL & PAYOUT DISPATCH (Wallet balance stays untouched!)
    if (action === 'approve' || action === 'finance_dispatch') {
      if (redemption.status === 'approved') {
        return NextResponse.json({ success: false, error: 'Redemption is already approved.' }, { status: 400 });
      }

      const withdrawAmount = Number(redemption.amount);
      const currentSC = user ? Number(user.balanceSC ?? user.balance ?? 0) : 0;

      // Wallet balance (balanceSC / frozenBalance) is NOT deducted or added to on Redeem

      await redemptionsCol.updateOne(
        { _id: redemption._id },
        {
          $set: {
            status: 'approved',
            stage: 'completed',
            processedBy: `${session.username} (${session.role})`,
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Record dispatch in ledger with unchanged wallet balance
      await ledgerCol.insertOne({
        userId: redemption.userId,
        username: redemption.username,
        type: 'redemption_payout',
        currency: 'SC',
        amount: withdrawAmount,
        balanceBefore: currentSC,
        balanceAfter: currentSC,
        performedBy: session.username,
        staffRole: session.role,
        referenceId: redemptionId,
        notes: `Cashout approved & dispatched ($${withdrawAmount.toFixed(2)} SC from ${redemption.gameTitle || 'game platform'}; wallet balance unchanged) via ${redemption.payoutMethod} to tag ${redemption.destinationTag || redemption.destinationAddress}`,
        createdAt: new Date(),
      });

      // Email notification if player has email
      if (user?.email) {
        sendEmail({
          to: user.email,
          subject: 'Rich Room Cashout Dispatched!',
          html: `<p>Hi ${user.username}, your cashout of $${withdrawAmount.toFixed(2)} via ${redemption.payoutMethod} to ${redemption.destinationTag || redemption.destinationAddress} has been approved and dispatched!</p>`,
        }).catch(() => {});
      }

      // Push & In-App Notification
      notifyPlayer({
        userId: redemption.userId,
        userEmail: user?.email,
        username: redemption.username,
        title: 'Cashout Dispatched! 💸',
        message: `Your cashout of $${withdrawAmount.toFixed(2)} via ${redemption.payoutMethod} has been approved and dispatched!`,
        type: 'withdraw_approved',
        data: { amount: String(withdrawAmount), newBalance: String(currentSC) },
      });

      publishFinanceWithdraw({
        action: 'approve',
        status: 'approved',
        userEmail: user?.email,
        userId: redemption.userId,
        redemptionId,
      });

      return NextResponse.json({
        success: true,
        newBalance: currentSC,
        message: `Cashout of $${withdrawAmount.toFixed(2)} approved and dispatched to ${redemption.username}!`,
      });
    }

    // ACTION 4: REJECT PAYOUT (Finance Rejection)
    if (action === 'reject' || action === 'finance_reject') {
      const reason = rejectReason || 'Game winning screenshot or payout tag could not be verified.';

      // Wallet balance (balanceSC / frozenBalance) remains completely untouched on Redeem

      await redemptionsCol.updateOne(
        { _id: redemption._id },
        {
          $set: {
            status: 'rejected',
            stage: 'rejected',
            rejectReason: reason,
            financeRejectReason: reason,
            processedBy: `${session.username} (${session.role})`,
            rejectedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      const currentSC = user ? Number(user.balanceSC ?? user.balance ?? 0) : 0;
      await ledgerCol.insertOne({
        userId: redemption.userId,
        username: redemption.username,
        type: 'redemption_rejected',
        currency: 'SC',
        amount: redemption.amount,
        balanceBefore: currentSC,
        balanceAfter: currentSC,
        performedBy: session.username,
        staffRole: session.role,
        referenceId: redemptionId,
        notes: `Cashout rejected by finance ($${redemption.amount} SC): ${reason}`,
        createdAt: new Date(),
      });

      notifyPlayer({
        userId: redemption.userId,
        userEmail: user?.email,
        username: redemption.username,
        title: 'Cashout Update ⚠️',
        message: `Your cashout request ($${redemption.amount} SC) could not be processed: ${reason}.`,
        type: 'withdraw_rejected',
      });

      publishFinanceWithdraw({
        action: 'reject',
        status: 'rejected',
        userEmail: user?.email,
        userId: redemption.userId,
        redemptionId,
      });

      return NextResponse.json({
        success: true,
        message: 'Cashout rejected. Rejection reason saved and sent to player.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
