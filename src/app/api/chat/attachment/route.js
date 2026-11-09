import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STAFF = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.OPERATION_ADMIN,
  ROLES.FINANCIAL_MANAGER,
  ROLES.COIN_MANAGER,
  ROLES.CHAT_SUPPORT,
]);

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const db = await getDb();
    const msg = await db
      .collection('chat_messages')
      .findOne({ _id: new ObjectId(id) }, { projection: { imageUrl: 1, userId: 1, conversationId: 1 } });

    if (!msg?.imageUrl) {
      return NextResponse.json({ success: false, error: 'No attachment' }, { status: 404 });
    }

    const isStaff = session.role && STAFF.has(session.role);
    if (!isStaff) {
      const uid = String(session.userId || session.id || '');
      const conv = String(msg.conversationId || msg.userId || '');
      if (uid && conv && uid !== conv && String(msg.userId || '') !== uid) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    const raw = msg.imageUrl;
    if (raw.startsWith('data:image')) {
      const match = raw.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        const buf = Buffer.from(match[2], 'base64');
        return new NextResponse(buf, {
          headers: {
            'Content-Type': match[1],
            'Cache-Control': 'private, max-age=86400',
          },
        });
      }
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw);
    }

    return NextResponse.json({ success: false, error: 'Unsupported attachment' }, { status: 415 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
