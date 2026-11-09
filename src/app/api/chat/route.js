import { NextResponse } from 'next/server';
import { getSessionUser, ROLES, safeIdFilter, getUserFilter } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { notifyPlayer, notifyStaff } from '@/lib/notify';

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

/**
 * Group messages into conversation summaries for Staff Inbox.
 * Uses robust in-memory grouping over find() to ensure 100% compatibility
 * across MongoDB Atlas, local MongoDB, and fallback storage engines.
 */
async function buildStaffInbox(chatCol) {
  try {
    const rawMessages = await chatCol
      .find({})
      .sort({ createdAt: -1 })
      .limit(2000)
      .toArray();

    const convMap = new Map();

    for (const msg of rawMessages) {
      const cid = String(msg.conversationId || msg.userId || '').trim();
      if (!cid) continue;

      const customerName =
        msg.customerUsername || (msg.senderRole === 'player' ? msg.username : null);
      const customerUid =
        msg.customerUserId || (msg.senderRole === 'player' ? msg.userId : null);

      const isUnreadPlayerMsg = msg.read === false && msg.senderRole === 'player';

      if (!convMap.has(cid)) {
        convMap.set(cid, {
          _id: cid,
          userId: customerUid || msg.userId || cid,
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
        // Enrich customer name if previously unknown
        if (
          customerName &&
          (conv.username === 'Player' || conv.username === 'Rich Room Support' || conv.username === 'Rich Room Support')
        ) {
          conv.username = customerName;
        }
        if (customerUid && conv.userId === cid) {
          conv.userId = customerUid;
        }
        if (isUnreadPlayerMsg) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
          conv.unreadStaff = true;
        }
      }
    }

    return Array.from(convMap.values()).sort((a, b) => {
      const aUnread = (a.unreadCount || 0) > 0 || Boolean(a.unreadStaff);
      const bUnread = (b.unreadCount || 0) > 0 || Boolean(b.unreadStaff);
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
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
    const guestId = (searchParams.get('guestId') || '').trim();
    const inbox = searchParams.get('inbox') === 'true';
    const adminMode = inbox || searchParams.get('admin') === 'true';
    const markRead = searchParams.get('markRead') === 'true';

    const session = adminMode
      ? (await getSessionUser('admin')) || (await getSessionUser())
      : await getSessionUser('player');

    // Must have a session OR a guestId
    if (!session && !guestId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please provide a guest session or login.' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const chatCol = db.collection('chat_messages');
    const isStaff = Boolean(adminMode && session && isStaffRole(session.role));

    // 1. Staff Inbox Request
    if (inbox) {
      if (!session || !isStaffRole(session.role)) {
        return NextResponse.json({ success: false, error: 'Unauthorized staff inbox request.' }, { status: 403 });
      }
      const activeConvs = await buildStaffInbox(chatCol);
      return NextResponse.json({ success: true, conversations: activeConvs });
    }

    // 2. Determine target conversation IDs
    let targetConvIds = [];
    if (isStaff && conversationId && conversationId !== 'all') {
      targetConvIds = [conversationId];
    } else if (!isStaff && session && session.userId && (session.role === 'player' || !guestId)) {
      // Authenticated player: strictly isolated to their own user credentials
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
      query = {
        $or: [
          { conversationId },
          { customerUserId: conversationId },
          { userId: conversationId },
        ],
      };
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
      .find(query)
      .sort({ createdAt: 1 })
      .limit(200)
      .toArray();

    // 4. Mark unread messages as read ONLY when actively opened/viewed
    if (isStaff) {
      if (markRead) {
        // Staff actively viewing this conversation in Admin Chat tab
        await chatCol
          .updateMany(
            {
              $or: [
                { conversationId: { $in: targetConvIds } },
                { customerUserId: { $in: targetConvIds } },
                { userId: { $in: targetConvIds } },
              ],
              senderRole: 'player',
              read: false,
            },
            { $set: { read: true } }
          )
          .catch(() => {});
      }
    } else if (searchParams.get('markRead') !== 'false') {
      // Player reading staff messages
      await chatCol
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

    // 5. Unread count from staff for the player
    const unreadStaffCount = isStaff
      ? 0
      : rawMessages.filter((m) => m.senderRole === 'staff' && !m.read).length;

    // 6. Format response
    const formattedMessages = rawMessages.map((m) => ({
      id: m._id ? m._id.toString() : m.id || Math.random().toString(36).substring(2, 10),
      conversationId: m.conversationId || (targetConvIds[0] || ''),
      userId: m.userId,
      username: m.username,
      senderRole: m.senderRole || 'player',
      staffName: m.staffName || null,
      text: m.text || '',
      imageUrl: m.imageUrl || null,
      read: !!m.read,
      createdAt: m.createdAt,
    }));

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
      ? (await getSessionUser('admin')) || (await getSessionUser())
      : await getSessionUser('player');

    // Authorization check: Never reject a player/guest inquiry with 401
    const cleanGuestParam = (guestId || conversationId || '').trim();
    const effectiveGuestId =
      cleanGuestParam || `guest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const cleanText = typeof text === 'string' ? text.trim().slice(0, 5000) : '';
    const cleanImageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;

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
    const hasPlayerSession = Boolean(session && (session.role === 'player' || (!guestId && !isExplicitStaffReply)));

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
      // Scenario B: Logged-in user inquiry from front-end widget or /chat page
      const sessionDbUser = await db.collection('users').findOne(getUserFilter(session));
      const cleanUid = sessionDbUser?._id ? sessionDbUser._id.toString() : String(session.userId);
      resolvedConvId = cleanUid;
      customerUserId = cleanUid;
      customerUsername = sessionDbUser?.username || session.username || 'Player';
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
