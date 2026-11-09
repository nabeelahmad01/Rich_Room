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

/** Same-browser instant finance desk alert (before SSE / API round-trip). */
export function broadcastStaffNewDeposit({
  depositId,
  amount,
  username,
  methodName,
  totalSC,
  bonusSC,
  gameTitle,
  playerTagName,
  txHash,
  hasProof = true,
  replacesDepositId,
}) {
  if (typeof window === 'undefined') return;

  const timestamp = Date.now();
  const message = {
    type: 'NEW_DEPOSIT',
    depositId: depositId || `dep_${timestamp}`,
    replacesDepositId: replacesDepositId || null,
    amount: Number(amount || 0),
    username: username || 'Player',
    methodName: methodName || 'Payment',
    totalSC: totalSC != null ? Number(totalSC) : undefined,
    bonusSC: bonusSC != null ? Number(bonusSC) : undefined,
    gameTitle: gameTitle || '',
    playerTagName: playerTagName || '',
    txHash: txHash || '',
    hasProof: Boolean(hasProof),
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

/** Admin approve/reject → player tab (same browser) instantly, before API completes. */
export function broadcastPlayerDepositResolved({
  depositId,
  action = 'approve',
  creditedSC,
  amount,
  username,
}) {
  if (typeof window === 'undefined') return;

  const timestamp = Date.now();
  const status = action === 'approve' ? 'approved' : 'rejected';
  const message = {
    type: 'FINANCE_DEPOSIT',
    action,
    status,
    depositId,
    creditedSC: creditedSC != null ? Number(creditedSC) : undefined,
    amount: amount != null ? Number(amount) : undefined,
    username,
    timestamp,
    time: timestamp,
  };

  try {
    const ch = new BroadcastChannel('paradise_player_events');
    ch.postMessage(message);
    ch.close();
  } catch {}

  try {
    localStorage.setItem('paradise_player_deposit_event', JSON.stringify(message));
  } catch {}

  window.dispatchEvent(new CustomEvent('paradise-deposit-updated', { detail: message }));
  window.dispatchEvent(new CustomEvent('balanceUpdate'));
  window.dispatchEvent(new CustomEvent('paradise-instant-sync', { detail: message }));
}
