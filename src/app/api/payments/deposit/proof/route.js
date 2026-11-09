import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const db = await getDb();
    const depositsCol = db.collection('deposits');

    const is24Hex = typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);
    const filter = is24Hex && ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }, { id: id }] }
      : { $or: [{ _id: id }, { id: id }] };

    const deposit = await depositsCol.findOne(filter, {
      projection: { proofImage: 1, proofUrl: 1, receiptImage: 1, screenshot: 1 },
    });

    const rawData = deposit?.proofImage || deposit?.proofUrl || deposit?.receiptImage || deposit?.screenshot;

    if (!deposit || !rawData) {
      return new NextResponse('Proof not found', { status: 404 });
    }

    // If it's a data URL (e.g. data:image/png;base64,....)
    if (typeof rawData === 'string' && rawData.startsWith('data:')) {
      const parts = rawData.split(',');
      const mime = parts[0].split(':')[1].split(';')[0];
      const buffer = Buffer.from(parts[1], 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    // If it's a direct URL
    return NextResponse.redirect(rawData);
  } catch (err) {
    return new NextResponse('Server Error: ' + err.message, { status: 500 });
  }
}

/** Attach payment screenshot after fast deposit intent (avoids huge JSON on main POST). */
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const depositId = String(body.depositId || '').trim();
    const proofImage = body.proofImage;

    if (!depositId || !proofImage) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID and proof image are required.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const depositsCol = db.collection('deposits');

    const is24Hex =
      depositId.length === 24 && /^[0-9a-fA-F]{24}$/.test(depositId) && ObjectId.isValid(depositId);
    const filter = is24Hex
      ? { $or: [{ _id: new ObjectId(depositId) }, { _id: depositId }] }
      : { _id: depositId };

    const deposit = await depositsCol.findOne(filter, {
      projection: { userId: 1, status: 1, proofImage: 1 },
    });

    if (!deposit) {
      return NextResponse.json({ success: false, error: 'Deposit not found.' }, { status: 404 });
    }

    const ownerId = String(deposit.userId || '');
    if (ownerId !== String(session.userId) || deposit.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Not allowed.' }, { status: 403 });
    }

    await depositsCol.updateOne(
      { _id: deposit._id },
      {
        $set: {
          proofImage,
          proofPending: false,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
