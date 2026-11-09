import { readPaymentMethodsInstant } from '@/lib/paymentMethodsClient';
import { normalizeActiveCashoutMethods } from '@/lib/cashoutMethodsNormalize';
import {
  writeSessionCache,
  writeLocalCache,
  readLocalCache,
  CACHE_KEYS,
} from '@/lib/playerDataCache';

const TTL_MS = 30 * 60 * 1000;

export function readPaymentMethodsCache() {
  return readPaymentMethodsInstant();
}

export function writePaymentMethodsCache(methods) {
  if (!Array.isArray(methods) || methods.length === 0) return;
  writeSessionCache(CACHE_KEYS.PAYMENT_METHODS, methods);
  writeLocalCache(CACHE_KEYS.PAYMENT_METHODS, methods);
}

export function readCashoutMethodsCache() {
  const methods = readLocalCache(CACHE_KEYS.CASHOUT_METHODS, '', TTL_MS);
  if (!Array.isArray(methods) || methods.length === 0) return null;
  return normalizeActiveCashoutMethods(methods);
}

export function writeCashoutMethodsCache(methods) {
  const normalized = normalizeActiveCashoutMethods(methods);
  if (!normalized.length) return;
  writeLocalCache(CACHE_KEYS.CASHOUT_METHODS, normalized, '', TTL_MS);
}
