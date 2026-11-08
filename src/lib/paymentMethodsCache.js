import {
  CACHE_KEYS,
  readLocalCache,
  writeLocalCache,
} from '@/lib/playerDataCache';

const TTL_MS = 30 * 60 * 1000;

export function readPaymentMethodsCache() {
  const methods = readLocalCache(CACHE_KEYS.PAYMENT_METHODS, '', TTL_MS);
  return Array.isArray(methods) && methods.length > 0 ? methods : null;
}

export function writePaymentMethodsCache(methods) {
  if (!Array.isArray(methods) || methods.length === 0) return;
  writeLocalCache(CACHE_KEYS.PAYMENT_METHODS, methods, '', TTL_MS);
}

export function readCashoutMethodsCache() {
  const methods = readLocalCache(CACHE_KEYS.CASHOUT_METHODS, '', TTL_MS);
  return Array.isArray(methods) && methods.length > 0 ? methods : null;
}

export function writeCashoutMethodsCache(methods) {
  if (!Array.isArray(methods) || methods.length === 0) return;
  writeLocalCache(CACHE_KEYS.CASHOUT_METHODS, methods, '', TTL_MS);
}
