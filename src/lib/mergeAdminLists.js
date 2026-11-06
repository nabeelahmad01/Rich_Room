/**
 * When admin UI applies optimistic updates, background pollers can still return
 * stale "pending" rows until Mongo/aggregation catches up — causing flicker and
 * the feeling that approve/reject "did nothing". These merges prefer the
 * optimistic local row until the server list shows the same resolved state.
 */

export function getEntityId(item) {
  if (!item) return '';
  return String(item.id ?? item._id ?? '');
}

function depositNeedsAction(r) {
  return String(r?.status || '').toLowerCase() === 'pending';
}

function redemptionNeedsAction(r) {
  const s = String(r?.status || '').toLowerCase();
  if (s === 'pending' || s === 'pending_coin') return true;
  if (String(r?.stage || '') === 'coin_verification') return true;
  return false;
}

/** Coin desk optimistic update can set stage/coinApprovedBy before the next poll shows DB state */
function redemptionCoinDeskOptimisticAhead(local, incoming) {
  const incStage = String(incoming?.stage || '');
  const locStage = String(local?.stage || '');
  if (local?.coinApprovedBy && !incoming?.coinApprovedBy) return true;
  if (locStage === 'finance_payout' && (incStage === 'coin_verification' || incStage === '')) return true;
  const sLoc = String(local?.status || '').toLowerCase();
  const sInc = String(incoming?.status || '').toLowerCase();
  if (sLoc === 'rejected_by_coin' && (sInc === 'pending_coin' || incStage === 'coin_verification')) return true;
  return false;
}

function accountReqNeedsAction(r) {
  return String(r?.status || '').toUpperCase() === 'PENDING';
}

/**
 * @param {object[]} prev
 * @param {object[]} incoming — API order (newest first)
 */
export function mergeDepositsOptimistic(prev, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return incoming || [];
  const prevById = new Map(prev.map((x) => [getEntityId(x), x]));
  return incoming.map((inc) => {
    const id = getEntityId(inc);
    const loc = prevById.get(id);
    if (!loc) return inc;
    if (depositNeedsAction(inc) && !depositNeedsAction(loc)) return loc;
    return inc;
  });
}

export function mergeRedemptionsOptimistic(prev, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return incoming || [];
  const prevById = new Map(prev.map((x) => [getEntityId(x), x]));
  return incoming.map((inc) => {
    const id = getEntityId(inc);
    const loc = prevById.get(id);
    if (!loc) return inc;
    if (redemptionCoinDeskOptimisticAhead(loc, inc)) return loc;
    if (redemptionNeedsAction(inc) && !redemptionNeedsAction(loc)) return loc;
    return inc;
  });
}

export function mergeAccountRequestsOptimistic(prev, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return incoming || [];
  const prevById = new Map(prev.map((x) => [getEntityId(x), x]));
  return incoming.map((inc) => {
    const id = getEntityId(inc);
    const loc = prevById.get(id);
    if (!loc) return inc;
    if (accountReqNeedsAction(inc) && !accountReqNeedsAction(loc)) return loc;
    return inc;
  });
}
