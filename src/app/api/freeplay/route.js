import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { notifyStaff } from '@/lib/notify';
import { findUserGameAccount } from '@/lib/gameAccounts';

// GET - Check Freeplay eligibility, configured amount, and task status
export async function GET(req) {
  try {
    const db = await getDb();
    const settingsDoc = await db.collection('system_settings').findOne({ key: 'general' });
    const configuredAmount = settingsDoc?.freeplayAmountSC !== undefined 
      ? Number(settingsDoc.freeplayAmountSC) 
      : 5.0;
    const freeplayActive = settingsDoc?.freeplayActive !== false;

    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({
        success: true,
        claimed: false,
        amount: configuredAmount,
        freeplayActive,
        pending: false,
      });
    }

    const userId = session.userId || session.id;
    let user = null;
    if (userId && ObjectId.isValid(userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    }
    if (!user && session.email) {
      user = await db.collection('users').findOne({ email: session.email.toLowerCase().trim() });
    }

    const claimed = Boolean(user?.freeplayClaimed);

    // Check if there is an active pending freeplay task in Coins Allotment queue
    const pendingTask = await db.collection('accountRequests').findOne({
      userEmail: user?.email ? user.email.toLowerCase().trim() : '',
      status: 'PENDING',
      $or: [{ isFreeplay: true }, { freeplayPending: true }],
    });

    return NextResponse.json({
      success: true,
      claimed,
      amount: configuredAmount,
      freeplayActive,
      pending: Boolean(pendingTask),
      pendingTask: pendingTask ? {
        taskId: pendingTask.freeplayTaskId || pendingTask.taskId || '',
        gameTitle: pendingTask.gameTitle,
        createdAt: pendingTask.createdAt,
      } : null,
      claimedAt: user?.freeplayClaimedAt || null,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST - Submit Freeplay Verification Task
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Please sign in to complete your Freeplay verification task.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { gameTitle, taskId, screenshot } = body;

    const db = await getDb();
    const settingsDoc = await db.collection('system_settings').findOne({ key: 'general' });
    if (settingsDoc?.freeplayActive === false) {
      return NextResponse.json(
        { success: false, message: 'Freeplay bonus is currently disabled or inactive.' },
        { status: 400 }
      );
    }
    const configuredAmount = settingsDoc?.freeplayAmountSC !== undefined 
      ? Number(settingsDoc.freeplayAmountSC) 
      : 5.0;

    const usersCol = db.collection('users');
    const userId = session.userId || session.id;
    let user = null;
    if (userId && ObjectId.isValid(userId)) {
      user = await usersCol.findOne({ _id: new ObjectId(userId) });
    }
    if (!user && session.email) {
      user = await usersCol.findOne({ email: session.email.toLowerCase().trim() });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found. Please log in again.' },
        { status: 404 }
      );
    }

    if (user.freeplayClaimed) {
      return NextResponse.json({
        success: false,
        alreadyClaimed: true,
        message: 'You have already claimed your Freeplay bonus! Make a deposit to receive extra reload bonuses.',
      });
    }

    // Require game selection and screenshot proof
    if (!gameTitle || !String(gameTitle).trim()) {
      return NextResponse.json(
        { success: false, message: 'Please select a casino game for your freeplay credits.' },
        { status: 400 }
      );
    }

    if (!screenshot || !String(screenshot).trim()) {
      return NextResponse.json(
        { success: false, message: 'Please upload your Inbox screenshot proof before submitting.' },
        { status: 400 }
      );
    }

    const cleanEmail = (user.email || '').toLowerCase().trim();
    const cleanGame = String(gameTitle).trim();
    const requestsCol = db.collection('accountRequests');

    // Check for existing pending freeplay request in accountRequests (Coins Allotment queue)
    const existingPendingReq = await requestsCol.findOne({
      userEmail: cleanEmail,
      status: 'PENDING',
      $or: [{ isFreeplay: true }, { freeplayPending: true }],
    });

    if (existingPendingReq) {
      return NextResponse.json({
        success: false,
        message: 'You already have a Freeplay verification task pending in Coins Allotment. Please wait for our staff to approve it.',
      });
    }

    const resolvedTaskId = taskId || `FP-${Math.floor(100000 + Math.random() * 900000)}`;

    // Resolve existing game account username if player already has credentials for this game
    let resolvedGameUsername = '';
    try {
      const accCheck = await findUserGameAccount(
        db,
        {
          userId: user._id.toString(),
          userEmail: cleanEmail,
          username: user.username,
        },
        cleanGame
      );
      if (accCheck?.exists && accCheck.username) {
        resolvedGameUsername = accCheck.username;
      }
    } catch {}

    // Clear any stale pending entries in freeplay_tasks and record fresh submission
    await db.collection('freeplay_tasks').updateMany(
      {
        $or: [{ userId: user._id.toString() }, { email: cleanEmail }],
        status: 'pending',
      },
      { $set: { status: 'superseded', updatedAt: new Date() } }
    );

    await db.collection('freeplay_tasks').insertOne({
      taskId: resolvedTaskId,
      userId: user._id.toString(),
      username: user.username,
      email: cleanEmail,
      gameTitle: cleanGame,
      screenshot,
      amount: configuredAmount,
      status: 'pending',
      createdAt: new Date(),
    });

    // Create a COIN_LOAD request with Freeplay metadata in accountRequests so Admin Coins Allotment Desk receives it
    const insertRes = await requestsCol.insertOne({
      userId: user._id.toString(),
      userName: user.username || cleanEmail.split('@')[0],
      userEmail: cleanEmail,
      gameTitle: cleanGame,
      gameAccountUsername: resolvedGameUsername || '',
      requestType: 'COIN_LOAD',
      transferAmount: configuredAmount,
      status: 'PENDING',
      isFreeplay: true,
      freeplayPending: true,
      freeplayAmount: configuredAmount,
      freeplayScreenshot: screenshot,
      freeplayTaskId: resolvedTaskId,
      createdAt: new Date(),
    });

    // Notify staff Coins Allotment desk
    notifyStaff({
      type: 'freeplay_task_submitted',
      title: '🎁 Freeplay Coin Allotment Request',
      message: `Player @${user.username} submitted Freeplay proof ($${configuredAmount.toFixed(2)} SC) for ${cleanGame}.`,
      data: {
        requestId: insertRes.insertedId.toString(),
        userId: user._id.toString(),
        username: user.username,
        gameTitle: cleanGame,
        amount: String(configuredAmount),
        taskId: resolvedTaskId,
        url: '/admin?tab=coins_allotment',
      },
    });

    return NextResponse.json({
      success: true,
      message: `🎉 Freeplay task submitted! Our 24/7 staff will verify your Inbox screenshot and load your $${configuredAmount.toFixed(2)} Freeplay into ${cleanGame} shortly.`,
      taskId: resolvedTaskId,
      amount: configuredAmount,
      requestId: insertRes.insertedId.toString(),
    });
  } catch (err) {
    console.error('Freeplay Task submission error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
