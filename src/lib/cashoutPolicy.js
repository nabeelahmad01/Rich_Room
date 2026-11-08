/** Minimum USD/SC amount for player cashout / redeem (site-wide default). */
export const MIN_CASHOUT_USD = 40;

/** Normalize legacy copy ($20 min, etc.) for player-facing UI. */
export function formatPlayerFacingCopy(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\$\s*20(\.00)?\s*(minimum|min)/gi, `$${MIN_CASHOUT_USD} minimum`)
    .replace(/minimum\s+(redeem|cashout|withdrawal)?\s*(amount\s+)?(of\s+)?\$?\s*20/gi, `minimum redeem amount of $${MIN_CASHOUT_USD}`)
    .replace(/Min\s*\$20/gi, `Min $${MIN_CASHOUT_USD}`)
    .replace(/\$20\s*minimum/gi, `$${MIN_CASHOUT_USD} minimum`)
    .replace(/\$20(?=\s*•|\s*USD|\s*SC|\s*minimum|\s*min\b)/gi, `$${MIN_CASHOUT_USD}`);
}

export function resolveMinCashoutFromSettings(settings) {
  const fromSettings = Number(settings?.minRedemptionSC ?? settings?.minWithdrawal);
  if (Number.isFinite(fromSettings) && fromSettings >= MIN_CASHOUT_USD) {
    return fromSettings;
  }
  if (Number.isFinite(fromSettings) && fromSettings > 0 && fromSettings < MIN_CASHOUT_USD) {
    return MIN_CASHOUT_USD;
  }
  return MIN_CASHOUT_USD;
}
