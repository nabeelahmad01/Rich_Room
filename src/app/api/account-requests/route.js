import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, ROLES, safeIdFilter } from '@/lib/auth';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { findUserGameAccount } from '@/lib/gameAccounts';

// GET Account Requests
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // 'ACCOUNT_CREATION' | 'COIN_LOAD' | 'all'

    const db = await getDb();

    // Auto-migrate any legacy freeplay requests from 'account_requests' (underscore) into 'accountRequests'
    try {
      const legacyDocs = await db.collection('account_requests').find({}).toArray();
      if (legacyDocs.length > 0) {
        for (const doc of legacyDocs) {
          const { _id, ...rest } = doc;
          const fpAmt = Number(doc.freeplayAmount || doc.transferAmount || 5);
          await db.collection('accountRequests').insertOne({
            ...rest,
            userEmail: (doc.userEmail || '').toLowerCase().trim(),
            requestType: 'COIN_LOAD',
            transferAmount: fpAmt,
            isFreeplay: true,
            freeplayPending: true,
            freeplayAmount: fpAmt,
          });
          await db.collection('account_requests').deleteOne({ _id });
        }
      }
    } catch {}

    const query = {};

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      query.userEmail = cleanEmail;
    }
    if (status && status !== 'all') {
      query.status = status.toUpperCase();
    }

    if (type === 'ACCOUNT_CREATION') {
      query.$and = [
        { isFreeplay: { $ne: true } },
        { freeplayPending: { $ne: true } },
        {
          $or: [
            { requestType: 'ACCOUNT_CREATION' },
            {
              $and: [
                { requestType: { $ne: 'COIN_LOAD' } },
                { $or: [{ transferAmount: { $lte: 0 } }, { transferAmount: { $exists: false } }, { transferAmount: null }] }
              ]
            }
          ]
        }
      ];
    } else if (type === 'COIN_LOAD') {
      query.$and = [
        {
          $or: [
            { requestType: 'COIN_LOAD' },
            { isFreeplay: true },
            { freeplayPending: true },
            {
              $and: [
                { requestType: { $ne: 'ACCOUNT_CREATION' } },
                { transferAmount: { $gt: 0 } }
              ]
            }
          ]
        }
      ];
    }

    const requests = await db
      .collection('accountRequests')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      accountRequests: requests.map(r => {
        const isFp = Boolean(r.isFreeplay || r.freeplayPending);
        const fpAmt = Number(r.freeplayAmount || r.transferAmount || 0);
        return {
          id: r._id.toString(),
          userEmail: r.userEmail,
          userName: r.userName || r.userEmail?.split('@')[0],
          gameTitle: r.gameTitle,
          gameId: r.gameId || '',
          requestType: isFp ? 'COIN_LOAD' : (r.requestType || (Number(r.transferAmount || 0) > 0 ? 'COIN_LOAD' : 'ACCOUNT_CREATION')),
          status: r.status || 'PENDING',
          gameAccountUsername: r.gameAccountUsername || '',
          gameAccountPassword: r.gameAccountPassword || '',
          transferAmount: isFp ? (fpAmt || 5) : Number(r.transferAmount || 0),
          isFreeplay: isFp,
          freeplayPending: isFp,
          freeplayAmount: fpAmt,
          freeplayScreenshot: r.freeplayScreenshot || r.screenshot || '',
          freeplayTaskId: r.freeplayTaskId || '',
          rejectionReason: r.rejectionReason || r.rejectReason || '',
          createdAt: r.createdAt || new Date(),
        };
      }),
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST - User requests an account or loads coins for a game
export async function POST(req) {
  try {
    const session = await getSessionUser();
    const body = await req.json();
    const userEmail = (session?.email || body.userEmail || '').toLowerCase().trim();
    const userName = session?.username || body.userName || userEmail.split('@')[0];
    const gameTitle = String(body.gameTitle || '').trim();
    const gameId = body.gameId || '';

    const transferAmount = Math.max(0, Number(body.transferAmount || 0));
    const requestType = body.requestType || (transferAmount > 0 ? 'COIN_LOAD' : 'ACCOUNT_CREATION');

    if (!userEmail || !gameTitle) {
      return NextResponse.json({ success: false, message: 'Game title and user email are required.' }, { status: 400 });
    }

    const db = await getDb();
    const requestsCol = db.collection('accountRequests');
    const usersCol = db.collection('users');
    const ledgerCol = db.collection('ledger');

    let user = null;
    if (session?.userId) {
      try {
        user = await usersCol.findOne(safeIdFilter(session.userId));
      } catch (_) {}
    }
    if (!user) {
      user = await usersCol.findOne({
        $or: [
          { email: userEmail },
          { email: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { username: userName },
          { username: { $regex: new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        ],
      });
    }
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const currentSC = Number(user.balanceSC || 0);
    const frozen = Math.max(0, Number(user.frozenBalance || 0));
    const available = Math.max(0, Number((currentSC - frozen).toFixed(2)));

    // Verify player is not trying to load more than available balance (for COIN_LOAD)
    if (requestType === 'COIN_LOAD') {
      if (transferAmount <= 0) {
        return NextResponse.json({
          success: false,
          message: 'Please specify a coin amount greater than $0 to load into game.',
        }, { status: 400 });
      }
      if (transferAmount > available) {
        return NextResponse.json({
          success: false,
          message: `Cannot load $${transferAmount.toFixed(2)} SC. You only have $${available.toFixed(2)} SC available ($${frozen.toFixed(2)} currently frozen in processing).`,
        }, { status: 400 });
      }
    }

    // If this is an ACCOUNT_CREATION request, check if user ALREADY has credentials generated
    if (requestType !== 'COIN_LOAD') {
      const gameAccountsCol = db.collection('gameAccounts');
      const gameRegex = new RegExp(`^${gameTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

      // 1. Check if user already has active credentials in gameAccounts collection
      const existingAccount = await gameAccountsCol.findOne({
        userEmail: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        gameTitle: gameRegex,
        status: 'READY',
      });

      if (existingAccount) {
        return NextResponse.json({
          success: false,
          alreadyHasAccount: true,
          message: `You already have active credentials for ${existingAccount.gameTitle || gameTitle} (Username: ${existingAccount.username}). You cannot request duplicate credentials.`,
          gameAccount: {
            gameTitle: existingAccount.gameTitle,
            username: existingAccount.username,
            password: existingAccount.password,
          },
        }, { status: 400 });
      }

      // 2. Check if user already has an approved READY request in accountRequests
      const existingReadyRequest = await requestsCol.findOne({
        userEmail: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        gameTitle: gameRegex,
        status: 'READY',
      });

      if (existingReadyRequest) {
        return NextResponse.json({
          success: false,
          alreadyHasAccount: true,
          message: `Your credentials for ${existingReadyRequest.gameTitle || gameTitle} are already generated! (Username: ${existingReadyRequest.gameAccountUsername || 'Ready'}). You can view them under My Game IDs.`,
          gameAccount: {
            gameTitle: existingReadyRequest.gameTitle,
            username: existingReadyRequest.gameAccountUsername,
            password: existingReadyRequest.gameAccountPassword,
          },
        }, { status: 400 });
      }
    }

    // Check if player already has a PENDING request for this game of this exact type
    const existingPendingQuery = {
      userEmail: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      gameTitle: new RegExp(`^${gameTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      status: 'PENDING',
    };
    if (requestType === 'COIN_LOAD') {
      existingPendingQuery.$or = [
        { requestType: 'COIN_LOAD' },
        { transferAmount: { $gt: 0 } },
      ];
    } else {
      existingPendingQuery.$or = [
        { requestType: 'ACCOUNT_CREATION' },
        {
          $and: [
            { requestType: { $ne: 'COIN_LOAD' } },
            { $or: [{ transferAmount: { $lte: 0 } }, { transferAmount: { $exists: false } }] },
          ],
        },
      ];
    }

    const existingPending = await requestsCol.findOne(existingPendingQuery);

    if (existingPending) {
      const typeLabel = requestType === 'COIN_LOAD' ? 'coin load' : 'account creation';
      return NextResponse.json({
        success: false,
        isPending: true,
        message: `You already have a pending ${typeLabel} request for ${gameTitle}. Please wait for staff approval.`,
      }, { status: 400 });
    }

    // 1. DEDUCT coins immediately from player wallet (balanceSC) if this is a COIN_LOAD
    if (requestType === 'COIN_LOAD' && transferAmount > 0) {
      const nextSC = Math.max(0, Number((currentSC - transferAmount).toFixed(2)));
      await usersCol.updateOne(
        { _id: user._id },
        { $set: { balanceSC: nextSC, updatedAt: new Date() } }
      );

      await ledgerCol.insertOne({
        userId: user._id.toString(),
        username: user.username,
        type: 'game_transfer',
        currency: 'SC',
        amount: -transferAmount,
        balanceBefore: currentSC,
        balanceAfter: nextSC,
        performedBy: 'player',
        referenceId: gameTitle,
        notes: `Deducted $${transferAmount.toFixed(2)} SC from wallet for loading into ${gameTitle}`,
        createdAt: new Date(),
      });
    }

    // 2. Resolve Game Account Username if existing for this player and game
    let resolvedGameUsername = String(body.gameAccountUsername || '').trim();
    if (!resolvedGameUsername && gameTitle) {
      const accCheck = await findUserGameAccount(
        db,
        {
          userId: user?._id || session?.userId,
          userEmail,
          username: userName,
        },
        gameTitle
      );
      if (accCheck.exists) {
        resolvedGameUsername = accCheck.username;
      }
    }

    // 3. Create the Request with explicit requestType and attached gameAccountUsername
    const newRequest = {
      userEmail,
      userName,
      gameTitle,
      gameId,
      gameAccountUsername: resolvedGameUsername || '',
      requestType,
      transferAmount,
      deductedUpfront: requestType === 'COIN_LOAD' && transferAmount > 0,
      status: 'PENDING',
      createdAt: new Date(),
    };

    const res = await requestsCol.insertOne(newRequest);

    // Notify staff desk immediately (Never sent to players)
    notifyStaff({
      title: requestType === 'COIN_LOAD' ? '⚡ New Coin Load Request' : '🎮 New Game ID Request',
      message: `@${userName} requested ${requestType === 'COIN_LOAD' ? `$${transferAmount.toFixed(2)} SC loaded into ${gameTitle}` : `credentials for ${gameTitle}`}.`,
      type: 'account_request',
      data: {
        requestId: res.insertedId.toString(),
        url: '/admin?tab=account_requests',
      },
    });

    return NextResponse.json({
      success: true,
      requestId: res.insertedId.toString(),
      message: requestType === 'COIN_LOAD'
        ? `Load request for ${gameTitle} submitted! $${transferAmount.toFixed(2)} SC has been deducted from your wallet.`
        : `Account request for ${gameTitle} submitted! Staff will issue your credentials shortly.`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PUT - Admin approves or cancels account or load request
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session || !['super_admin', 'operation_admin', 'financial_manager', 'coin_manager', 'chat_support'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized staff action.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, username, password } = body;

    if (!id || !action) {
      return NextResponse.json({ success: false, message: 'ID and action are required.' }, { status: 400 });
    }

    const db = await getDb();
    const requestsCol = db.collection('accountRequests');
    const targetRequest = await requestsCol.findOne(safeIdFilter(id));

    if (!targetRequest) {
      return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    }

    const usersCol = db.collection('users');
    const ledgerCol = db.collection('ledger');
    const cleanEmail = targetRequest.userEmail.toLowerCase().trim();
    const cleanTitle = targetRequest.gameTitle;
    const isFreeplay = Boolean(targetRequest.isFreeplay || targetRequest.freeplayPending);
    const originalFrozen = Number(targetRequest.transferAmount || targetRequest.freeplayAmount || 0);

    // Allow staff to adjust load amount if specified
    const finalAmount = body.transferAmount !== undefined ? Math.max(0, Number(body.transferAmount)) : originalFrozen;

    if (action === 'approve') {
      const gameAccountsCol = db.collection('gameAccounts');

      // 1. Handle Freeplay bonus (CREDIT player balanceSC) vs normal wallet coin load (DEDUCT player balanceSC)
      if (isFreeplay) {
        const user = await usersCol.findOne({ email: cleanEmail });
        if (user) {
          const oldSC = Number(user.balanceSC || 0);
          const newSC = Number((oldSC + finalAmount).toFixed(2));

          await usersCol.updateOne(
            { _id: user._id },
            {
              $inc: {
                balanceSC: finalAmount,
              },
              $set: {
                freeplayClaimed: true,
                freeplayClaimedAt: new Date(),
              },
            }
          );

          await db.collection('freeplay_tasks').updateMany(
            {
              $or: [
                ...(targetRequest.freeplayTaskId ? [{ taskId: targetRequest.freeplayTaskId }] : []),
                { email: cleanEmail, status: 'pending' },
              ],
            },
            {
              $set: {
                status: 'approved',
                amount: finalAmount,
                approvedBy: session.username,
                approvedAt: new Date(),
              },
            }
          );

          if (finalAmount > 0) {
            await ledgerCol.insertOne({
              userId: user._id.toString(),
              username: user.username,
              type: 'freeplay_bonus',
              currency: 'SC',
              amount: finalAmount,
              balanceBefore: oldSC,
              balanceAfter: newSC,
              performedBy: session.username,
              staffRole: session.role,
              referenceId: targetRequest._id.toString(),
              notes: `🎁 Freeplay Bonus (+$${finalAmount.toFixed(2)} SC) approved & credited to account for ${cleanTitle} (Account ID: ${username || targetRequest.userName})`,
              createdAt: new Date(),
            });
          }
        }
      } else if (originalFrozen > 0 || finalAmount > 0) {
        const user = await usersCol.findOne({ email: cleanEmail });
        if (user) {
          const oldSC = Number(user.balanceSC || 0);
          if (targetRequest.deductedUpfront) {
            // Balance was already deducted upfront when player submitted Load Coin
            const diff = Number((originalFrozen - finalAmount).toFixed(2));
            const newSC = Math.max(0, Number((oldSC + diff).toFixed(2)));
            if (diff !== 0) {
              await usersCol.updateOne(
                { _id: user._id },
                { $set: { balanceSC: newSC, updatedAt: new Date() } }
              );
            }
            if (finalAmount > 0) {
              await ledgerCol.insertOne({
                userId: user._id.toString(),
                username: user.username,
                type: 'game_transfer',
                currency: 'SC',
                amount: -finalAmount,
                balanceBefore: Number((oldSC + originalFrozen).toFixed(2)),
                balanceAfter: newSC,
                performedBy: session.username,
                staffRole: session.role,
                referenceId: targetRequest._id.toString(),
                notes: `Game account coin load approved into ${cleanTitle} (Account ID: ${username || targetRequest.userName})${finalAmount !== originalFrozen ? ` [Amount adjusted by admin from $${originalFrozen} to $${finalAmount}]` : ''}`,
                createdAt: new Date(),
              });
            }
          } else {
            // Legacy request where coins were frozen instead of deducted upfront
            const newSC = Number(Math.max(0, oldSC - finalAmount).toFixed(2));
            const newFrozen = Math.max(0, Number((Number(user.frozenBalance || 0) - originalFrozen).toFixed(2)));
            await usersCol.updateOne(
              { _id: user._id },
              {
                $set: {
                  balanceSC: newSC,
                  frozenBalance: newFrozen,
                  updatedAt: new Date(),
                },
              }
            );

            if (finalAmount > 0) {
              await ledgerCol.insertOne({
                userId: user._id.toString(),
                username: user.username,
                type: 'game_transfer',
                currency: 'SC',
                amount: -finalAmount,
                balanceBefore: oldSC,
                balanceAfter: newSC,
                performedBy: session.username,
                staffRole: session.role,
                referenceId: targetRequest._id.toString(),
                notes: `Game account coin load into ${cleanTitle} (Account ID: ${username || targetRequest.userName})${finalAmount !== originalFrozen ? ` [Amount adjusted by admin from $${originalFrozen} to $${finalAmount}]` : ''}`,
                createdAt: new Date(),
              });
            }
          }
        }
      }

      // 2. Update request status to READY and save final transferAmount
      await requestsCol.updateOne(
        { _id: targetRequest._id },
        {
          $set: {
            status: 'READY',
            transferAmount: finalAmount,
            originalTransferAmount: originalFrozen,
            gameAccountUsername: username,
            gameAccountPassword: password,
            approvedBy: session.username,
            approvedAt: new Date(),
          },
        }
      );

      // 3. Insert or update gameAccounts collection
      await gameAccountsCol.updateOne(
        { userEmail: cleanEmail, gameTitle: cleanTitle },
        {
          $set: {
            userEmail: cleanEmail,
            gameTitle: cleanTitle,
            username: username || cleanEmail.split('@')[0],
            password: password || 'VegasWin777!',
            status: 'READY',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      // Clean up any older REJECTED or CANCELLED requests for this user and game
      try {
        await requestsCol.deleteMany({
          userEmail: cleanEmail,
          gameTitle: cleanTitle,
          status: { $in: ['REJECTED', 'CANCELLED'] },
        });
      } catch (cleanErr) {
        console.error('Error cleaning up rejected requests on approval:', cleanErr);
      }

      // Instant in-app & push notification
      if (isFreeplay) {
        notifyPlayer({
          userEmail: cleanEmail,
          title: `🎁 $${finalAmount.toFixed(2)} Freeplay Approved: ${cleanTitle}!`,
          message: `Your $${finalAmount.toFixed(2)} SC Freeplay has been approved and credited to your account (${cleanTitle} ID: ${username})!`,
          type: 'freeplay_approved',
          data: { gameTitle: cleanTitle, amount: String(finalAmount) },
        });
      } else if (finalAmount > 0) {
        notifyPlayer({
          userEmail: cleanEmail,
          title: `Game Loaded: ${cleanTitle}! ⚡`,
          message: `$${finalAmount.toFixed(2)} SC loaded into your ${cleanTitle} account! Good luck!`,
          type: 'coin_load_approved',
          data: { gameTitle: cleanTitle, amount: String(finalAmount) },
        });
      } else {
        notifyPlayer({
          userEmail: cleanEmail,
          title: `Game ID Ready: ${cleanTitle}! 🎮`,
          message: `Your ${cleanTitle} credentials have been issued! Username: ${username}`,
          type: 'account_ready',
          data: { gameTitle: cleanTitle },
        });
      }

      return NextResponse.json({
        success: true,
        message: isFreeplay
          ? `🎁 Freeplay ($${finalAmount.toFixed(2)} SC) approved & credited to player's account!`
          : finalAmount > 0
          ? `Coin load for ${cleanTitle} approved! $${finalAmount.toFixed(2)} SC deducted from player balance.`
          : `Credentials for ${cleanTitle} issued successfully!`,
      });
    } else if (action === 'cancel' || action === 'reject') {
      const reason = body.reason || body.rejectionReason || 'Staff desk rejected request or platform currently unavailable.';

      if (isFreeplay) {
        await db.collection('freeplay_tasks').updateMany(
          {
            $or: [
              ...(targetRequest.freeplayTaskId ? [{ taskId: targetRequest.freeplayTaskId }] : []),
              { email: cleanEmail, status: 'pending' },
            ],
          },
          {
            $set: {
              status: 'rejected',
              rejectionReason: reason,
              rejectedBy: session.username,
              rejectedAt: new Date(),
            },
          }
        );
      } else if (originalFrozen > 0) {
        // Refund player's coins back to wallet balance (or unfreeze legacy request)
        const user = await usersCol.findOne({ email: cleanEmail });
        if (user) {
          const oldSC = Number(user.balanceSC || 0);
          if (targetRequest.deductedUpfront) {
            const refundedSC = Number((oldSC + originalFrozen).toFixed(2));
            await usersCol.updateOne(
              { _id: user._id },
              { $set: { balanceSC: refundedSC, updatedAt: new Date() } }
            );

            await ledgerCol.insertOne({
              userId: user._id.toString(),
              username: user.username,
              type: 'game_load_refund',
              currency: 'SC',
              amount: originalFrozen,
              balanceBefore: oldSC,
              balanceAfter: refundedSC,
              performedBy: session.username,
              staffRole: session.role,
              referenceId: targetRequest._id.toString(),
              notes: `Game coin load rejected ($${originalFrozen.toFixed(2)} SC refunded to wallet): ${reason}`,
              createdAt: new Date(),
            });
          } else {
            const newFrozen = Math.max(0, Number((Number(user.frozenBalance || 0) - originalFrozen).toFixed(2)));
            await usersCol.updateOne(
              { _id: user._id },
              { $set: { frozenBalance: newFrozen, updatedAt: new Date() } }
            );

            await ledgerCol.insertOne({
              userId: user._id.toString(),
              username: user.username,
              type: 'game_load_unfreeze',
              currency: 'SC',
              amount: originalFrozen,
              balanceBefore: oldSC,
              balanceAfter: oldSC,
              performedBy: session.username,
              staffRole: session.role,
              referenceId: targetRequest._id.toString(),
              notes: `Game coin load rejected ($${originalFrozen} SC unfrozen & returned): ${reason}`,
              createdAt: new Date(),
            });
          }
        }
      }

      await requestsCol.updateOne(
        { _id: targetRequest._id },
        {
          $set: {
            status: 'REJECTED',
            rejectionReason: reason,
            cancelledBy: session.username,
            cancelledAt: new Date(),
          },
        }
      );

      notifyPlayer({
        userEmail: cleanEmail,
        title: isFreeplay ? `Freeplay Task Update: ${cleanTitle} ⚠️` : `${cleanTitle} Request Update ⚠️`,
        message: isFreeplay
          ? `Your Freeplay task for ${cleanTitle} was declined: ${reason}`
          : `Your request for ${cleanTitle} was rejected: ${reason}`,
        type: 'account_rejected',
        data: { gameTitle: cleanTitle },
      });

      return NextResponse.json({
        success: true,
        message: isFreeplay
          ? 'Freeplay task rejected and reason note sent to player.'
          : 'Request rejected. Coins unfrozen and reason note logged for player.',
      });
    }

    return NextResponse.json({ success: false, message: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE - Dismiss or remove an account request
export async function DELETE(req) {
  try {
    const session = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID required.' }, { status: 400 });
    }

    const db = await getDb();
    const requestsCol = db.collection('accountRequests');
    const target = await requestsCol.findOne(safeIdFilter(id));

    if (!target) {
      return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    }

    // Only allow player if it's their own request, or staff
    const isOwner = session && session.email?.toLowerCase().trim() === target.userEmail?.toLowerCase().trim();
    const isStaff = session && ['super_admin', 'operation_admin', 'financial_manager', 'coin_manager', 'chat_support'].includes(session.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    await requestsCol.deleteOne(safeIdFilter(id));
    return NextResponse.json({ success: true, message: 'Request dismissed successfully.' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
