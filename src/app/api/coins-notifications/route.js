import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, ROLES, safeIdFilter } from '@/lib/auth';

// GET Coins Allotment Tasks Queue
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '25', 10));
    const search = searchParams.get('search') || '';

    const db = await getDb();
    const col = db.collection('coinsNotifications');

    // Build Query
    const query = {};

    if (statusParam !== 'ALL') {
      const allowed = statusParam.split(',').map((s) => s.trim().toUpperCase());
      query.status = { $in: allowed };
    }

    if (search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { userEmail: regex },
        { gameUsername: regex },
        { gameTitle: regex },
        { holdNote: regex },
      ];
    }

    const [allCount, pendingCount, holdCount, completedCount, cancelledCount] = await Promise.all([
      col.countDocuments({}),
      col.countDocuments({ status: { $in: ['PENDING', 'CLAIM_REQUESTED'] } }),
      col.countDocuments({ status: 'HOLD' }),
      col.countDocuments({ status: 'COMPLETED' }),
      col.countDocuments({ status: { $in: ['CANCELLED', 'FAILED'] } }),
    ]);

    const totalNotifications = await col.countDocuments(query);
    const totalPages = Math.ceil(totalNotifications / limit) || 1;

    const tasks = await col
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      coinsNotifications: tasks.map((t) => ({
        id: t._id ? t._id.toString() : t.id,
        userEmail: t.userEmail || '',
        gameUsername: t.gameUsername || '',
        gameTitle: t.gameTitle || 'Lobby',
        depositCash: Number(t.depositCash || t.amount || 0),
        bonus: Number(t.bonus || 0),
        allotmentTarget: Number(t.allotmentTarget || t.amount || 0),
        status: t.status || 'PENDING',
        holdNote: t.holdNote || '',
        read: !!t.read,
        proofImage: t.proofImage || t.screenshot || '',
        createdAt: t.createdAt || new Date(),
        updatedAt: t.updatedAt,
        processedBy: t.processedBy || '',
      })),
      totalNotifications,
      totalPages,
      statusCounts: {
        all: allCount,
        pending: pendingCount,
        hold: holdCount,
        completed: completedCount,
        cancelled: cancelledCount,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT: Update coin allotment task (Mark Done, Put On Hold, Resume)
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session || session.role === ROLES.PLAYER) {
      return NextResponse.json({ success: false, error: 'Staff credentials required.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, holdNote, read } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('coinsNotifications');
    const filter = safeIdFilter(id);

    const updateFields = {
      updatedAt: new Date(),
      processedBy: session.email || 'admin@richroom.games',
    };

    if (status !== undefined) updateFields.status = status.toUpperCase();
    if (holdNote !== undefined) updateFields.holdNote = holdNote.trim();
    if (read !== undefined) updateFields.read = !!read;

    await col.updateOne(filter, { $set: updateFields });

    return NextResponse.json({ success: true, message: `Task updated to ${status || 'updated'}` });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST - Create manual allotment task
export async function POST(req) {
  try {
    const body = await req.json();
    const db = await getDb();
    const col = db.collection('coinsNotifications');

    const newDoc = {
      userEmail: body.userEmail?.toLowerCase()?.trim() || '',
      gameUsername: body.gameUsername || '',
      gameTitle: body.gameTitle || 'Lobby',
      depositCash: Number(body.depositCash || body.amount || 0),
      bonus: Number(body.bonus || 0),
      allotmentTarget: Number(body.allotmentTarget || body.amount || 0),
      status: body.status || 'PENDING',
      holdNote: body.holdNote || '',
      proofImage: body.proofImage || '',
      read: false,
      createdAt: new Date(),
    };

    const res = await col.insertOne(newDoc);
    return NextResponse.json({ success: true, id: res.insertedId.toString() });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
