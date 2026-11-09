import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, ROLES } from '@/lib/auth';

const STAFF = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.OPERATION_ADMIN,
  ROLES.FINANCIAL_MANAGER,
  ROLES.COIN_MANAGER,
  ROLES.CHAT_SUPPORT,
]);

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session?.role || !STAFF.has(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const db = await getDb();
    const row = await db
      .collection('accountRequests')
      .findOne(
        { _id: new ObjectId(id) },
        { projection: { freeplayScreenshot: 1, screenshot: 1 } }
      );

    const raw = row?.freeplayScreenshot || row?.screenshot || '';
    if (!raw) {
      return NextResponse.json({ success: false, error: 'No proof on file' }, { status: 404 });
    }

    if (raw.startsWith('data:image')) {
      const [, meta, data] = raw.match(/^data:(image\/[^;]+);base64,(.+)$/) || [];
      if (meta && data) {
        const buf = Buffer.from(data, 'base64');
        return new NextResponse(buf, {
          headers: {
            'Content-Type': meta,
            'Cache-Control': 'private, max-age=3600',
          },
        });
      }
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw);
    }

    return NextResponse.json({ success: false, error: 'Unsupported proof format' }, { status: 415 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
