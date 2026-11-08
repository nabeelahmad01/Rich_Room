/** Minimum USD/SC amount for player cashout / redeem (site-wide default). */
export const MIN_CASHOUT_USD = 40;

/** Default rules shown when admin has not saved custom copy yet. */
export const DEFAULT_CASHOUT_RULES = `1. All winnings from eligible sweepstakes games can be redeemed directly to your active cashout method.
2. Minimum redeem / cashout amount is $${MIN_CASHOUT_USD} USD (${MIN_CASHOUT_USD} SC).
3. Cashouts are processed 24/7 with zero processing fees.
4. Ensure your Cashtag, handle, or crypto address matches your verified account.
5. Processing time is usually within 5 to 15 minutes.`;

/** Admin settings → display text (never empty for players). */
export function resolveCashoutRulesText(settings) {
  const raw = String(settings?.cashoutRules ?? '').trim();
  return raw || DEFAULT_CASHOUT_RULES;
}

/** Normalize legacy copy ($20 min, etc.) for player-facing UI. */
export function formatPlayerFacingCopy(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\$\s*20(\.00)?\s*(minimum|min)/gi, `$${MIN_CASHOUT_USD} minimum`)
    .replace(/minimum\s+(redeem|cashout|withdrawal)?\s*(amount\s+)?(of\s+)?\$?\s*20/gi, `minimum redeem amount of $${MIN_CASHOUT_USD}`)
    .replace(/Min\s*\$20/gi, `Min $${MIN_CASHOUT_USD}`)
    .replace(/\$20\s*minimum/gi, `$${MIN_CASHOUT_USD} minimum`)
    .replace(/MINIMUM\s+REDEEM\s+LIMIT\s+IS\s+\$?\s*20/gi, `MINIMUM REDEEM LIMIT IS $${MIN_CASHOUT_USD}`)
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
