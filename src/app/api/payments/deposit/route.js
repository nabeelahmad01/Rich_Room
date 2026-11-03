import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser, ROLES, getUserFilter } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { findUserGameAccount } from '@/lib/gameAccounts';

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

    if (!proofImage) {
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
    const approvedDepositsCount = await depositsCol.countDocuments({
      userId: session.userId,
      status: 'approved',
    });
    const hasClaimedWelcome = Boolean(
      approvedDepositsCount > 0 || user?.welcomeBonusClaimed || (user?.totalDeposited && user.totalDeposited > 0)
    );

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
    let resolvedGameUsername = String(body.gameAccountUsername || '').trim();

    if (requestedGame && !resolvedGameUsername) {
      const accCheck = await findUserGameAccount(
        db,
        {
          userId: user?._id || session.userId,
          userEmail: user?.email || session.email,
          username: user?.username || session.username,
        },
        requestedGame
      );
      if (accCheck.exists) {
        resolvedGameUsername = accCheck.username;
      }
    }

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
      proofImage: proofImage || null,
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

    // Notify staff desk immediately (Never sent to players)
    notifyStaff({
      title: '💵 New Deposit Submitted',
      message: `@${user?.username || session.username} submitted a deposit of $${depositAmount.toFixed(2)} via ${resolvedMethodName}.`,
      type: 'deposit_submitted',
      data: {
        depositId: res.insertedId.toString(),
        url: '/admin?tab=finance',
      },
    });

    return NextResponse.json({
      success: true,
      depositId: res.insertedId.toString(),
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
        const resolvedEmail = String(deposit.playerPaymentEmail || `${resolvedUsername}@playersparadisehub.com`).toLowerCase().trim();

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

      // 3. Write Immutable Ledger
      const baseDepositAmount = Number(deposit.amount || 0);
      const bonusAmount = Number(deposit.bonusSC || 0);
      const bonusTypeLabel = (deposit.bonusType || 'Welcome').trim();

      if (bonusAmount > 0) {
        const intermediateSC = Number((oldSC + baseDepositAmount).toFixed(2));
        // 3a. Base Deposit Record
        await ledgerCol.insertOne({
          userId: user._id.toString(),
          username: user.username,
          type: 'deposit',
          currency: 'SC',
          amount: baseDepositAmount,
          balanceBefore: oldSC,
          balanceAfter: intermediateSC,
          performedBy: session.username,
          staffRole: session.role,
          referenceId: depositId,
          notes: `Deposit $${baseDepositAmount.toFixed(2)} approved via ${deposit.methodName}. TXID: ${deposit.txHash || 'N/A'}`,
          createdAt: new Date(),
        });

        // 3b. Bonus Record
        await ledgerCol.insertOne({
          userId: user._id.toString(),
          username: user.username,
          type: bonusTypeLabel.toLowerCase().includes('welcome') ? 'welcome_bonus' : 'deposit_bonus',
          currency: 'SC',
          amount: bonusAmount,
          balanceBefore: intermediateSC,
          balanceAfter: newSC,
          performedBy: session.username,
          staffRole: session.role,
          referenceId: depositId,
          notes: `${bonusTypeLabel} Bonus: +$${bonusAmount.toFixed(2)} SC credited on deposit ($${baseDepositAmount.toFixed(2)})`,
          createdAt: new Date(Date.now() + 500),
        });
      } else {
        // Standard single deposit without bonus
        await ledgerCol.insertOne({
          userId: user._id.toString(),
          username: user.username,
          type: 'deposit',
          currency: 'SC',
          amount: creditedSC,
          balanceBefore: oldSC,
          balanceAfter: newSC,
          performedBy: session.username,
          staffRole: session.role,
          referenceId: depositId,
          notes: `Deposit $${deposit.amount} approved via ${deposit.methodName}. TXID: ${deposit.txHash || 'N/A'}`,
          createdAt: new Date(),
        });
      }

      // 4. Dynamic Referral Bonus Engine: Trigger on Referred Friend's First Approved Deposit
      const approvedCount = await depositsCol.countDocuments({
        userId: deposit.userId,
        status: 'approved',
      });

      const isFirstDeposit = approvedCount <= 1 && !user.referralRewardPaid;

      if (user.referredBy && isFirstDeposit) {
        const refIdentifier = String(user.referredBy).trim();
        const referrer = await usersCol.findOne({
          $or: [
            { username: refIdentifier.toLowerCase() },
            { username: refIdentifier },
            { referralCode: refIdentifier.toUpperCase() },
            { referralCode: refIdentifier },
          ],
        });

        if (referrer) {
          const settingsCol = db.collection('system_settings');
          const sysSettings = await settingsCol.findOne({ key: 'general' });
          const isReferralActive = sysSettings?.referralBonusActive !== false;
          const referralPercent = isReferralActive ? Number(sysSettings?.referralBonusPercent ?? 20) : 0;
          const bonusSC = Number(((deposit.amount * referralPercent) / 100).toFixed(2));

          if (bonusSC > 0) {
            const refOldSC = Number(referrer.balanceSC || 0);
            const refNewSC = Number((refOldSC + bonusSC).toFixed(2));

            // A. Credit Referrer Wallet Directly
            await usersCol.updateOne(
              { _id: referrer._id },
              {
                $inc: {
                  balanceSC: bonusSC,
                  totalReferralRewards: bonusSC,
                  affiliateCommissionsEarned: bonusSC,
                },
              }
            );

            // B. Record in Ledger
            await ledgerCol.insertOne({
              userId: referrer._id.toString(),
              username: referrer.username,
              type: 'referral_bonus',
              currency: 'SC',
              amount: bonusSC,
              balanceBefore: refOldSC,
              balanceAfter: refNewSC,
              performedBy: session.username,
              staffRole: session.role,
              referenceId: deposit._id.toString(),
              notes: `Referral Bonus: ${referralPercent}% bonus ($${bonusSC.toFixed(2)} SC) credited to wallet from @${user.username}'s first deposit ($${deposit.amount}).`,
              createdAt: new Date(),
            });

            // C. In-App & Push Notification to Referrer (Strictly to referrer only!)
            const notifTitle = `🎁 Referral Bonus: +$${bonusSC.toFixed(2)} SC!`;
            const notifMessage = `Congratulations! Your referred friend @${user.username} made their first deposit ($${deposit.amount}). You received a ${referralPercent}% referral bonus of $${bonusSC.toFixed(2)} SC directly into your wallet!`;

            notifyPlayer({
              userId: referrer._id.toString(),
              userEmail: referrer.email,
              username: referrer.username,
              title: notifTitle,
              message: notifMessage,
              type: 'bonus',
              data: { amount: String(bonusSC), url: '/wallet' },
            });

            // D. Email Notification to Referrer
            if (referrer.email) {
              sendEmail({
                to: referrer.email,
                subject: `🎁 $${bonusSC.toFixed(2)} SC Referral Bonus Added to Your Wallet!`,
                html: `
                  <div style="background-color: #070514; color: #FFFFFF; padding: 32px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: auto; border-radius: 16px; border: 1px solid rgba(0, 240, 255, 0.4); text-align: center;">
                    <img src="https://playersparadisehub.com/logo.png" alt="Players Paradise" style="height: 48px; margin-bottom: 12px;" />
                    <h1 style="color: #00F0FF; margin: 0; font-size: 20px; font-weight: 900;">PLAYERS PARADISE</h1>
                    <p style="color: #E026D8; font-size: 11px; margin: 4px 0 20px 0; text-transform: uppercase; letter-spacing: 2px;">Referral Reward Earned</p>
                    <div style="background: #0E0A24; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 12px; padding: 20px; text-align: left; margin: 20px 0;">
                      <h2 style="font-size: 16px; margin: 0 0 10px 0; color: #10B981;">+$${bonusSC.toFixed(2)} SC Credited to Your Wallet</h2>
                      <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0;">
                        Your referred friend <b>@${user.username}</b> made their first deposit of <b>$${deposit.amount}</b>. Based on our <b>${referralPercent}%</b> referral rate, your bonus has been credited straight into your wallet!
                      </p>
                    </div>
                    <a href="https://playersparadisehub.com/wallet" style="display: inline-block; background: linear-gradient(135deg, #00F0FF 0%, #E026D8 100%); color: #070514; font-weight: 900; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-size: 13px;">
                      VIEW WALLET &amp; PLAY
                    </a>
                  </div>
                `,
              }).catch(() => {});
            }

            // E. Mark Player So Bonus Cannot Be Claimed Multiple Times
            await usersCol.updateOne(
              { _id: user._id },
              {
                $set: {
                  referralRewardPaid: true,
                  referralRewardAmount: bonusSC,
                  referralRewardPaidAt: new Date(),
                  referredByUserId: referrer._id.toString(),
                },
              }
            );
          }
        }
      }

      // Send confirmation email
      sendEmail({
        to: user.email,
        subject: `Deposit Confirmed: ${creditedSC} SC credited to your Players Paradise wallet!`,
        html: `<p>Hi ${user.username}, your deposit of $${deposit.amount} via ${deposit.methodName} was verified and ${creditedSC} SC (+ ${creditedGC.toLocaleString()} GC) was credited to your account. Best of luck at the tables!</p>`,
      }).catch(() => {});

      // Instant In-App and Push Notification
      notifyPlayer({
        userId: user._id,
        userEmail: user.email,
        username: user.username,
        title: 'Deposit Approved! 🎉',
        message: `Your deposit of $${deposit.amount} was approved! ${creditedSC} SC credited to your wallet + 2 Free Spins unlocked!`,
        type: 'deposit_approved',
        data: { amount: String(creditedSC) },
      });

      // 5. Automatic Game Account Request Creation if Player Deposited without an Existing Account
      let autoAccountRequestCreated = false;
      if (deposit.gameTitle) {
        const cleanEmail = (user.email || deposit.playerPaymentEmail || '').toLowerCase().trim();
        const cleanGameTitle = deposit.gameTitle.trim();

        const accCheck = await findUserGameAccount(
          db,
          {
            userId: user._id,
            userEmail: cleanEmail,
            username: user.username,
          },
          cleanGameTitle
        );

        if (!accCheck.exists) {
          // Check if an account request is already pending
          const existingPending = await db.collection('accountRequests').findOne({
            userEmail: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            gameTitle: { $regex: new RegExp(`^${cleanGameTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            status: 'PENDING',
            requestType: { $ne: 'COIN_LOAD' },
          });

          if (!existingPending) {
            autoAccountRequestCreated = true;
            await db.collection('accountRequests').insertOne({
              userEmail: cleanEmail,
              userName: user.username,
              gameTitle: cleanGameTitle,
              gameId: deposit.gameId || cleanGameTitle.toLowerCase().replace(/\s+/g, '-'),
              requestType: 'ACCOUNT_CREATION',
              transferAmount: 0,
              status: 'PENDING',
              sourceDepositId: deposit._id.toString(),
              depositAmount: deposit.amount,
              notes: `Auto-generated from approved deposit of $${deposit.amount.toFixed(2)} via ${deposit.methodName || 'Payment'}`,
              createdAt: new Date(),
            });

            // Instant notification to player informing them their account request is now queued for staff
            notifyPlayer({
              userId: user._id,
              userEmail: cleanEmail,
              username: user.username,
              title: `Game Account Request Queued: ${cleanGameTitle}! 🎮`,
              message: `Deposit approved! Since you don't have a ${cleanGameTitle} account yet, an account creation request has been automatically sent to staff. Your login credentials will appear under My Game IDs shortly.`,
              type: 'account_request_created',
              data: { gameTitle: cleanGameTitle, depositId: deposit._id.toString() },
            });
          }
        }
      }

      return NextResponse.json({ success: true, message: `Deposit approved! Credited ${creditedSC} SC to ${user.username}.` });
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

      // Instant In-App and Push Notification for player
      if (user) {
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
