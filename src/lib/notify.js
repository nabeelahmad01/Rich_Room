import { getDb } from './mongodb';
import { sendPushNotification } from './fcm';
import { publishStaffPlayerSync, publishStaffSync, REALTIME_TYPES } from './realtimePublish';

/**
 * Dispatches an instant in-app notification & push notification strictly to ONE targeted player.
 * NEVER broadcasts personal alerts to any other user or player topic!
 */
export function notifyPlayer({ userId, userEmail, username, title, message, type = 'general', data = {} }) {
  publishStaffPlayerSync(REALTIME_TYPES.WALLET, {
    userEmail,
    userId,
    notifyType: type,
    title,
    url: data?.url,
  });

  // Fire asynchronously in background
  (async () => {
    try {
      const db = await getDb();
      if (!db || !db.collection) return;

      let cleanEmail = (userEmail || '').toLowerCase().trim();
      let cleanUid = userId ? userId.toString().trim() : null;
      let cleanUsername = (username || '').trim();

      // If missing email or uid, look up in users collection to ensure complete targeting
      if ((!cleanEmail || !cleanUid) && (cleanUid || cleanEmail || cleanUsername)) {
        try {
          const userOr = [];
          if (cleanUid) {
            userOr.push({ _id: cleanUid });
            if (/^[0-9a-fA-F]{24}$/.test(cleanUid)) {
              const { ObjectId } = await import('mongodb');
              userOr.push({ _id: new ObjectId(cleanUid) });
            }
          }
          if (cleanEmail) userOr.push({ email: cleanEmail });
          if (cleanUsername && cleanUsername !== 'Player') userOr.push({ username: cleanUsername });

          if (userOr.length > 0) {
            const uDoc = await db.collection('users').findOne({ $or: userOr });
            if (uDoc) {
              cleanUid = uDoc._id.toString();
              cleanEmail = (uDoc.email || cleanEmail).toLowerCase().trim();
              cleanUsername = uDoc.username || cleanUsername;
            }
          }
        } catch {}
      }

      // 1. In-app notification record for targeted player ONLY
      await db.collection('notifications').insertOne({
        userId: cleanUid,
        userEmail: cleanEmail,
        target: 'player',
        username: cleanUsername || cleanEmail.split('@')[0] || 'Player',
        title,
        message,
        type,
        url: data?.url || (type === 'chat_message' ? '/chat' : '/'),
        read: false,
        createdAt: new Date(),
      }).catch(() => {});

      // 2. Find FCM device push tokens specifically for this player
      const tokenQueries = [];
      if (cleanEmail) tokenQueries.push({ email: cleanEmail });
      if (cleanUid) tokenQueries.push({ userId: cleanUid });
      if (cleanUsername && cleanUsername !== 'Player') tokenQueries.push({ username: cleanUsername });

      if (tokenQueries.length > 0) {
        const subs = await db.collection('subscriptions').find({ $or: tokenQueries }).toArray();
        const userTokens = [
          ...new Set(
            subs
              .map((s) => s.fcmToken || s.token)
              .filter((t) => typeof t === 'string' && t.trim().length > 15)
          ),
        ];

        // 3. Send Push Notification to player's devices ONLY
        for (const tok of userTokens) {
          await sendPushNotification({
            token: tok,
            title,
            body: message,
            data: { ...data, type, target: 'player', userId: cleanUid || '' },
          }).catch((e) => {
            console.warn('[Notify User Push Note]:', e.message);
          });
        }
      }
    } catch (err) {
      console.warn('[Notify Helper Error]:', err.message);
    }
  })();
}

/**
 * Dispatches staff alerts strictly to authorized staff members and admin concierge desk.
 * NEVER sends to player device tokens or player broadcast topics!
 */
export function notifyStaff({ title, message, type = 'staff_alert', data = {} }) {
  publishStaffSync(REALTIME_TYPES.DESK_SYNC, {
    notifyType: type,
    title,
    conversationId: data?.conversationId,
    url: data?.url,
  });

  (async () => {
    try {
      const db = await getDb();
      if (!db || !db.collection) return;

      // 1. In-app notification record for Staff
      await db.collection('notifications').insertOne({
        target: 'staff',
        channel: 'all',
        title,
        message,
        type,
        conversationId: data.conversationId || null,
        url: data.url || '/admin',
        read: false,
        createdAt: new Date(),
      }).catch(() => {});

      // 2. Find Staff members & their push device tokens ONLY
      const staffRoles = ['superadmin', 'admin', 'chat_support', 'operation_admin', 'financial_manager', 'coin_manager'];
      const staffUsers = await db.collection('users').find(
        { role: { $in: staffRoles } },
        { projection: { _id: 1, email: 1, username: 1 } }
      ).toArray().catch(() => []);

      const staffQueries = [{ role: { $in: staffRoles } }];
      for (const u of staffUsers) {
        staffQueries.push({ userId: u._id.toString() });
        if (u.email) staffQueries.push({ email: u.email.toLowerCase().trim() });
        if (u.username) staffQueries.push({ username: u.username });
      }

      const staffSubs = await db.collection('subscriptions').find({ $or: staffQueries }).toArray().catch(() => []);
      const staffTokens = [
        ...new Set(
          staffSubs
            .map((s) => s.fcmToken || s.token)
            .filter((t) => typeof t === 'string' && t.trim().length > 15)
        ),
      ];

      if (staffTokens.length > 0) {
        for (const tok of staffTokens) {
          await sendPushNotification({
            token: tok,
            title,
            body: message,
            data: { ...data, type, target: 'staff' },
          }).catch(() => {});
        }
      }

      // 3. Send strictly to staff topic ONLY (never broadcast to players)
      await sendPushNotification({
        topic: 'paradise_staff_alerts',
        title,
        body: message,
        data: { ...data, type, target: 'staff' },
      }).catch(() => {});
    } catch (err) {
      console.warn('[Notify Staff Helper Error]:', err.message);
    }
  })();
}
