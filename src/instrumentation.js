/** Warm DB indexes/seeds once per server process — not on every login. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  try {
    const { ensureDbInitialized } = await import('./lib/initDb');
    ensureDbInitialized().catch(() => {});
  } catch {}
}
