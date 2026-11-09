/** Cross-tab / instant refresh when admin issues or updates game IDs. */

const CHANNEL = 'paradise_player_accounts_sync';
const LS_KEY = 'paradise_player_accounts_event';

export function broadcastPlayerAccountsUpdated(payload = {}) {
  if (typeof window === 'undefined') return;
  const message = {
    type: 'ACCOUNTS_UPDATED',
    t: Date.now(),
    ...payload,
  };

  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(message);
    ch.close();
  } catch {}

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(message));
  } catch {}

  window.dispatchEvent(new CustomEvent('playerAccountsUpdated', { detail: message }));
  window.dispatchEvent(new CustomEvent('accountRequestUpdated', { detail: message }));
}

export function subscribePlayerAccountsSync(handler) {
  if (typeof window === 'undefined') return () => {};

  const onCustom = (e) => handler(e.detail || { type: 'ACCOUNTS_UPDATED' });
  const onLegacy = (e) => handler(e.detail || { type: 'ACCOUNTS_UPDATED' });
  const onStorage = (e) => {
    if (e.key === LS_KEY && e.newValue) {
      try {
        handler(JSON.parse(e.newValue));
      } catch {}
    }
  };

  let ch = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (ev) => handler(ev.data || { type: 'ACCOUNTS_UPDATED' });
  } catch {}

  window.addEventListener('playerAccountsUpdated', onCustom);
  window.addEventListener('accountRequestUpdated', onLegacy);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('playerAccountsUpdated', onCustom);
    window.removeEventListener('accountRequestUpdated', onLegacy);
    window.removeEventListener('storage', onStorage);
    if (ch) {
      try {
        ch.close();
      } catch {}
    }
  };
}
