import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getAdminSessionUser, getSessionUser, ROLES } from '@/lib/auth';
import { proofDataToImage } from '@/lib/depositProofImage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STAFF_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.OPERATION_ADMIN,
  ROLES.FINANCIAL_MANAGER,
  ROLES.COIN_MANAGER,
  ROLES.CHAT_SUPPORT,
  'financial_admin',
  'coins_admin',
  'support_admin',
]);

function isStaff(session) {
  return Boolean(session?.role && STAFF_ROLES.has(session.role));
}

function buildDepositFilter(id) {
  const is24Hex = typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);
  if (is24Hex && ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { _id: id }, { id }] };
  }
  return { $or: [{ _id: id }, { id }] };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    const admin = await getAdminSessionUser();
    const player = await getSessionUser('player');

    const db = await getDb();
    const deposit = await db.collection('deposits').findOne(buildDepositFilter(id), {
      projection: {
        proofImage: 1,
        proofUrl: 1,
        receiptImage: 1,
        screenshot: 1,
        userId: 1,
        proofPending: 1,
      },
    });

    if (!deposit) {
      return new NextResponse('Deposit not found', { status: 404 });
    }

    const ownerId = String(deposit.userId || '');
    const isOwner = player?.userId && String(player.userId) === ownerId;
    if (!isStaff(admin) && !isOwner) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const rawData =
      deposit.proofImage || deposit.proofUrl || deposit.receiptImage || deposit.screenshot;

    if (!rawData) {
      const pending = deposit.proofPending;
      return new NextResponse(
        pending ? 'Proof upload still pending' : 'Proof not found',
        { status: 404 }
      );
    }

    const decoded = proofDataToImage(rawData);
    if (!decoded) {
      return new NextResponse('Unsupported proof format', { status: 415 });
    }

    if (decoded.kind === 'url') {
      try {
        const upstream = await fetch(decoded.url, { redirect: 'follow' });
        if (!upstream.ok) {
          return NextResponse.redirect(decoded.url);
        }
        const mime = upstream.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await upstream.arrayBuffer());
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'private, max-age=3600',
          },
        });
      } catch {
        return NextResponse.redirect(decoded.url);
      }
    }

    return new NextResponse(decoded.buffer, {
      headers: {
        'Content-Type': decoded.mime || 'image/png',
        'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    return new NextResponse('Server Error: ' + err.message, { status: 500 });
  }
}

/** Attach payment screenshot after fast deposit intent (avoids huge JSON on main POST). */
export async function POST(req) {
  try {
    const session = (await getSessionUser('player')) || (await getSessionUser());
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const depositId = String(body.depositId || '').trim();
    let proofImage = body.proofImage;

    if (!depositId || !proofImage) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID and proof image are required.' },
        { status: 400 }
      );
    }

    if (typeof proofImage === 'string' && proofImage.length > 1_800_000) {
      return NextResponse.json(
        { success: false, error: 'Screenshot too large. Please use a smaller image.' },
        { status: 413 }
      );
    }

    const db = await getDb();
    const depositsCol = db.collection('deposits');

    const deposit = await depositsCol.findOne(buildDepositFilter(depositId), {
      projection: { userId: 1, status: 1, proofImage: 1 },
    });

    if (!deposit) {
      return NextResponse.json({ success: false, error: 'Deposit not found.' }, { status: 404 });
    }

    const ownerId = String(deposit.userId || '');
    if (ownerId !== String(session.userId) || deposit.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Not allowed.' }, { status: 403 });
    }

    if (typeof proofImage === 'string' && !proofImage.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid image format. Upload a PNG or JPEG screenshot.' },
        { status: 400 }
      );
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