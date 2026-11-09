/** Active cashout methods only — one row per display name (admin duplicates collapsed). */
export function normalizeActiveCashoutMethods(methods) {
  if (!Array.isArray(methods)) return [];
  const byKey = new Map();
  for (const raw of methods) {
    if (raw?.isActive === false) continue;
    const name = String(raw?.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const row = { ...raw, name };
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const ordA = Number(existing.order ?? 99);
    const ordB = Number(row.order ?? 99);
    if (ordB < ordA) byKey.set(key, row);
  }
  return [...byKey.values()].sort(
    (a, b) => Number(a.order ?? 99) - Number(b.order ?? 99) || a.name.localeCompare(b.name)
  );
}
