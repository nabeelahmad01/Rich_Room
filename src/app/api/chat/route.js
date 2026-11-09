import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  getSessionUser,
  getAdminSessionUser,
  getPlayerSessionUser,
  ROLES,
  getUserFilter,
  safeIdFilter,
} from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';
import { publishChatRealtime } from '@/lib/realtimePublish';

export const dynamic = 'force-dynamic';

/**
 * Helper to identify authorized staff roles
 */
function isStaffRole(role) {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.CHAT_SUPPORT ||
    role === ROLES.OPERATION_ADMIN ||
    role === ROLES.ADMIN ||
    role === ROLES.FINANCIAL_MANAGER ||
    role === ROLES.COIN_MANAGER
  );
}

function conversationKey(msg) {
  const raw = msg?.conversationId ?? msg?.customerUserId ?? msg?.userId ?? '';
  const cid = String(raw).trim();
  if (!cid || cid === 'undefined' || cid === 'null') return '';
  return cid;
}

function conversationIdMatchOr(cid) {
  const id = String(cid || '').trim();
  if (!id) return [];
  const or = [
    { conversationId: id },
    { customerUserId: id },
    { userId: id },
  ];
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    try {
      const oid = new ObjectId(id);
      or.push({ conversationId: oid }, { customerUserId: oid }, { userId: oid });
    } catch {}
  }
  return or;
}

/** Reliable inbox — works on every MongoDB tier (no fragile aggregation). */
async function buildStaffInbox(chatCol) {
  try {
    const rawMessages = await chatCol
      .find(
        {},
        {
          projection: {
            conversationId: 1,
            userId: 1,
            username: 1,
            customerUsername: 1,
            customerUserId: 1,
            senderRole: 1,
            read: 1,
            text: 1,
            createdAt: 1,
            imageUrl: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const convMap = new Map();

    for (const msg of rawMessages) {
      const cid = conversationKey(msg);
      if (!cid) continue;

      const customerName =
        msg.customerUsername || (msg.senderRole === 'player' ? msg.username : null);
      const customerUid = msg.customerUserId || msg.userId || cid;
      const isUnreadPlayerMsg = msg.read === false && msg.senderRole === 'player';

      if (!convMap.has(cid)) {
        convMap.set(cid, {
          _id: cid,
          userId: String(customerUid),
          username: customerName || msg.username || 'Player',
          lastMessage:
            msg.text || (msg.imageUrl ? '📷 [Image Attachment]' : 'Active inquiry'),
          lastSenderRole: msg.senderRole || 'player',
          updatedAt: msg.createdAt || new Date(),
          unreadCount: isUnreadPlayerMsg ? 1 : 0,
          unreadStaff: isUnreadPlayerMsg,
        });
      } else {
        const conv = convMap.get(cid);
        if (
          customerName &&
          (conv.username === 'Player' || conv.username === 'Rich Room Support')
        ) {
          conv.username = customerName;
        }
        if (customerUid && conv.userId === cid) {
          conv.userId = String(customerUid);
        }
        if (isUnreadPlayerMsg) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
          conv.unreadStaff = true;
        }
      }
    }

    return Array.from(convMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (err) {
    console.error('buildStaffInbox error:', err);
    return [];
  }
}

// ============================================================================
// GET: Fetch Chat Messages OR Staff Inbox Conversations
// ============================================================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = (searchParams.get('conversationId') || '').trim();
    const customerUserId = (searchParams.get('customerUserId') || '').trim();
    const customerUsername = (searchParams.get('customerUsername') || '').trim();
    const guestId = (searchParams.get('guestId') || '').trim();
    const inbox = searchParams.get('inbox') === 'true';
    const markRead = searchParams.get('markRead') === 'true';

    const staffSession =
      (await getAdminSessionUser()) || (await getSessionUser('admin'));
    const isStaff = Boolean(staffSession && isStaffRole(staffSession.role));

    const db = await getDb();
    const chatCol = db.collection('chat_messages');

    // 1. Staff Inbox Request (Players Paradise pattern)
    if (isStaff && inbox) {
      const activeConvs = await buildStaffInbox(chatCol);
      return NextResponse.json({ success: true, conversations: activeConvs });
    }

    const session = isStaff ? staffSession : await getPlayerSessionUser();

    if (!session && !guestId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please provide a guest session or login.' },
        { status: 401 }
      );
    }

    // 2. Determine target conversation IDs
    let targetConvIds = [];
    if (isStaff && conversationId && conversationId !== 'all') {
      targetConvIds = [conversationId];
    } else if (session && session.userId && session.role === 'player') {
      targetConvIds.push(String(session.userId));
      if (session.username) targetConvIds.push(session.username);
      try {
        const u = await db.collection('users').findOne(getUserFilter(session));
        if (u?._id) targetConvIds.push(u._id.toString());
      } catch {}
    } else if (guestId && guestId !== 'guest_session') {
      targetConvIds = [guestId];
    } else if (conversationId && conversationId !== 'guest_session') {
      targetConvIds = [conversationId];
    } else {
      return NextResponse.json({ success: true, unreadCount: 0, messages: [] });
    }

    // 3. Fetch conversation messages
    let query;
    if (isStaff && conversationId) {
      const or = [...conversationIdMatchOr(conversationId)];
      if (customerUserId && customerUserId !== conversationId) {
        or.push(...conversationIdMatchOr(customerUserId));
      }
      if (customerUsername) {
        or.push(
          { customerUsername },
          { username: customerUsername },
          { customerUsername: new RegExp(`^${customerUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        );
      }
      query = { $or: or };
    } else {
      query = {
        $or: [
          { conversationId: { $in: targetConvIds } },
          { customerUserId: { $in: targetConvIds } },
          { userId: { $in: targetConvIds } },
        ],
      };
    }

    const rawMessages = await chatCol
      .find(query, {
        projection: {
          conversationId: 1,
          customerUserId: 1,
          userId: 1,
          username: 1,
          customerUsername: 1,
          senderRole: 1,
          staffName: 1,
          text: 1,
          imageUrl: 1,
          read: 1,
          createdAt: 1,
        },
      })
      .sort({ createdAt: 1 })
      .limit(200)
      .toArray();

    const staffViewingThread = isStaff && Boolean(conversationId && conversationId !== 'all');
    const shouldMarkPlayerMsgsRead = staffViewingThread;
    const shouldMarkStaffMsgsRead = !isStaff && markRead;

    if (shouldMarkPlayerMsgsRead) {
      const convOr = conversationIdMatchOr(conversationId);
      chatCol
        .updateMany(
          {
            $or: convOr.length ? convOr : [{ conversationId }],
            senderRole: 'player',
            read: false,
          },
          { $set: { read: true } }
        )
        .catch(() => {});
    } else if (shouldMarkStaffMsgsRead) {
      chatCol
        .updateMany(
          {
            $or: [{ conversationId: { $in: targetConvIds } }, { customerUserId: { $in: targetConvIds } }],
            senderRole: 'staff',
            read: false,
          },
          { $set: { read: true } }
        )
        .catch(() => {});
    }

    const unreadStaffCount = isStaff
      ? 0
      : shouldMarkStaffMsgsRead
        ? 0
        : rawMessages.filter((m) => m.senderRole === 'staff' && !m.read).length;

    const lightweightImages = searchParams.get('lightweightImages') !== 'false';

    const formattedMessages = rawMessages.map((m) => {
      const senderRole = m.senderRole || 'player';
      const wasRead = !!m.read;
      const effectiveRead =
        wasRead ||
        (shouldMarkStaffMsgsRead && senderRole === 'staff') ||
        (shouldMarkPlayerMsgsRead && senderRole === 'player');
      const msgId = m._id ? m._id.toString() : m.id || Math.random().toString(36).substring(2, 10);
      const rawImg = m.imageUrl || '';
      let imageUrl = rawImg || null;
      if (rawImg && lightweightImages) {
        const isExternal = rawImg.startsWith('http://') || rawImg.startsWith('https://');
        if (!isExternal || rawImg.length > 2048) {
          imageUrl = `/api/chat/attachment?id=${msgId}`;
        }
      }
      return {
        id: msgId,
        conversationId: m.conversationId || (targetConvIds[0] || ''),
        userId: m.userId,
        username: m.username,
        senderRole,
        staffName: m.staffName || null,
        text: m.text || '',
        imageUrl,
        read: effectiveRead,
        createdAt: m.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      unreadCount: unreadStaffCount,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error('GET /api/chat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Send Chat Message (Append-Only)
// ============================================================================
export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    const {
      text,
      imageUrl,
      conversationId,
      targetUsername,
      targetUserId,
      guestId,
      guestName,
    } = body;

    const isExplicitStaffReply = Boolean(body.isStaffReply);
    const session = isExplicitStaffReply
      ? (await getAdminSessionUser()) || (await getSessionUser('admin'))
      : (await getPlayerSessionUser()) || (await getSessionUser('player'));

    // Authorization check: Never reject a player/guest inquiry with 401
    const cleanGuestParam = (guestId || conversationId || '').trim();
    const effectiveGuestId =
      cleanGuestParam || `guest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const cleanText = typeof text === 'string' ? text.trim().slice(0, 5000) : '';
    let cleanImageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
    if (cleanImageUrl && cleanImageUrl.length > 900_000) {
      return NextResponse.json(
        { success: false, error: 'Image is too large. Please send a smaller screenshot.' },
        { status: 413 }
      );
    }

    if (!cleanText && !cleanImageUrl) {
      return NextResponse.json(
        { success: false, error: 'Message text or image attachment required.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const chatCol = db.collection('chat_messages');

    const isStaff = session && isStaffRole(session.role);
    const shouldReplyAsStaff = Boolean(isExplicitStaffReply && isStaff);
    const hasPlayerSession = Boolean(session && !isStaff && !isExplicitStaffReply);

    let resolvedConvId;
    let customerUserId;
    let customerUsername;
    let senderUserId;
    let senderUsername;
    let senderRole = 'player';
    let staffName = null;

    if (shouldReplyAsStaff) {
      // Scenario A: Staff replying in Admin Concierge Desk
      resolvedConvId = String(conversationId || targetUserId).trim();
      customerUserId = String(targetUserId || resolvedConvId).trim();
      customerUsername = String(targetUsername || 'Player').trim();
      senderRole = 'staff';
      senderUserId = session.userId;
      senderUsername = 'Rich Room Support';
      staffName = session.username;
    } else if (hasPlayerSession) {
      const cleanUid = String(session.userId);
      resolvedConvId = cleanUid;
      customerUserId = cleanUid;
      customerUsername =
        (typeof body.username === 'string' && body.username.trim()) ||
        session.username ||
        'Player';
      senderRole = 'player';
      senderUserId = cleanUid;
      senderUsername = customerUsername;
      staffName = null;
    } else {
      // Scenario C: Unauthenticated Guest Visitor
      const cleanGuestId =
        String(guestId || conversationId || '').trim() ||
        effectiveGuestId;
      resolvedConvId = cleanGuestId;
      customerUserId = cleanGuestId;
      const cleanSuffix = cleanGuestId.replace('guest_', '').slice(-4).toUpperCase();
      customerUsername =
        (guestName && typeof guestName === 'string' && guestName.trim()) ||
        (body.username && typeof body.username === 'string' && body.username.trim()) ||
        `Guest #${cleanSuffix}`;
      senderRole = 'player';
      senderUserId = cleanGuestId;
      senderUsername = customerUsername;
    }

    const newMsg = {
      conversationId: resolvedConvId,
      customerUserId,
      customerUsername,
      userId: senderUserId,
      username: senderUsername,
      senderRole,
      staffName,
      text: cleanText,
      imageUrl: cleanImageUrl,
      read: false,
      isGuest: !session,
      createdAt: new Date(),
    };

    const res = await chatCol.insertOne(newMsg);
    const insertedId = res.insertedId
      ? res.insertedId.toString()
      : Math.random().toString(36).substring(2, 10);

    // ========================================================================
    // Notifications Dispatch (Background, non-blocking)
    // ========================================================================
    if (senderRole === 'staff' && (conversationId || targetUserId)) {
      // Staff replied to player: Send in-app notification & push notification ONLY to this targeted player
      (async () => {
        try {
          const userQueries = [];
          if (resolvedConvId) userQueries.push(...safeIdFilter(resolvedConvId, ['username', 'email']).$or);
          if (customerUserId && customerUserId !== resolvedConvId) {
            userQueries.push(...safeIdFilter(customerUserId, ['username', 'email']).$or);
          }
          if (customerUsername && customerUsername !== 'Player') {
            userQueries.push({ username: customerUsername });
          }

          const targetPlayer = userQueries.length > 0 ? await db.collection('users').findOne({ $or: userQueries }) : null;

          const targetUid = targetPlayer?._id ? targetPlayer._id.toString() : (customerUserId || resolvedConvId);
          const targetEmail = targetPlayer?.email || null;
          const targetUsername = targetPlayer?.username || customerUsername || 'Player';
          const senderStaffTitle = staffName === 'superadmin' ? 'Support Desk' : (staffName || 'VIP Concierge');

          notifyPlayer({
            userId: targetUid,
            userEmail: targetEmail,
            username: targetUsername,
            title: `💬 Support Message: ${senderStaffTitle}`,
            message: (cleanText || 'Sent an attachment').slice(0, 100),
            type: 'chat_message',
            data: { url: '/chat', conversationId: resolvedConvId },
          });
        } catch (nErr) {
          console.warn('[Chat player notify note]:', nErr.message);
        }
      })();
    } else {
      // Player or guest sent message to staff: Notify admin & staff ONLY (Never broadcast to players!)
      (async () => {
        try {
          notifyStaff({
            title: `💬 Support Chat: ${senderUsername}`,
            message: (cleanText || 'Sent an attachment').slice(0, 100),
            type: 'chat_message',
            data: {
              url: `/admin?tab=chat&cid=${resolvedConvId}`,
              conversationId: resolvedConvId,
              senderUsername,
            },
          });
        } catch (sErr) {
          console.warn('[Chat staff notify note]:', sErr.message);
        }
      })();
    }

    publishChatRealtime({
      conversationId: resolvedConvId,
      senderRole,
      message: { id: insertedId, ...newMsg },
      userId: customerUserId,
      guestId: String(resolvedConvId).startsWith('guest_') ? resolvedConvId : undefined,
    });

    return NextResponse.json({
      success: true,
      message: {
        id: insertedId,
        ...newMsg,
      },
    });
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Strict compliance: DELETE is disabled
export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Compliance Violation: Deletion of chat records is disabled.' },
    { status: 405 }
  );
}
