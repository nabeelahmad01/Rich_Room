import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { publishWallet } from '@/lib/realtimePublish';
import { getSessionUser, getUserFilter } from '@/lib/auth';
import { WHEEL_SLICES } from '@/lib/wheelConstants';

// GET: Check user spin eligibility and remaining available spins
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session || !session.userId) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        canSpin: false,
        availableSpins: 0,
        slices: WHEEL_SLICES,
        message: 'Please log in to spin.',
      });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne(getUserFilter(session));
    if (!user) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        canSpin: false,
        availableSpins: 0,
        slices: WHEEL_SLICES,
        message: 'User not found',
      });
    }

    const availableSpins = Math.max(0, Number(user.availableSpins || 0));
    const canSpin = availableSpins > 0;

    return NextResponse.json({
      success: true,
      authenticated: true,
      canSpin,
      availableSpins,
      slices: WHEEL_SLICES,
      lastDailySpin: user.lastDailySpin || null,
      balance: Number(user.balanceSC ?? user.balance ?? 0),
      message: canSpin
        ? `You have ${availableSpins} free ${availableSpins === 1 ? 'spin' : 'spins'} available!`
        : 'Free spins are exclusively for depositors. Make a deposit to unlock 2 free spins per approved deposit!',
    });
  } catch (err) {
    console.error('Daily spin GET error:', err);
    return NextResponse.json({
      success: true,
      canSpin: false,
      availableSpins: 0,
      slices: WHEEL_SLICES,
      error: err.message,
    });
  }
}

// POST: Execute a depositor free spin
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, message: 'Please log in to spin.' }, { status: 401 });
    }

    const db = await getDb();
    const usersCol = db.collection('users');
    const ledgerCol = db.collection('ledger');

    const user = await usersCol.findOne(getUserFilter(session));
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const availableSpins = Math.max(0, Number(user.availableSpins || 0));

    if (availableSpins <= 0) {
      return NextResponse.json(
        {
          success: false,
          canSpin: false,
          availableSpins: 0,
          message: 'No free spins available! Free spins are unlocked after making a deposit (2 spins per approved deposit).',
        },
        { status: 400 }
      );
    }

    // STRICT USER PROBABILITY SPECIFICATION:
    // 10% chance: 3 SC (Slice 3)
    // 20% chance: 2 SC (Slice 2 or 6)
    // 40% chance: 1 SC (Slice 0, 4, or 7)
    // 30% chance: Bad Luck / Try Again (Slice 1 or 5)
    const rand = Math.random() * 100;
    let prizeAmount = 0;
    let sliceIndex = 1;
    let isBadLuck = false;

    if (rand < 10) {
      // 10% chance: $3 SC
      prizeAmount = 3;
      sliceIndex = 3;
    } else if (rand < 30) {
      // 20% chance: $2 SC
      prizeAmount = 2;
      const twoSlices = [2, 6];
      sliceIndex = twoSlices[Math.floor(Math.random() * twoSlices.length)];
    } else if (rand < 70) {
      // 40% chance: $1 SC
      prizeAmount = 1;
      const oneSlices = [0, 4, 7];
      sliceIndex = oneSlices[Math.floor(Math.random() * oneSlices.length)];
    } else {
      // 30% chance: Bad Luck / Try Again (0 SC)
      prizeAmount = 0;
      isBadLuck = true;
      const zeroSlices = [1, 5];
      sliceIndex = zeroSlices[Math.floor(Math.random() * zeroSlices.length)];
    }

    const remainingSpins = Math.max(0, availableSpins - 1);
    const oldBalance = Number(user.balanceSC ?? user.balance ?? 0);
    const newBalance = Number((oldBalance + prizeAmount).toFixed(2));
    const now = new Date();

    // Deduct 1 spin and update balance if prize won
    const updateOps = {
      $inc: { availableSpins: -1 },
      $set: { lastDailySpin: now },
    };

    if (prizeAmount > 0) {
      updateOps.$inc.balanceSC = prizeAmount;
      updateOps.$inc.balance = prizeAmount;
    }

    await usersCol.updateOne({ _id: user._id }, updateOps);

    // Record ledger entry if prize is won
    if (prizeAmount > 0) {
      const userIdStr = user._id ? String(user._id) : (session.userId || 'unknown');
      await ledgerCol.insertOne({
        userId: userIdStr,
        username: user.username,
        type: 'depositor_spin_bonus',
        currency: 'SC',
        amount: prizeAmount,
        balanceBefore: oldBalance,
        balanceAfter: newBalance,
        referenceId: `SPIN-${now.getTime()}`,
        notes: `Depositor Free Spin Reward: Won $${prizeAmount.toFixed(2)} SC on wheel spin`,
        createdAt: now,
      });
    }

    publishWallet({
      action: 'daily_spin',
      userEmail: user.email,
      userId: user._id.toString(),
      winAmount: prizeAmount,
      newBalance,
    });

    return NextResponse.json({
      success: true,
      winAmount: prizeAmount,
      sliceIndex,
      slice: WHEEL_SLICES[sliceIndex],
      isBadLuck,
      availableSpins: remainingSpins,
      canSpin: remainingSpins > 0,
      newBalance,
      message: isBadLuck
        ? 'Bad Luck! Better luck on your next spin.'
        : `Congratulations! You won $${prizeAmount.toFixed(2)} SC!`,
    });
  } catch (err) {
    console.error('Daily spin POST error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
