import { NextResponse } from 'next/server';
import { getSessionUser, ROLES, getUserFilter } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { sendPushNotification, getFirebaseMessaging } from '@/lib/fcm';

// GET: Fetch in-app notifications for player OR broadcast history for admin
export async function GET(req) {
  try {
    const session = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const isAdmin = searchParams.get('admin') === 'true';

    const db = await getDb();
    const notifsCol = db.collection('notifications');

    // Admin view: list recent broadcasts
    if (isAdmin) {
      if (!session || session.role === 'player') {
        return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
      }

      const items = await notifsCol
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      return NextResponse.json({
        success: true,
        broadcasts: items.map(n => ({
          id: n._id.toString(),
          title: n.title,
          message: n.message,
          channel: n.channel || 'all',
          segment: n.segment || 'all',
          target: n.target || 'all',
          url: n.url || '/',
          sentBy: n.sentBy || 'Admin',
          createdAt: n.createdAt,
        })),
      });
    }

    // Player view: notifications broadcast to all, or targeted to user by id, username, or email
    const emailParam = searchParams.get('email');
    const guestIdParam = searchParams.get('guestId');
    const targetConditions = [{ target: 'all' }];
    const userKeys = [];

    if (session?.userId) {
      const uidStr = session.userId.toString().trim();
      targetConditions.push({ userId: uidStr });
      userKeys.push(uidStr);
    }
    if (session?.username) {
      const uLower = session.username.toLowerCase().trim();
      targetConditions.push({ username: uLower });
      targetConditions.push({ username: session.username.trim() });
      userKeys.push(uLower);
    }
    if (session?.email) {
      const cleanEmail = session.email.toLowerCase().trim();
      targetConditions.push({ email: cleanEmail });
      targetConditions.push({ userEmail: cleanEmail });
      userKeys.push(cleanEmail);
    }
    if (guestIdParam && guestIdParam.trim()) {
      const cleanGid = guestIdParam.trim();
      targetConditions.push({ userId: cleanGid });
      userKeys.push(cleanGid);
    }
    if (emailParam && emailParam.trim()) {
      const cleanEmail = emailParam.toLowerCase().trim();
      targetConditions.push({ email: cleanEmail });
      targetConditions.push({ userEmail: cleanEmail });
      userKeys.push(cleanEmail);
      try {
        const uDoc = await db.collection('users').findOne({ email: cleanEmail });
        if (uDoc) {
          const uDocId = uDoc._id.toString();
          targetConditions.push({ userId: uDocId });
          targetConditions.push({ username: uDoc.username });
          userKeys.push(uDocId);
        }
      } catch {}
    }

    // Exclude any staff-targeted notifications from player in-app notification bells
    const query = {
      target: { $ne: 'staff' },
      $or: targetConditions,
    };

    const items = await notifsCol
      .find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    return NextResponse.json({
      success: true,
      notifications: items.map(n => {
        let isRead = Boolean(n.read);
        if (!isRead && Array.isArray(n.readBy) && userKeys.length > 0) {
          isRead = userKeys.some(k => n.readBy.includes(k));
        }
        return {
          id: n._id.toString(),
          title: n.title,
          message: n.message,
          type: n.type || 'promo',
          url: n.url || (n.type === 'chat_message' ? '/chat' : '/'),
          read: isRead,
          createdAt: n.createdAt,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Broadcast Push Notification (Admin)
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session || session.role === 'player') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, target = 'all', channel = 'all', segment = 'all', url = '/' } = body;

    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'Title and message are required.' }, { status: 400 });
    }

    const db = await getDb();
    const notifsCol = db.collection('notifications');

    // Save in-app notification & broadcast record
    const newRecord = {
      title: title.trim(),
      message: message.trim(),
      target,
      channel,
      segment,
      url,
      type: 'broadcast',
      sentBy: session.username || 'Admin',
      createdAt: new Date(),
    };

    const res = await notifsCol.insertOne(newRecord);

    // Send push notification via FCM / WebPush (fail-safe non-blocking)
    sendPushNotification({
      broadcast: true,
      topic: 'paradise_all_players',
      title: title.trim(),
      body: message.trim(),
      data: { url },
    }).catch((fcmErr) => {
      console.warn('FCM delivery note:', fcmErr.message);
    });

    // Send email dispatch to players in background if channel is 'all' or 'email'
    if (channel === 'all' || channel === 'email') {
      (async () => {
        try {
          const { sendEmail } = await import('@/lib/email');
          const usersCol = db.collection('users');
          let userFilter = { role: 'player' };
          if (target !== 'all' && target.includes('@')) {
            userFilter = { email: target.toLowerCase().trim() };
          }
          const targetUsers = await usersCol
            .find(userFilter, { projection: { email: 1, username: 1 } })
            .limit(100)
            .toArray();

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://richroom.games';
          for (const u of targetUsers) {
            if (u.email) {
              const html = `
                <div style="background-color: #070514; color: #FFFFFF; padding: 40px 24px; font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 540px; margin: auto; border-radius: 16px; border: 1px solid rgba(255, 215, 0, 0.35); text-align: center;">
                  <img src="${appUrl}/logo.png" alt="Rich Room" style="height: 52px; margin-bottom: 8px;" />
                  <h1 style="color: #FFD700; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px;">RICH ROOM</h1>
                  <p style="color: #00F0FF; font-size: 11px; margin: 4px 0 20px 0; text-transform: uppercase; letter-spacing: 2px;">Official Player Broadcast</p>
                  <div style="background: #0E0A24; border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 12px; padding: 22px; text-align: left; margin: 20px 0;">
                    <h2 style="font-size: 18px; margin: 0 0 10px 0; color: #FFFFFF;">${title.trim()}</h2>
                    <p style="font-size: 14px; color: #CBD5E1; line-height: 1.6; margin: 0;">${message.trim()}</p>
                  </div>
                  <a href="${url && url.startsWith('http') ? url : `${appUrl}${url || ''}`}" style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #070514; font-weight: 900; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-size: 14px; letter-spacing: 0.5px;">
                    ACCESS NOW &amp; PLAY
                  </a>
                  <p style="margin-top: 30px; font-size: 11px; color: #64748B;">You received this update because you are a registered player at Rich Room.</p>
                </div>
              `;
              sendEmail({ to: u.email, subject: `🎰 Rich Room: ${title.trim()}`, html }).catch(() => {});
            }
          }
        } catch (emailErr) {
          console.warn('Broadcast email batch note:', emailErr.message);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast successfully dispatched via [${channel.toUpperCase()}] to [${segment.toUpperCase()}]!`,
      broadcast: { ...newRecord, id: res.insertedId.toString() },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Player subscribes to Web Push & VIP Broadcast Alerts
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    const body = await req.json().catch(() => ({}));
    const email = (session?.email || body.email || '').toLowerCase().trim();
    const fcmToken = body.token || body.fcmToken || null;
    const device = body.device || 'web_chrome';
    const deviceId = body.deviceId || null;

    if (!fcmToken && !email) {
      return NextResponse.json({ success: false, error: 'Push token or email is required' }, { status: 400 });
    }

    const db = await getDb();
    const subsCol = db.collection('subscriptions');
    const usersCol = db.collection('users');

    const effectiveEmail = email || (session?.email ? session.email.toLowerCase().trim() : (fcmToken ? `device_${fcmToken.slice(-10)}@push.richroom.games` : 'anonymous@push.richroom.games'));
    const effectiveUserId = session?.userId ? session.userId.toString() : (body.userId ? body.userId.toString() : null);
    const effectiveUsername = session?.username || body.username || (effectiveEmail.includes('@') ? effectiveEmail.split('@')[0] : 'Player');
    const effectiveRole = session?.role || body.role || 'player';

    const filter = fcmToken ? { $or: [{ fcmToken }, { token: fcmToken }] } : { email: effectiveEmail };

    await subsCol.updateOne(
      filter,
      {
        $set: {
          email: effectiveEmail,
          fcmToken,
          token: fcmToken,
          device,
          deviceId,
          userId: effectiveUserId,
          username: effectiveUsername,
          role: effectiveRole,
          isSubscribed: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    if (effectiveUserId) {
      try {
        const { ObjectId } = await import('mongodb');
        const uFilter = ObjectId.isValid(effectiveUserId) ? { _id: new ObjectId(effectiveUserId) } : { _id: effectiveUserId };
        await usersCol.updateOne(
          uFilter,
          { $set: { isSubscribed: true } }
        );
      } catch {}
    }

    // Auto-subscribe FCM token to broadcast topics
    if (fcmToken && fcmToken.length > 15) {
      (async () => {
        try {
          const messaging = await getFirebaseMessaging();
          if (messaging) {
            // All players subscribe to player broadcast topics
            await messaging.subscribeToTopic([fcmToken], 'paradise_all_players');
            await messaging.subscribeToTopic([fcmToken], 'all_players');
            await messaging.subscribeToTopic([fcmToken], 'vegas_all_players');

            // Strictly separate staff alerts topic
            if (effectiveRole && effectiveRole !== 'player') {
              await messaging.subscribeToTopic([fcmToken], 'paradise_staff_alerts');
            } else {
              try {
                await messaging.unsubscribeFromTopic([fcmToken], 'paradise_staff_alerts');
              } catch {}
            }
          }
        } catch (subErr) {
          console.warn('[FCM] Auto-subscribe device token note:', subErr.message);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to VIP Broadcasts & Push Notifications!',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Mark user notifications as read
export async function PATCH(req) {
  try {
    const session = await getSessionUser();
    const body = await req.json().catch(() => ({}));
    const email = (session?.email || body.email || '').toLowerCase().trim();
    const userId = session?.userId ? session.userId.toString() : (body.userId ? body.userId.toString() : null);
    const notificationId = body.notificationId || body.id || null;

    const db = await getDb();
    const notifsCol = db.collection('notifications');

    const userKeys = [];
    if (email) userKeys.push(email);
    if (userId) userKeys.push(userId);
    if (session?.username) userKeys.push(session.username.toLowerCase());

    // Single notification marked as read
    if (notificationId) {
      const { ObjectId } = await import('mongodb');
      let idFilter;
      try {
        idFilter = ObjectId.isValid(notificationId) ? { _id: new ObjectId(notificationId) } : { _id: notificationId };
      } catch {
        idFilter = { _id: notificationId };
      }
      const updateDoc = { $set: { read: true, readAt: new Date() } };
      if (userKeys.length > 0) {
        updateDoc.$addToSet = { readBy: { $each: userKeys } };
      }
      await notifsCol.updateOne(idFilter, updateDoc);
      return NextResponse.json({ success: true, message: 'Notification marked as read.' });
    }

    // Mark all notifications read for user
    const filterConditions = [{ target: 'all' }];
    if (userId) {
      filterConditions.push({ userId });
      filterConditions.push({ userId: userId.toString() });
    }
    if (email) {
      filterConditions.push({ email });
      filterConditions.push({ userEmail: email });
    }
    if (session?.username) {
      filterConditions.push({ username: session.username });
      filterConditions.push({ username: session.username.toLowerCase() });
    }

    const updateDoc = {
      $set: { read: true, readAt: new Date() },
    };
    if (userKeys.length > 0) {
      updateDoc.$addToSet = { readBy: { $each: userKeys } };
    }

    await notifsCol.updateMany(
      { $or: filterConditions },
      updateDoc
    );

    return NextResponse.json({ success: true, message: 'Notifications marked as read.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
