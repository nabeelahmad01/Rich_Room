import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser, ROLES } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { publishPromo } from '@/lib/realtimePublish';

// GET: Returns list of promotions
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const isAdminQuery = searchParams.get('admin') === 'true';

    const db = await getDb();
    const promosCol = db.collection('promotions');

    let filter = {};
    if (!isAdminQuery) {
      filter = { active: { $ne: false } };
    }

    const promotions = await promosCol
      .find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      promotions: promotions.map((p) => ({
        ...p,
        _id: p._id.toString(),
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Admin creates a new promotion
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Super Admin only.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, badge, description, matchPercent, category, active = true, priority = 10 } = body;

    if (!title || !description) {
      return NextResponse.json({ success: false, error: 'Title and description are required.' }, { status: 400 });
    }

    const db = await getDb();
    const promosCol = db.collection('promotions');

    const newPromo = {
      title: String(title).trim(),
      badge: String(badge || '').trim(),
      description: String(description).trim(),
      matchPercent: Number(matchPercent || 0),
      category: String(category || 'bonus').trim(),
      active: Boolean(active),
      priority: Number(priority || 10),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.username,
    };

    const result = await promosCol.insertOne(newPromo);
    publishPromo({ action: 'create' });

    return NextResponse.json({
      success: true,
      message: 'Promotion created successfully.',
      promotion: { ...newPromo, _id: result.insertedId.toString() },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Admin updates an existing promotion
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Super Admin only.' }, { status: 403 });
    }

    const body = await req.json();
    const { _id, id, title, badge, description, matchPercent, category, active, priority } = body;

    const promoId = _id || id;
    if (!promoId) {
      return NextResponse.json({ success: false, error: 'Promotion ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const promosCol = db.collection('promotions');

    let filter = {};
    if (ObjectId.isValid(promoId) && typeof promoId === 'string' && promoId.length === 24) {
      filter = { $or: [{ _id: new ObjectId(promoId) }, { id: promoId }] };
    } else {
      filter = { $or: [{ _id: promoId }, { id: promoId }] };
    }

    const updateFields = {
      updatedAt: new Date(),
      updatedBy: session.username,
    };

    if (title !== undefined) updateFields.title = String(title).trim();
    if (badge !== undefined) updateFields.badge = String(badge).trim();
    if (description !== undefined) updateFields.description = String(description).trim();
    if (matchPercent !== undefined) updateFields.matchPercent = Number(matchPercent);
    if (category !== undefined) updateFields.category = String(category).trim();
    if (active !== undefined) updateFields.active = Boolean(active);
    if (priority !== undefined) updateFields.priority = Number(priority);

    await promosCol.updateOne(filter, { $set: updateFields });
    publishPromo({ action: 'update' });

    return NextResponse.json({ success: true, message: 'Promotion updated successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Admin permanently deletes a promotion
export async function DELETE(req) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Super Admin only.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let promoId = searchParams.get('id') || searchParams.get('_id');

    if (!promoId) {
      try {
        const body = await req.json();
        promoId = body.id || body._id;
      } catch {}
    }

    if (!promoId) {
      return NextResponse.json({ success: false, error: 'Promotion ID is required for deletion.' }, { status: 400 });
    }

    const db = await getDb();
    const promosCol = db.collection('promotions');

    let filter = {};
    if (ObjectId.isValid(promoId) && typeof promoId === 'string' && promoId.length === 24) {
      filter = { $or: [{ _id: new ObjectId(promoId) }, { id: promoId }] };
    } else {
      filter = { $or: [{ _id: promoId }, { id: promoId }] };
    }

    const result = await promosCol.deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Promotion not found or already deleted.' }, { status: 404 });
    }

    publishPromo({ action: 'delete' });

    return NextResponse.json({
      success: true,
      message: 'Promotion deleted successfully from database and live site.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
