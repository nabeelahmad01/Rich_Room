import {
  getRealtimeHub,
  staffChannel,
  playerEmailChannel,
  playerIdChannel,
  guestChannel,
  conversationChannels,
  playerBroadcastChannel,
} from '@/lib/realtimeHub';

export const REALTIME_TYPES = {
  ACCOUNT_REQUEST_CREATED: 'ACCOUNT_REQUEST_CREATED',
  ACCOUNT_REQUEST_UPDATED: 'ACCOUNT_REQUEST_UPDATED',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  DESK_SYNC: 'DESK_SYNC',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  FINANCE_DEPOSIT: 'FINANCE_DEPOSIT',
  FINANCE_WITHDRAW: 'FINANCE_WITHDRAW',
  WALLET: 'WALLET',
  KYC: 'KYC',
  FREEPLAY: 'FREEPLAY',
  NOTIFICATION_BROADCAST: 'NOTIFICATION_BROADCAST',
  GAMES_CATALOG: 'GAMES_CATALOG',
  PROMO: 'PROMO',
  COIN_DESK: 'COIN_DESK',
  AFFILIATE: 'AFFILIATE',
  GATEWAYS: 'GATEWAYS',
};

function resolveChannels(targets = {}) {
  const channels = [];
  if (targets.staff) channels.push(staffChannel());
  if (targets.broadcast) channels.push(playerBroadcastChannel());
  if (targets.userEmail) {
    const ch = playerEmailChannel(targets.userEmail);
    if (ch) channels.push(ch);
  }
  if (targets.userId) {
    const ch = playerIdChannel(targets.userId);
    if (ch) channels.push(ch);
  }
  if (targets.guestId) {
    const ch = guestChannel(targets.guestId);
    if (ch) channels.push(ch);
  }
  if (targets.conversationId) {
    channels.push(...conversationChannels(targets.conversationId));
  }
  return [...new Set(channels)];
}

/** @param {{ type: string, targets?: object } & Record<string, unknown>} opts */
export function publishRealtimeEvent(opts) {
  const { type, targets = {}, ...rest } = opts;
  const channels = resolveChannels(targets);
  if (channels.length === 0) return;
  getRealtimeHub().publish(channels, { type, ...rest });
}

/** Staff desk + optional targeted player (default staff on). */
export function publishStaffPlayerSync(type, fields = {}) {
  const { userEmail, userId, staff = true, guestId, conversationId, ...rest } = fields;
  publishRealtimeEvent({
    type,
    userEmail,
    userId,
    ...rest,
    targets: { staff, userEmail, userId, guestId, conversationId },
  });
}

/** Admin-only pulse. */
export function publishStaffSync(type, fields = {}) {
  publishRealtimeEvent({ type, ...fields, targets: { staff: true } });
}

/** All connected players + staff. */
export function publishBroadcast(type, fields = {}) {
  getRealtimeHub().publish([staffChannel(), playerBroadcastChannel()], {
    type,
    ...fields,
    t: Date.now(),
  });
}

export function publishAccountRequestCreated({ request, userEmail, userId }) {
  publishStaffPlayerSync(REALTIME_TYPES.ACCOUNT_REQUEST_CREATED, {
    request,
    userEmail,
    userId,
    status: 'PENDING',
  });
}

export function publishAccountRequestUpdated({
  request,
  userEmail,
  userId,
  status,
  gameTitle,
  action,
}) {
  publishStaffPlayerSync(REALTIME_TYPES.ACCOUNT_REQUEST_UPDATED, {
    request,
    userEmail,
    userId,
    status,
    gameTitle,
    action,
  });
}

export function publishChatRealtime({
  conversationId,
  senderRole,
  message,
  userEmail,
  userId,
  guestId,
}) {
  publishRealtimeEvent({
    type: REALTIME_TYPES.CHAT_MESSAGE,
    conversationId,
    senderRole,
    message,
    targets: {
      staff: true,
      userEmail,
      userId,
      guestId,
      conversationId,
    },
  });
}

export function publishDeskSync(payload = {}) {
  const { targets: extraTargets, ...rest } = payload;
  publishRealtimeEvent({
    type: REALTIME_TYPES.DESK_SYNC,
    ...rest,
    targets: { staff: true, ...extraTargets },
  });
}

export function publishSettingsUpdated() {
  publishBroadcast(REALTIME_TYPES.SETTINGS_UPDATED);
}

export function publishFinanceDeposit(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.FINANCE_DEPOSIT, fields);
}

export function publishFinanceWithdraw(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.FINANCE_WITHDRAW, fields);
}

export function publishWallet(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.WALLET, fields);
}

export function publishKyc(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.KYC, fields);
}

export function publishFreeplay(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.FREEPLAY, fields);
}

export function publishGamesCatalog(fields = {}) {
  publishBroadcast(REALTIME_TYPES.GAMES_CATALOG, fields);
}

export function publishPromo(fields = {}) {
  publishBroadcast(REALTIME_TYPES.PROMO, fields);
}

export function publishCoinDesk(fields) {
  publishStaffPlayerSync(REALTIME_TYPES.COIN_DESK, fields);
}

export function publishGatewaysUpdated() {
  publishBroadcast(REALTIME_TYPES.GATEWAYS);
}
