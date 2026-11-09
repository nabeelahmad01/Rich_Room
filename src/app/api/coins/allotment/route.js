import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser, ROLES, safeIdFilter } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { notifyPlayer } from '@/lib/notify';
import { publishWallet } from '@/lib/realtimePublish';

// Search player for allotment or fetch recent allotment history
export async function GET(req) {
  try {
    const session = await getSessionUser();
    const authorizedRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.OPERATION_ADMIN,
      ROLES.FINANCIAL_MANAGER,
      ROLES.COIN_MANAGER,
    ];
    if (!session || !authorizedRoles.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Staff allotment access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const history = searchParams.get('history');

    const db = await getDb();

    if (history === 'true') {
      const ledgerCol = db.collection('ledger');
      const records = await ledgerCol
        .find({ type: { $in: ['admin_allotment', 'admin_deduction'] } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      return NextResponse.json({
        success: true,
        history: records.map(r => ({
          id: r._id.toString(),
          userId: r.userId,
          username: r.username,
          type: r.type,
          currency: r.currency || 'SC',
          amount: r.amount,
          balanceBefore: r.balanceBefore,
          balanceAfter: r.balanceAfter,
          performedBy: r.performedBy,
          staffRole: r.staffRole,
          notes: r.notes,
          createdAt: r.createdAt,
        })),
      });
    }

    const usersCol = db.collection('users');

    const filter = { role: ROLES.PLAYER };
    if (query && query.trim()) {
      filter.$or = [
        { username: { $regex: new RegExp(query.trim(), 'i') } },
        { email: { $regex: new RegExp(query.trim(), 'i') } },
      ];
    }

    const players = await usersCol
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(15)
      .toArray();

    return NextResponse.json({
      success: true,
      players: players.map(p => ({
        id: p._id.toString(),
        username: p.username,
        email: p.email,
        balanceSC: p.balanceSC || 0,
        balanceGC: p.balanceGC || 0,
        kycStatus: p.kycStatus || 'none',
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Credit or Debit coins
export async function POST(req) {
  try {
    const session = await getSessionUser();
    const authorizedRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.OPERATION_ADMIN,
      ROLES.FINANCIAL_MANAGER,
      ROLES.COIN_MANAGER,
    ];
    if (!session || !authorizedRoles.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Staff allotment access required.' }, { status: 403 });
    }

    const { playerId, action, currency = 'SC', amount, reason } = await req.json();

    if (!playerId || !action || !amount || !reason) {
      return NextResponse.json(
        { success: false, error: 'Player ID, action (credit/debit), amount and reason are required.' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than zero.' }, { status: 400 });
    }

    const db = await getDb();
    const usersCol = db.collection('users');
    const ledgerCol = db.collection('ledger');

    const player = await usersCol.findOne(safeIdFilter(playerId, ['username', 'email']));
    if (!player) {
      return NextResponse.json({ success: false, error: 'Player not found.' }, { status: 404 });
    }

    const balanceField = currency === 'SC' ? 'balanceSC' : 'balanceGC';
    const currentBalance = player[balanceField] || 0;

    let delta = 0;
    let type = '';

    if (action === 'credit') {
      delta = numAmount;
      type = 'admin_allotment';
    } else if (action === 'debit') {
      if (currentBalance < numAmount) {
        return NextResponse.json(
          { success: false, error: `Insufficient player balance. Current: ${currentBalance}` },
          { status: 400 }
        );
      }
      delta = -numAmount;
      type = 'admin_deduction';
    } else {
      return NextResponse.json({ success: false, error: 'Action must be credit or debit.' }, { status: 400 });
    }

    const newBalance = Number((currentBalance + delta).toFixed(2));

    // Update Player Balance
    await usersCol.updateOne(
      { _id: player._id },
      { $inc: { [balanceField]: delta } }
    );

    // Write to Immutable Ledger
    await ledgerCol.insertOne({
      userId: player._id.toString(),
      username: player.username,
      type,
      currency,
      amount: delta,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      performedBy: session.username,
      staffRole: session.role,
      notes: `Reason: ${reason.trim()} (Processed by ${session.username} - ${session.role})`,
      createdAt: new Date(),
    });

    // Notify targeted player ONLY (Never leaks to other players)
    notifyPlayer({
      userId: player._id.toString(),
      userEmail: player.email,
      username: player.username,
      title: action === 'credit' ? `Coins Credited: +${numAmount} ${currency}! 💰` : `Coins Adjusted: -${numAmount} ${currency}`,
      message: action === 'credit'
        ? `Your balance has been credited with +${numAmount} ${currency}. Reason: ${reason.trim()}`
        : `Your balance has been adjusted by -${numAmount} ${currency}. Reason: ${reason.trim()}`,
      type: action === 'credit' ? 'coins_allotment' : 'coins_deduction',
      data: { currency, amount: String(numAmount), newBalance: String(newBalance), url: '/wallet' },
    });

    publishWallet({
      action,
      currency,
      amount: numAmount,
      newBalance,
      userEmail: player.email,
      userId: player._id.toString(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}ed ${numAmount} ${currency} to ${player.username}.`,
      newBalance,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
