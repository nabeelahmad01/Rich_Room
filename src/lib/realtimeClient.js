/** Maps SSE payloads to existing in-app sync events (poll fallbacks stay as backup). */

import { REALTIME_TYPES } from '@/lib/realtimePublish';
import { refreshPlayerNotifications } from '@/lib/notificationsClient';
import { fetchPaymentMethods } from '@/lib/paymentMethodsClient';

const ADMIN_PULSE_TYPES = new Set([
  REALTIME_TYPES.ACCOUNT_REQUEST_CREATED,
  REALTIME_TYPES.ACCOUNT_REQUEST_UPDATED,
  REALTIME_TYPES.CHAT_MESSAGE,
  REALTIME_TYPES.DESK_SYNC,
  REALTIME_TYPES.FINANCE_DEPOSIT,
  REALTIME_TYPES.FINANCE_WITHDRAW,
  REALTIME_TYPES.KYC,
  REALTIME_TYPES.FREEPLAY,
  REALTIME_TYPES.COIN_DESK,
  REALTIME_TYPES.GATEWAYS,
]);

const PLAYER_PULSE_TYPES = new Set([
  REALTIME_TYPES.ACCOUNT_REQUEST_CREATED,
  REALTIME_TYPES.ACCOUNT_REQUEST_UPDATED,
  REALTIME_TYPES.CHAT_MESSAGE,
  REALTIME_TYPES.FINANCE_DEPOSIT,
  REALTIME_TYPES.FINANCE_WITHDRAW,
  REALTIME_TYPES.WALLET,
  REALTIME_TYPES.KYC,
  REALTIME_TYPES.NOTIFICATION_BROADCAST,
  REALTIME_TYPES.SETTINGS_UPDATED,
  REALTIME_TYPES.PROMO,
  REALTIME_TYPES.COIN_DESK,
]);

const BROADCAST_UI_TYPES = new Set([
  REALTIME_TYPES.SETTINGS_UPDATED,
  REALTIME_TYPES.GAMES_CATALOG,
  REALTIME_TYPES.PROMO,
  REALTIME_TYPES.GATEWAYS,
  REALTIME_TYPES.NOTIFICATION_BROADCAST,
]);

export function buildRealtimeUrl() {
  if (typeof window === 'undefined') return '/api/realtime';
  const params = new URLSearchParams();
  try {
    const guestId = (localStorage.getItem('pp_guest_chat_id') || '').trim();
    if (guestId) params.set('guestId', guestId);
  } catch {}
  const qs = params.toString();
  return qs ? `/api/realtime?${qs}` : '/api/realtime';
}

function bumpPlayerBalance() {
  window.dispatchEvent(new CustomEvent('balanceUpdate'));
  try {
    const ch = new BroadcastChannel('paradise_balance_sync');
    ch.postMessage({ t: Date.now() });
    ch.close();
  } catch {}
  try {
    localStorage.setItem('paradise_user_balance_sync', String(Date.now()));
  } catch {}
}

function adminDeskPulse(event) {
  window.dispatchEvent(new CustomEvent('paradise-admin-desk-sync', { detail: event }));
}

function playerInstantPulse(event) {
  bumpPlayerBalance();
  refreshPlayerNotifications({ force: true }).catch(() => {});
  window.dispatchEvent(new CustomEvent('paradise-cashier-refresh', { detail: event }));
  window.dispatchEvent(new CustomEvent('paradise-ledger-refresh', { detail: event }));
  window.dispatchEvent(new CustomEvent('paradise-instant-sync', { detail: event }));
}

function broadcastUiPulse(event) {
  if (event.type === REALTIME_TYPES.SETTINGS_UPDATED) {
    window.dispatchEvent(new CustomEvent('paradise-public-settings-sync', { detail: event }));
  }
  if (
    event.type === REALTIME_TYPES.GAMES_CATALOG ||
    event.type === REALTIME_TYPES.GATEWAYS
  ) {
    window.dispatchEvent(new CustomEvent('paradise-games-catalog-sync', { detail: event }));
    window.dispatchEvent(new CustomEvent('paradise-cashier-refresh', { detail: event }));
    if (event.type === REALTIME_TYPES.GATEWAYS) {
      fetchPaymentMethods({ force: true }).catch(() => {});
    }
  }
  if (event.type === REALTIME_TYPES.PROMO) {
    window.dispatchEvent(new CustomEvent('paradise-promo-sync', { detail: event }));
  }
  if (event.type === REALTIME_TYPES.NOTIFICATION_BROADCAST) {
    refreshPlayerNotifications({ force: true }).catch(() => {});
  }
}

export function applyRealtimeEvent(event) {
  if (!event || typeof window === 'undefined') return;
  if (event.type === 'CONNECTED') return;

  window.dispatchEvent(new CustomEvent('richroom-realtime', { detail: event }));

  switch (event.type) {
    case REALTIME_TYPES.ACCOUNT_REQUEST_CREATED:
    case REALTIME_TYPES.ACCOUNT_REQUEST_UPDATED: {
      const detail = {
        type: 'ACCOUNTS_UPDATED',
        status: event.status,
        gameTitle: event.gameTitle,
        userEmail: event.userEmail,
        request: event.request,
        t: event.t,
      };
      window.dispatchEvent(new CustomEvent('accountRequestUpdated', { detail }));
      window.dispatchEvent(new CustomEvent('playerAccountsUpdated', { detail }));
      if (event.type === REALTIME_TYPES.ACCOUNT_REQUEST_CREATED) {
        const req = event.request || {};
        const isLoad = req.requestType === 'COIN_LOAD' || Number(req.transferAmount || 0) > 0;
        if (isLoad) {
          window.dispatchEvent(
            new CustomEvent('paradise_staff_event_local', {
              detail: {
                type: 'NEW_COIN_LOAD',
                requestId: req.id || req._id,
                request: req,
                amount: req.transferAmount,
                username: req.userName,
                gameTitle: req.gameTitle,
                timestamp: event.t,
              },
            })
          );
        } else {
          window.dispatchEvent(
            new CustomEvent('paradise_staff_event_local', {
              detail: {
                type: 'NEW_REQUEST',
                category: 'ACCOUNT_CREATION',
                request: event.request,
                userEmail: event.userEmail,
                timestamp: event.t,
              },
            })
          );
        }
      }
      break;
    }
    case REALTIME_TYPES.CHAT_MESSAGE: {
      const convId = event.conversationId;
      const msg = event.message || {};
      window.dispatchEvent(
        new CustomEvent('paradise_staff_event_local', {
          detail: {
            type: 'NEW_CHAT_MESSAGE',
            conversationId: convId,
            text: msg.text || '',
            username: msg.username || msg.customerUsername || 'Player',
            message: msg,
            senderRole: event.senderRole,
            timestamp: event.t,
          },
        })
      );
      if (event.senderRole === 'staff') {
        try {
          const ch = new BroadcastChannel('paradise_player_chat_sync');
          ch.postMessage({
            type: 'STAFF_CHAT_REPLY',
            conversationId: convId,
            time: event.t,
          });
          ch.close();
        } catch {}
        try {
          localStorage.setItem(
            'paradise_player_chat_event',
            JSON.stringify({
              type: 'STAFF_CHAT_REPLY',
              conversationId: convId,
              time: event.t,
            })
          );
        } catch {}
      }
      break;
    }
    case REALTIME_TYPES.FINANCE_DEPOSIT: {
      if (event.action === 'created' || event.status === 'pending') {
        window.dispatchEvent(
          new CustomEvent('paradise_staff_event_local', {
            detail: {
              type: 'NEW_DEPOSIT',
              depositId: event.depositId,
              amount: event.amount,
              username: event.username,
              methodName: event.methodName,
              totalSC: event.totalSC,
              bonusSC: event.bonusSC,
              gameTitle: event.gameTitle,
              playerTagName: event.playerTagName,
              txHash: event.txHash,
              hasProof: event.hasProof !== false,
              timestamp: event.t,
            },
          })
        );
      }
      if (event.action === 'approve' || event.action === 'reject' || event.status === 'approved' || event.status === 'rejected') {
        window.dispatchEvent(new CustomEvent('paradise-deposit-updated', { detail: event }));
      }
      break;
    }
    case REALTIME_TYPES.FINANCE_WITHDRAW: {
      if (event.action === 'created' || event.status === 'pending' || event.status === 'pending_coin') {
        window.dispatchEvent(
          new CustomEvent('paradise_staff_event_local', {
            detail: {
              type: 'NEW_COIN_CASHOUT',
              redemptionId: event.redemptionId,
              amount: event.amount,
              username: event.username,
              gameTitle: event.gameTitle,
              timestamp: event.t,
            },
          })
        );
      }
      break;
    }
    case REALTIME_TYPES.COIN_DESK: {
      window.dispatchEvent(
        new CustomEvent('paradise_staff_event_local', {
          detail: {
            type: event.subType || 'COIN_DESK_SYNC',
            ...event,
            timestamp: event.t,
          },
        })
      );
      break;
    }
    default:
      break;
  }

  if (ADMIN_PULSE_TYPES.has(event.type)) {
    adminDeskPulse(event);
  }

  if (PLAYER_PULSE_TYPES.has(event.type) || event.userEmail || event.userId) {
    playerInstantPulse(event);
  }

  if (BROADCAST_UI_TYPES.has(event.type)) {
    broadcastUiPulse(event);
  }
}
