/** Player → admin instant alert (same browser tabs). Cross-device: admin fast-poll picks up API rows. */

const CHANNEL = 'paradise_staff_alerts';
const LS_KEY = 'paradise_staff_event';

export function broadcastStaffNewRequest({
  category = 'ACCOUNT_CREATION',
  requestId,
  request,
  gameTitle,
  userName,
  userEmail,
}) {
  if (typeof window === 'undefined') return;

  const timestamp = Date.now();
  const message = {
    type: 'NEW_REQUEST',
    category,
    requestId: requestId || request?.id || request?._id,
    request: request || null,
    gameTitle: gameTitle || request?.gameTitle,
    userName: userName || request?.userName,
    userEmail: userEmail || request?.userEmail,
    timestamp,
    time: timestamp,
  };

  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(message);
    ch.close();
  } catch {}

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(message));
  } catch {}

  window.dispatchEvent(new CustomEvent('paradise_staff_event_local', { detail: message }));
}
