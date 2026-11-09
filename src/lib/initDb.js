import bcrypt from 'bcryptjs';
import { getDb } from './mongodb';
import { ROLES } from './auth';

let isDbInitialized = false;
let initPromise = null;

export async function ensureDbInitialized() {
  if (isDbInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await getDb();

      // Ensure MongoDB Indexes for Ultra-Fast Queries
      try {
        if (db && typeof db.collection === 'function') {
          await Promise.allSettled([
            db.collection('users').createIndex({ email: 1 }),
            db.collection('users').createIndex({ username: 1 }),
            db.collection('deposits').createIndex({ status: 1, createdAt: -1 }),
            db.collection('deposits').createIndex({ userId: 1, createdAt: -1 }),
            db.collection('redemptions').createIndex({ status: 1, createdAt: -1 }),
            db.collection('redemptions').createIndex({ userId: 1, createdAt: -1 }),
            db.collection('accountRequests').createIndex({ status: 1, createdAt: -1 }),
            db.collection('accountRequests').createIndex({ userEmail: 1 }),
            db.collection('notifications').createIndex({ target: 1, createdAt: -1 }),
            db.collection('notifications').createIndex({ email: 1, createdAt: -1 }),
            db.collection('games').createIndex({ isActive: 1, isFeatured: -1 }),
            db.collection('payment_methods').createIndex({ isActive: 1 }),
            db.collection('ledger').createIndex({ userId: 1, createdAt: -1 }),
          ]);
        }
      } catch (idxErr) {
        console.warn('Index initialization note:', idxErr.message);
      }

      // 1. Ensure Super Admin and Staff accounts dynamically from environment variables
      const usersCol = db.collection('users');

      const envAdminUser = (process.env.ADMIN_USERNAME || 'admin').trim();
      const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@richroom.com').trim();
      const envAdminPass = (process.env.ADMIN_PASSWORD || '').trim();
      const envStaffPass = (process.env.STAFF_PASSWORD || '').trim();

      if (!envAdminPass) {
        console.warn('[initDb] ADMIN_PASSWORD is not set in environment — super-admin seed/sync is skipped. Set it in .env and restart.');
      } else {
        const adminPasswordHash = await bcrypt.hash(envAdminPass, 10);
        // Always ensure Super Admin account exists with current ENV credentials
        await usersCol.updateOne(
          {
            $or: [
              { username: envAdminUser },
              { email: envAdminEmail },
              { role: ROLES.SUPER_ADMIN },
            ],
          },
          {
            $set: {
              username: envAdminUser,
              email: envAdminEmail,
              passwordHash: adminPasswordHash,
              role: ROLES.SUPER_ADMIN,
              isBanned: false,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              balanceSC: 50000.0,
              balanceGC: 10000000,
              kycStatus: 'approved',
              vipTier: 'Rich Room VIP',
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      if (!envStaffPass) {
        console.warn('[initDb] STAFF_PASSWORD is not set — default staff accounts are not synced. Set STAFF_PASSWORD in .env and restart.');
      } else {
        const staffPasswordHash = await bcrypt.hash(envStaffPass, 10);
        // Ensure staff roles exist
        await usersCol.updateOne(
          { username: 'financemanager' },
          {
            $set: {
              username: 'financemanager',
              email: (process.env.STAFF_FINANCE_EMAIL || 'finance@richroom.games').trim(),
              passwordHash: staffPasswordHash,
              role: ROLES.FINANCIAL_MANAGER,
              balanceSC: 5000.0,
              balanceGC: 500000,
              kycStatus: 'approved',
              vipTier: 'Diamond Elite',
              isBanned: false,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        await usersCol.updateOne(
          { username: 'coinmanager' },
          {
            $set: {
              username: 'coinmanager',
              email: (process.env.STAFF_COINS_EMAIL || 'coins@richroom.games').trim(),
              passwordHash: staffPasswordHash,
              role: ROLES.COIN_MANAGER,
              balanceSC: 2500.0,
              balanceGC: 250000,
              kycStatus: 'approved',
              vipTier: 'Gold Titan',
              isBanned: false,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        await usersCol.updateOne(
          { username: 'chatsupport' },
          {
            $set: {
              username: 'chatsupport',
              email: (process.env.STAFF_SUPPORT_EMAIL || 'support@richroom.games').trim(),
              passwordHash: staffPasswordHash,
              role: ROLES.CHAT_SUPPORT,
              balanceSC: 1000.0,
              balanceGC: 100000,
              kycStatus: 'approved',
              vipTier: 'Silver Cyber',
              isBanned: false,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      }

    // 2. Ensure Games catalog
    const gamesCol = db.collection('games');
    const existingGamesCount = await gamesCol.countDocuments({});

    if (existingGamesCount === 0) {
      console.log('Seeding curated games catalog for Rich Room...');
      const defaultGames = [
        {
          id: 'panda-777-slots',
          title: 'Panda 777 Cyber Slots',
          category: 'slots',
          isInternal: true,
          rtp: 98.4,
          volatility: 'Medium-High',
          rating: 4.9,
          badge: 'HOT MASCOT',
          image: '/images/games/panda-slots.png',
          fallbackImage: '/images/vegas-777.svg',
          description: 'Spin the reels with the Cyber Panda mascot! Neon wild multipliers, scatter bonuses, and massive cyber jackpots.',
          minBet: 1,
          maxBet: 100,
          jackpot: 125000,
          active: true,
          priority: 1,
        },
        {
          id: 'cyber-matrix-crash',
          title: 'Cyber Matrix Crash',
          category: 'crash',
          isInternal: true,
          rtp: 99.0,
          volatility: 'Dynamic',
          rating: 4.95,
          badge: 'FEATURED',
          image: '/images/neon-crash.svg',
          description: 'Rocket through the cyber matrix! Multiply your credits up to 1000x and cash out before the quantum breach!',
          minBet: 0.5,
          maxBet: 500,
          active: true,
          priority: 2,
        },
        {
          id: 'ultra-panda',
          title: 'Ultra Panda',
          category: 'sweeps',
          isInternal: false,
          platform: 'Ultra Panda Web',
          playUrl: 'https://ultrapanda.mobi',
          rtp: 97.8,
          rating: 4.9,
          badge: 'TOP CHOICE',
          image: '/images/ultra-panda.svg',
          description: 'The legendary Ultra Panda platform. High-octane fish games, slot machines, and community jackpots.',
          active: true,
          priority: 3,
        },
        {
          id: 'fire-kirin',
          title: 'Fire Kirin',
          category: 'fish',
          isInternal: false,
          platform: 'Fire Kirin App',
          playUrl: 'http://firekirin.xyz:8580',
          rtp: 97.5,
          rating: 4.88,
          badge: 'FISH KING',
          image: '/images/fire-kirin.svg',
          description: 'Classic arcade fish table action with boss dragons, lightning cannons, and massive multi-kills.',
          active: true,
          priority: 4,
        },
        {
          id: 'orion-stars',
          title: 'Orion Stars',
          category: 'sweeps',
          isInternal: false,
          platform: 'Orion Stars Web',
          playUrl: 'http://orionstars.vip:8580',
          rtp: 98.1,
          rating: 4.92,
          badge: 'POPULAR',
          image: '/images/orion-stars.svg',
          description: 'The golden standard in online sweeps reels, fish tables, and keno games.',
          active: true,
          priority: 5,
        },
        {
          id: 'game-vault',
          title: 'Game Vault 999',
          category: 'sweeps',
          isInternal: false,
          platform: 'Game Vault',
          playUrl: 'https://download.gamevault999.com',
          rtp: 97.6,
          rating: 4.85,
          badge: 'HIGH PAYOUT',
          image: '/images/game-vault.svg',
          description: 'Top-tier graphics and explosive bonus rounds with thousands of concurrent players.',
          active: true,
          priority: 6,
        },
        {
          id: 'milky-way',
          title: 'Milky Way',
          category: 'sweeps',
          isInternal: false,
          platform: 'Milky Way App',
          playUrl: 'http://milkywayapp.xyz',
          rtp: 97.4,
          rating: 4.8,
          badge: 'TRENDING',
          image: '/images/milky-way.svg',
          description: 'Stellar slot adventures and cosmic fish hunting tables.',
          active: true,
          priority: 7,
        },
        {
          id: 'juwa-777',
          title: 'Juwa 777',
          category: 'slots',
          isInternal: false,
          platform: 'Juwa Online',
          playUrl: 'https://m.juwa777.com',
          rtp: 97.9,
          rating: 4.86,
          badge: 'CLASSIC',
          image: '/images/juwa-777.svg',
          description: 'Exciting fast-paced sweeps with high volatility and instant features.',
          active: true,
          priority: 8,
        },
        {
          id: 'cyber-blackjack',
          title: 'Cyber Neon Blackjack',
          category: 'table',
          isInternal: true,
          rtp: 99.5,
          rating: 4.9,
          badge: 'TABLE VIP',
          image: '/images/vegas-blackjack.svg',
          description: 'High-stakes cyber blackjack table. Blackjack pays 3:2, dealer stands on 17.',
          minBet: 5,
          maxBet: 500,
          active: true,
          priority: 9,
        },
        {
          id: 'neon-roulette',
          title: 'Neon Cyber Roulette',
          category: 'table',
          isInternal: true,
          rtp: 97.3,
          rating: 4.85,
          badge: 'CASINO ROYAL',
          image: '/images/royal-roulette.svg',
          description: 'Glowing futuristic roulette wheel with straight bets, colors, dozens, and cyber audio.',
          minBet: 1,
          maxBet: 250,
          active: true,
          priority: 10,
        },
      ];

      await gamesCol.insertMany(defaultGames);
    }

    // 3. Ensure Default Payment Methods
    const methodsCol = db.collection('payment_methods');
    const existingMethodsCount = await methodsCol.countDocuments({});

    if (existingMethodsCount === 0) {
      console.log('Seeding initial payment gateways for Rich Room...');
      const defaultMethods = [
        {
          methodId: 'cashapp',
          name: 'Cash App',
          icon: 'DollarSign',
          tag: '$RichRoomHub',
          displayName: 'Cash App Pay',
          qrCodeUrl: '/images/qr-cashapp.png',
          instructions: 'Send payment with your player username in the note. Instant auto-credit upon verification.',
          minDeposit: 10,
          maxDeposit: 5000,
          minWithdrawal: 25,
          maxWithdrawal: 3000,
          active: true,
          badge: 'MOST POPULAR (INSTANT)',
        },
        {
          methodId: 'zelle',
          name: 'Zelle',
          icon: 'Zap',
          tag: 'pay@richroom.games',
          displayName: 'Zelle Direct',
          instructions: 'Send via Zelle to pay@richroom.games. Zero fees, instant bank settlement.',
          minDeposit: 20,
          maxDeposit: 5000,
          minWithdrawal: 50,
          maxWithdrawal: 4000,
          active: true,
          badge: 'ZERO FEES',
        },
        {
          methodId: 'chime',
          name: 'Chime',
          icon: 'CreditCard',
          tag: '$RichRoom',
          displayName: 'Chime Spot',
          instructions: 'Send Chime to $RichRoom. Include your username.',
          minDeposit: 10,
          maxDeposit: 2500,
          minWithdrawal: 25,
          maxWithdrawal: 2500,
          active: true,
          badge: 'FAST CASHOUT',
        },
        {
          methodId: 'crypto',
          name: 'Bitcoin / USDT',
          icon: 'Bitcoin',
          tag: '1RichRoomCyberWalletBTC777',
          displayName: 'Crypto / BTC / USDT (TRC20)',
          instructions: 'Transfer BTC or USDT. Payouts processed within 5-15 minutes.',
          minDeposit: 20,
          maxDeposit: 10000,
          minWithdrawal: 50,
          maxWithdrawal: 10000,
          active: true,
          badge: '10% EXTRA BONUS',
        },
        {
          methodId: 'applepay',
          name: 'Apple Pay / Card',
          icon: 'Smartphone',
          tag: 'apple@richroom.games',
          displayName: 'Apple Pay',
          instructions: 'Use Apple Pay via SMS or iMessage request for fast deposit.',
          minDeposit: 15,
          maxDeposit: 2000,
          minWithdrawal: 25,
          maxWithdrawal: 2000,
          active: true,
          badge: '1-TAP PAY',
        },
      ];

      await methodsCol.insertMany(defaultMethods);
    }

    console.log('Database initialization check completed successfully.');
    isDbInitialized = true;
    return true;
  } catch (err) {
    console.error('Error during database initialization:', err);
    return false;
  }
  })();
  return initPromise;
}
