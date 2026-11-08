const STORAGE_KEY = 'rr_payment_methods_v1';
const TTL_MS = 30 * 60 * 1000;

export function readPaymentMethodsCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.methods) || parsed.methods.length === 0) return null;
    if (Date.now() - (parsed.t || 0) > TTL_MS) return null;
    return parsed.methods;
  } catch {
    return null;
  }
}

export function writePaymentMethodsCache(methods) {
  if (typeof window === 'undefined' || !Array.isArray(methods) || methods.length === 0) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: Date.now(), methods }));
  } catch {}
}
