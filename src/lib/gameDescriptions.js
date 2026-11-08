const CATEGORY_BLURBS = {
  fish: 'Official fish-hunter tables with boss fights, lightning cannons, and big multiplier wins.',
  slots: 'Certified slot reels with bonus rounds, free spins, and high-RTP sweepstakes play.',
  arcade: 'Fast arcade-style action with instant features and nonstop bonus drops.',
  casino: 'Classic table-style sweepstakes play with smooth pacing and VIP rewards.',
  internal: 'Play instantly in-browser — no extra download required.',
  sweepstakes: 'Verified partner platform. Request your game ID, load credits, and redeem 24/7.',
};

export function defaultGameDescription(game = {}) {
  const title = String(game.title || 'This game').trim();
  const category = String(game.category || 'sweepstakes').toLowerCase().trim();
  const platform = String(game.platform || game.provider || 'Rich Room Partner').trim();
  const base = CATEGORY_BLURBS[category] || CATEGORY_BLURBS.sweepstakes;
  if (game.isInternal) {
    return `${title} — ${CATEGORY_BLURBS.internal}`;
  }
  return `${title} on ${platform}. ${base}`;
}

export function withGameDescription(game) {
  if (!game) return game;
  const description = (game.description && String(game.description).trim()) || defaultGameDescription(game);
  return { ...game, description };
}
