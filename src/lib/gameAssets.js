/**
 * Instant static thumbnail lookup table for all games.
 * Avoids any delay or waiting for database/network queries.
 */
export const GAME_THUMBNAIL_MAP = {
  'panda master': '/images/games/panda-master.webp',
  'panda-master': '/images/games/panda-master.webp',
  'ultra panda': '/images/games/ultra-panda.webp',
  'ultra-panda': '/images/games/ultra-panda.webp',
  'fire kirin': '/images/games/fire-kirin.webp',
  'fire-kirin': '/images/games/fire-kirin.webp',
  'orion stars': '/images/games/orion-stars.webp',
  'orion-stars': '/images/games/orion-stars.webp',
  'milky way': '/images/games/milky-way.webp',
  'milky-way': '/images/games/milky-way.webp',
  'dragon fury': '/images/games/dragon-fury.webp',
  'dragon-fury': '/images/games/dragon-fury.webp',
  'cash machine': '/images/games/cash-machine.webp',
  'cash-machine': '/images/games/cash-machine.webp',
  'ultra thunder': '/images/games/ultra-thunder.webp',
  'ultra-thunder': '/images/games/ultra-thunder.webp',
  'e-game': '/images/games/e-game.webp',
  'egame': '/images/games/e-game.webp',
  'egames': '/images/games/e-game.webp',
  'game room': '/images/games/game-room.webp',
  'game-room': '/images/games/game-room.webp',
  'mega spin': '/images/games/mega-spin.webp',
  'mega-spin': '/images/games/mega-spin.webp',
  'juwa city': '/images/games/juwa-city.webp',
  'juwa-city': '/images/games/juwa-city.webp',
  'juwa 2.0': '/images/games/juwa-20.webp',
  'juwa 2': '/images/games/juwa-20.webp',
  'juwa-2': '/images/games/juwa-20.webp',
  'juwa': '/images/games/juwa-city.webp',
  'juwa 777': '/images/juwa-777.webp',
  'juwa-777': '/images/juwa-777.webp',
  'game vault': '/images/games/game-vault.webp',
  'game-vault': '/images/games/game-vault.webp',
  'cash frenzy': '/images/games/cash-frenzy.webp',
  'cash-frenzy': '/images/games/cash-frenzy.webp',
  'golden treasure': '/images/games/golden-treasure.webp',
  'golden-treasure': '/images/games/golden-treasure.webp',
  'mr all in one': '/images/games/mr-all-in-one.webp',
  'mr. all-in-one': '/images/games/mr-all-in-one.webp',
  'fun station slots': '/images/games/fun-station-slots.webp',
  'fun-station slots': '/images/games/fun-station-slots.webp',
  'river sweeps': '/images/games/river-sweeps.webp',
  'river-sweeps': '/images/games/river-sweeps.webp',
  'yolo 777': '/images/games/yolo-777.webp',
  'yolo-777': '/images/games/yolo-777.webp',
  'ding ding': '/images/games/ding-ding.webp',
  'ding-ding': '/images/games/ding-ding.webp',
  'vblink': '/images/games/vblink.webp',
  'v-blink': '/images/games/vblink.webp',
  'golden dragon': '/images/games/dragon-fury.webp',
  'golden-dragon': '/images/games/dragon-fury.webp',
  'panda 777 slots': '/images/hero-slot.webp',
  'cyber matrix crash': '/images/neon-crash.webp',
  'royal roulette': '/images/royal-roulette.webp',
  'vegas blackjack': '/images/vegas-blackjack.webp',
  'vegas 777': '/images/vegas-777.webp',
  'vegas-777': '/images/vegas-777.webp',
  'vegas keno': '/images/vegas-keno.webp',
};

/**
 * Returns an instant thumbnail path or data URL for any game.
 * Always prioritizes a custom admin-uploaded image (data:image/... or custom URL/webp)
 * before falling back to the static built-in catalog lookup table.
 */
export function getGameThumbnail(titleOrName, fallback) {
  const isPlaceholder =
    !fallback ||
    typeof fallback !== 'string' ||
    fallback === '/images/vegas-777.webp' ||
    fallback === '/images/vegas-777.svg' ||
    fallback.endsWith('.svg');

  // 1. If the game has a custom uploaded image (base64 data:image or custom URL/webp), always show it!
  if (!isPlaceholder) {
    return fallback;
  }

  if (!titleOrName) return '/images/vegas-777.webp';
  const clean = String(titleOrName).toLowerCase().trim();

  // 2. Direct match in static catalog
  if (GAME_THUMBNAIL_MAP[clean]) {
    return GAME_THUMBNAIL_MAP[clean];
  }

  // 3. Normalized match (remove special chars)
  const normalized = clean.replace(/[^a-z0-9]+/g, ' ').trim();
  if (GAME_THUMBNAIL_MAP[normalized]) {
    return GAME_THUMBNAIL_MAP[normalized];
  }

  // 4. Partial substring match for built-in titles
  if (clean.length >= 4) {
    for (const [key, path] of Object.entries(GAME_THUMBNAIL_MAP)) {
      if (clean.includes(key) || key.includes(clean)) {
        return path;
      }
    }
  }

  return '/images/vegas-777.webp';
}

/**
 * Standard list of all major game platforms available in the system.
 */
export const ALL_PLATFORM_GAMES = [
  'Ultra Panda',
  'Panda Master',
  'Fire Kirin',
  'Orion Stars',
  'Milky Way',
  'Game Vault',
  'Juwa City',
  'Juwa 2.0',
  'Dragon Fury',
  'Cash Machine',
  'Ultra Thunder',
  'E-Game',
  'Game Room',
  'Mega Spin',
  'Cash Frenzy',
  'Golden Treasure',
  'Mr. All-In-One',
  'Fun-Station Slots',
  'River Sweeps',
  'Yolo 777',
  'Ding Ding',
  'Vblink',
  'Panda 777 Slots',
  'Cyber Matrix Crash',
];

/**
 * Merges games from Admin, player's active accounts, and standard platforms.
 * Sorts them so player's linked active accounts appear first.
 */
export function getAvailableGamePlatforms(adminGames = [], userAccounts = []) {
  const map = new Map();

  // 1. First add admin games
  (adminGames || []).forEach((g) => {
    const title = (typeof g === 'string' ? g : g?.title || g?.name || '').trim();
    if (title) map.set(title.toLowerCase(), title);
  });

  // 2. Add user account games
  (userAccounts || []).forEach((a) => {
    const title = (a?.gameTitle || a?.title || '').trim();
    if (title) map.set(title.toLowerCase(), title);
  });

  // 3. Fallback to all standard platform games
  ALL_PLATFORM_GAMES.forEach((title) => {
    if (!map.has(title.toLowerCase())) {
      map.set(title.toLowerCase(), title);
    }
  });

  const list = Array.from(map.values());

  // Sort: User's linked active accounts first, then alphabetical
  list.sort((a, b) => {
    const aHas = (userAccounts || []).some(
      (acc) => (acc.gameTitle || '').toLowerCase().trim() === a.toLowerCase().trim()
    );
    const bHas = (userAccounts || []).some(
      (acc) => (acc.gameTitle || '').toLowerCase().trim() === b.toLowerCase().trim()
    );
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return a.localeCompare(b);
  });

  return list;
}

/**
 * High-speed fallback games catalog for 0ms instant initial render on page load/refresh.
 * Eliminates empty skeleton loaders during network roundtrips.
 */
export const DEFAULT_FALLBACK_GAMES = [
  {
    id: 'ultra-panda',
    gameId: 'ultra-panda',
    title: 'Ultra Panda',
    category: 'sweeps',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/games/ultra-panda.webp',
    image: '/images/games/ultra-panda.webp',
    imageUrl: '/images/games/ultra-panda.webp',
    type: 'internal',
    badge: 'TOP CHOICE',
    isActive: true,
    isHot: true,
    isFeatured: true,
    playsCount: 14200,
    rtp: 98.4,
    rating: 4.9,
  },
  {
    id: 'panda-master',
    gameId: 'panda-master',
    title: 'Panda Master',
    category: 'slots',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/games/panda-master.webp',
    image: '/images/games/panda-master.webp',
    imageUrl: '/images/games/panda-master.webp',
    type: 'internal',
    badge: 'HOT',
    isActive: true,
    isHot: true,
    isFeatured: false,
    playsCount: 11800,
    rtp: 98.1,
    rating: 4.9,
  },
  {
    id: 'fire-kirin',
    gameId: 'fire-kirin',
    title: 'Fire Kirin',
    category: 'fish',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/games/fire-kirin.webp',
    image: '/images/games/fire-kirin.webp',
    imageUrl: '/images/games/fire-kirin.webp',
    type: 'internal',
    badge: 'FISH KING',
    isActive: true,
    isHot: true,
    isFeatured: true,
    playsCount: 16500,
    rtp: 97.8,
    rating: 4.88,
  },
  {
    id: 'orion-stars',
    gameId: 'orion-stars',
    title: 'Orion Stars',
    category: 'sweeps',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/games/orion-stars.webp',
    image: '/images/games/orion-stars.webp',
    imageUrl: '/images/games/orion-stars.webp',
    type: 'internal',
    badge: 'POPULAR',
    isActive: true,
    isHot: false,
    isFeatured: true,
    playsCount: 9900,
    rtp: 98.2,
    rating: 4.91,
  },
  {
    id: 'game-vault',
    gameId: 'game-vault',
    title: 'Game Vault',
    category: 'sweeps',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/games/game-vault.webp',
    image: '/images/games/game-vault.webp',
    imageUrl: '/images/games/game-vault.webp',
    type: 'internal',
    badge: 'HIGH PAYOUT',
    isActive: true,
    isHot: true,
    isFeatured: false,
    playsCount: 8700,
    rtp: 97.9,
    rating: 4.86,
  },
  {
    id: 'milky-way',
    gameId: 'milky-way',
    title: 'Milky Way',
    category: 'sweeps',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/games/milky-way.webp',
    image: '/images/games/milky-way.webp',
    imageUrl: '/images/games/milky-way.webp',
    type: 'internal',
    badge: 'TRENDING',
    isActive: true,
    isHot: false,
    isFeatured: true,
    playsCount: 7400,
    rtp: 97.6,
    rating: 4.82,
  },
  {
    id: 'panda-777-slots',
    gameId: 'panda-777-slots',
    title: 'Panda 777 Slots',
    category: 'slots',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/hero-slot.webp',
    image: '/images/hero-slot.webp',
    imageUrl: '/images/hero-slot.webp',
    type: 'internal',
    badge: 'IN-HOUSE',
    isActive: true,
    isHot: true,
    isFeatured: true,
    playsCount: 22100,
    rtp: 98.9,
    rating: 4.95,
  },
  {
    id: 'cyber-matrix-crash',
    gameId: 'cyber-matrix-crash',
    title: 'Cyber Matrix Crash',
    category: 'arcade',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/neon-crash.webp',
    image: '/images/neon-crash.webp',
    imageUrl: '/images/neon-crash.webp',
    type: 'internal',
    badge: 'MULTIPLIER',
    isActive: true,
    isHot: true,
    isFeatured: true,
    playsCount: 19800,
    rtp: 98.5,
    rating: 4.93,
  },
];


