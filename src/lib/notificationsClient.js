/**
 * Deduplicated player notification fetch — one in-flight request, shared badge/toast state.
 */

let inFlightPromise = null;
let lastFetchAt = 0;
let lastPayload = null;
const THROTTLE_MS = 1800;

function buildNotificationsUrl() {
  if (typeof window === 'undefined') return '/api/notifications';
  const params = new URLSearchParams();
  const email = (localStorage.getItem('pp_user_email') || '').trim();
  const guestId = (localStorage.getItem('pp_guest_chat_id') || '').trim();
  if (email) params.set('email', email);
  else if (guestId) params.set('guestId', guestId);
  return params.toString() ? `/api/notifications?${params.toString()}` : '/api/notifications';
}

function publish(payload) {
  if (typeof window === 'undefined' || !payload) return;
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent('paradise-notifications-sync', { detail: payload })
    );
  });
  try {
    const ch = new BroadcastChannel('paradise_notifications_sync');
    ch.postMessage(payload);
    ch.close();
  } catch {
    /* ignore */
  }
}

export function isPlayerSoundEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem('pp_sound_enabled') !== 'false';
  } catch {
    return true;
  }
}

export function tuneForNotification(type) {
  switch (type) {
    case 'chat_message':
      return 'bell';
    case 'deposit':
    case 'withdraw':
    case 'cashout':
      return 'chaching';
    case 'bonus':
    case 'promo':
      return 'jackpot';
    default:
      return 'radar';
  }
}

/**
 * @returns {Promise<{ success: boolean, notifications: Array, unreadCount: number }|null>}
 */
export async function refreshPlayerNotifications({ force = false } = {}) {
  if (typeof window === 'undefined') return null;

  const now = Date.now();
  if (!force && lastPayload && now - lastFetchAt < THROTTLE_MS) {
    return lastPayload;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetch(buildNotificationsUrl(), {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.notifications)) {
        const empty = { success: true, notifications: [], unreadCount: 0 };
        lastPayload = empty;
        lastFetchAt = Date.now();
        publish(empty);
        return empty;
      }

      const notifications = data.notifications;
      const unreadCount = notifications.filter((n) => !n.read).length;
      const payload = { success: true, notifications, unreadCount };
      lastPayload = payload;
      lastFetchAt = Date.now();
      publish(payload);
      return payload;
    } catch {
      return lastPayload;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function getLastNotificationPayload() {
  return lastPayload;
}
