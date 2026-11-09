'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Standalone Player Views for 0ms instant tab switching
import DepositView from '@/components/player/DepositView';
import WithdrawView from '@/components/player/WithdrawView';
import SpinWheelView from '@/components/player/SpinWheelView';
import ReferralView from '@/components/player/ReferralView';
import PromotionsView from '@/components/player/PromotionsView';
import DownloadAppView from '@/components/player/DownloadAppView';
import HowToPlayView from '@/components/player/HowToPlayView';
import CashoutRulesView from '@/components/player/CashoutRulesView';

// Navigation Components
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';

// Hub Sections
import CyberHeroBanner from '@/components/hub/CyberHeroBanner';
import CyberLatestWinsTicker from '@/components/hub/CyberLatestWinsTicker';
import PlayerGameCredentialsHub from '@/components/hub/PlayerGameCredentialsHub';
import GameCard from '@/components/hub/GameCard';

// Modals
import AuthModal from '@/components/modals/AuthModal';
import WalletModal from '@/components/modals/WalletModal';
import GameRequestModal from '@/components/modals/GameRequestModal';
import ExternalGameModal from '@/components/modals/ExternalGameModal';
import SubscriptionPromoModal from '@/components/modals/SubscriptionPromoModal';
import LoadCoinsModal from '@/components/modals/LoadCoinsModal';
import KycModal from '@/components/modals/KycModal';
import { diffSet, areEqual, cleanGameTitle } from '@/lib/fastDiff';
import { gamesCacheKey, readGamesFromSession, writeGamesToSession, readInitialGamesCatalog } from '@/lib/gamesClientCache';
import { writeSessionCache, CACHE_KEYS } from '@/lib/playerDataCache';
import { readCachedGameAccountSeeds } from '@/lib/gameAccountsClientCache';
import { buildGameAccountIndex, gameHasReadyAccount, gameHasPendingAccount } from '@/lib/gameAccountMatch';
import { broadcastPlayerLogout } from '@/lib/playerSessionCache';
import { subscribePlayerAccountsSync, broadcastPlayerAccountsUpdated } from '@/lib/playerAccountSync';
import { broadcastStaffNewRequest } from '@/lib/staffAlertsSync';
import BonusAlertToast from '@/components/common/BonusAlertToast';
import PushNotificationManager from '@/components/common/PushNotificationManager';
import DailySpinWheelModal from '@/components/common/DailySpinWheelModal';
import { fetchCurrentUser, getCachedUser, setCachedUser } from '@/lib/authClient';
import { fetchJsonQuick, parseResponseJson } from '@/lib/fetchWithTimeout';
import { loadPlayerGameAccountsForEmail } from '@/lib/playerGameAccountsClient';

function tabNeedsGamesCatalog(tab) {
  return tab === 'lobby' || tab === 'games' || tab === 'my-game-ids';
}

// Games
import Panda777SlotsModal from '@/components/games/Panda777SlotsModal';
import CyberCrashModal from '@/components/games/CyberCrashModal';

import {
  Gamepad2,
  Sparkles,
  Search,
  Filter,
  Flame,
  KeyRound,
  ShieldCheck,
  Zap,
  Gift,
  ArrowRight,
  Trophy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

export default function HomePage({ initialTab = 'lobby' }) {
  const router = useRouter();
  const pathname = usePathname();

  const getTabFromPath = (path) => {
    if (!path || path === '/') return 'lobby';
    const clean = path.replace(/^\//, '').split('?')[0];
    return clean || 'lobby';
  };

  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab && initialTab !== 'lobby') return initialTab;
    if (typeof window !== 'undefined') {
      const fromUrl = getTabFromPath(window.location.pathname);
      if (fromUrl && fromUrl !== 'admin') return fromUrl;
    }
    return 'lobby';
  });

  const handleSelectTab = (tabId, targetPath) => {
    const finalTab = tabId || (targetPath === '/' ? 'lobby' : targetPath?.replace(/^\//, '')) || 'lobby';
    const finalPath = targetPath || (finalTab === 'lobby' ? '/' : `/${finalTab}`);
    setActiveTab(finalTab);
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== finalPath) {
        window.history.pushState({ tab: finalTab }, '', finalPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const current = getTabFromPath(window.location.pathname);
        setActiveTab(current);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // User & UI States (SSR-safe initial states to prevent hydration mismatch)
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Modals
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [walletModal, setWalletModal] = useState({ open: false, tab: 'deposit' });
  const [gameRequestModal, setGameRequestModal] = useState({ open: false, initialGame: null });
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);
  const [activeExternalGame, setActiveExternalGame] = useState(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [loadCoinsModal, setLoadCoinsModal] = useState({ open: false, game: null });

  // In-House playable game modal states
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [crashOpen, setCrashOpen] = useState(false);

  // Games & Filter state with curated fallback (0ms SSR matching)
  const [games, setGames] = useState(() => readInitialGamesCatalog('all', ''));
  const [searchTerm, setSearchTerm] = useState('');
  const category = 'all';
  const [loadingGames, setLoadingGames] = useState(
    () => readInitialGamesCatalog('all', '').length === 0
  );
  const [userGameAccounts, setUserGameAccounts] = useState(() => {
    const email = getCachedUser()?.email;
    if (!email) return [];
    return readCachedGameAccountSeeds(email).active;
  });
  const [pendingAccountRequests, setPendingAccountRequests] = useState(() => {
    const email = getCachedUser()?.email;
    if (!email) return [];
    return readCachedGameAccountSeeds(email).pending;
  });
  const [requestToast, setRequestToast] = useState(null);
  const userEmailRef = useRef(null);
  const accountsReadyInitRef = useRef(false);
  const prevPendingTitlesRef = useRef(new Set());

  const titleKey = (t) => cleanGameTitle(t || '').toLowerCase().trim();

  const loadUserGameAccounts = useCallback(async (userEmail) => {
    if (!userEmail) {
      setUserGameAccounts([]);
      setPendingAccountRequests([]);
      prevPendingTitlesRef.current = new Set();
      accountsReadyInitRef.current = false;
      return;
    }
    try {
      const { active, pending, ok } = await loadPlayerGameAccountsForEmail(userEmail);
      if (!ok) return;

      const pendingTitles = new Set(pending.map((r) => titleKey(r.gameTitle)));
      if (accountsReadyInitRef.current) {
        for (const key of prevPendingTitlesRef.current) {
          if (!pendingTitles.has(key)) {
            const acc = active.find((a) => titleKey(a.gameTitle) === key);
            if (acc) {
              playTune('bell', 0.65);
              setRequestToast({
                type: 'success',
                title: 'Game ID Ready! 🎮',
                message: `Your ${acc.gameTitle} credentials are ready. Username: ${acc.username}`,
              });
              setTimeout(() => setRequestToast(null), 8000);
            }
          }
        }
      } else {
        accountsReadyInitRef.current = true;
      }
      prevPendingTitlesRef.current = pendingTitles;

      diffSet(setUserGameAccounts, active);
      diffSet(setPendingAccountRequests, pending);
    } catch {}
  }, []);

  const gameAccountIndex = useMemo(
    () => buildGameAccountIndex(userGameAccounts, pendingAccountRequests),
    [userGameAccounts, pendingAccountRequests]
  );

  // Load User Session (Deduplicated via authClient)
  const loadUser = async () => {
    try {
      const data = await fetchCurrentUser();
      if (data?.authenticated && data?.user) {
        diffSet(setUser, data.user);
        loadUserGameAccounts(data.user.email);
      } else {
        setUser(null);
        diffSet(setUserGameAccounts, []);
        diffSet(setPendingAccountRequests, []);
      }
    } catch {
      setUser(null);
      diffSet(setUserGameAccounts, []);
      diffSet(setPendingAccountRequests, []);
    }
  };

  // Load Games
  const loadGames = async () => {
    const key = gamesCacheKey(category, searchTerm);
    const cached = readGamesFromSession(key);
    if (cached?.length) {
      diffSet(
        setGames,
        cached.map((g) => ({ ...g, title: cleanGameTitle(g.title) }))
      );
      setLoadingGames(false);
    } else {
      setLoadingGames(true);
    }
    try {
      let url = '/api/games';
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (searchTerm) params.append('search', searchTerm);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const data = await parseResponseJson(res);
      if (data.success && data.games) {
        const sanitized = data.games.map((g) => ({
          ...g,
          title: cleanGameTitle(g.title),
        }));
        diffSet(setGames, sanitized);
        writeGamesToSession(key, sanitized);
        writeSessionCache(CACHE_KEYS.GAMES_LIST, sanitized);
        try {
          if (category === 'all' && !searchTerm) {
            localStorage.setItem('pp_games_cache', JSON.stringify(sanitized));
          }
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    // 0ms instant hydration from client cache
    const cachedUser = getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
      loadUserGameAccounts(cachedUser.email);
    }
    try {
      const rawGames = localStorage.getItem('pp_games_cache') || sessionStorage.getItem('pp_games_cache');
      if (rawGames) {
        const parsed = JSON.parse(rawGames);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGames(parsed);
        }
      }
    } catch {}

    loadUser();

    const handleUserSync = (e) => {
      if (e.detail) {
        setUser((prev) => {
          if (areEqual(prev, e.detail)) return prev;
          return e.detail;
        });
        if (e.detail.email) {
          loadUserGameAccounts(e.detail.email);
        }
      }
    };

    const handleAccountSync = () => {
      const email = userEmailRef.current;
      if (email) loadUserGameAccounts(email);
      else loadUser();
    };

    const unsubscribeAccounts = subscribePlayerAccountsSync((detail) => {
      handleAccountSync();
      if (detail?.status === 'READY' && detail?.gameTitle) {
        playTune('bell', 0.5);
      }
    });

    const handleFocus = () => {
      if (!document.hidden) {
        loadUser();
        if (tabNeedsGamesCatalog(activeTab)) loadGames();
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'pp_games_updated_at') {
        loadGames();
      }
    };

    let bc = null;
    try {
      bc = new BroadcastChannel('admin_alerts_channel');
      bc.onmessage = (event) => {
        if (event?.data?.type === 'GAMES_UPDATED') {
          loadGames();
        }
      };
    } catch {}

    const handleInstant = () => {
      handleAccountSync();
      loadUser();
    };

    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('accountRequestUpdated', handleAccountSync);
    window.addEventListener('paradise-instant-sync', handleInstant);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      unsubscribeAccounts();
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('accountRequestUpdated', handleAccountSync);
      window.removeEventListener('paradise-instant-sync', handleInstant);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleFocus);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, [loadUserGameAccounts]);

  useEffect(() => {
    userEmailRef.current = user?.email || null;
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    const scope = user.userId || user.id || user.email;
    Promise.allSettled([
      fetchJsonQuick('/api/daily-spin', { credentials: 'include' }).then(({ data: d }) => {
        if (d?.success) {
          writeSessionCache(CACHE_KEYS.SPIN_STATUS, {
            canSpin: Boolean(d.canSpin),
            availableSpins: d.availableSpins || 0,
          });
        }
      }),
      fetchJsonQuick('/api/promotions', { credentials: 'include' }).then(({ data: d }) => {
        if (d?.success && Array.isArray(d.promotions)) {
          writeSessionCache(CACHE_KEYS.PROMOTIONS, d.promotions);
        }
      }),
      fetchJsonQuick('/api/affiliates', { credentials: 'include' }).then(({ data: d }) => {
        if (d?.success && d.stats && scope) {
          writeSessionCache(CACHE_KEYS.AFFILIATE_STATS, d.stats, scope);
        }
      }),
    ]).catch(() => {});
  }, [user?.email, user?.userId, user?.id]);

  useEffect(() => {
    if (user?.email) {
      loadUserGameAccounts(user.email);
      const pollMs = pendingAccountRequests.length > 0 ? 2500 : 10000;
      const interval = setInterval(() => {
        if (!document.hidden) loadUserGameAccounts(user.email);
      }, pollMs);
      return () => clearInterval(interval);
    }
  }, [user?.email, pendingAccountRequests.length, loadUserGameAccounts]);

  useEffect(() => {
    if (!tabNeedsGamesCatalog(activeTab)) return;
    loadGames();
  }, [category, searchTerm, activeTab]);

  useEffect(() => {
    if (activeTab !== 'games' && activeTab !== 'lobby') return;
    const email = userEmailRef.current || getCachedUser()?.email;
    if (email) loadUserGameAccounts(email);
  }, [activeTab, loadUserGameAccounts]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setUserGameAccounts([]);
    setPendingAccountRequests([]);
    prevPendingTitlesRef.current = new Set();
    accountsReadyInitRef.current = false;
    broadcastPlayerLogout();
  };

  const handlePlayGame = (game) => {
    if (!user) {
      setAuthModal({ open: true, tab: 'login' });
      return;
    }

    if (game.id === 'panda-777-slots') {
      setSlotsOpen(true);
    } else if (game.id === 'cyber-matrix-crash') {
      setCrashOpen(true);
    } else {
      setActiveExternalGame(game);
    }
  };

  const handleRequestGame = async (game = null) => {
    if (!user) {
      setAuthModal({ open: true, tab: 'login' });
      return;
    }

    // If no specific game passed (e.g. general button), open selector modal
    if (!game || !game.title) {
      setGameRequestModal({ open: true, initialGame: null });
      return;
    }

    const gameTitle = game.title;
    const cleanTitle = (gameTitle || '').toLowerCase().trim();

    // 1. Guard against duplicate if credentials already exist
    const existing = userGameAccounts.find((a) => {
      const t = (a.gameTitle || '').toLowerCase().trim();
      return t === cleanTitle || (cleanTitle && t.includes(cleanTitle)) || (t && cleanTitle.includes(t));
    });

    if (existing) {
      setActiveExternalGame(game);
      setRequestToast({
        type: 'success',
        title: 'ID Already Created! 🔑',
        message: `Your credentials for ${gameTitle} are already generated (Username: ${existing.username}). View them below.`,
      });
      setTimeout(() => setRequestToast(null), 5000);
      return;
    }

    // 2. Guard against duplicate if request is already pending
    const existingPending = pendingAccountRequests.find((p) => {
      const t = (p.gameTitle || '').toLowerCase().trim();
      return t === cleanTitle || (cleanTitle && t.includes(cleanTitle)) || (t && cleanTitle.includes(t));
    });

    if (existingPending) {
      setRequestToast({
        type: 'info',
        title: 'Request Already Pending ⏳',
        message: `Your credentials request for ${gameTitle} is already in queue with staff. Please wait.`,
      });
      setTimeout(() => setRequestToast(null), 5000);
      return;
    }

    // Direct 1-click submission for the game
    setActiveExternalGame(null);

    // Optimistically update pendingAccountRequests so the game card immediately shows PENDING!
    setPendingAccountRequests((prev) => [
      ...prev.filter((p) => (p.gameTitle || '').toLowerCase().trim() !== cleanTitle),
      { gameTitle, status: 'PENDING', createdAt: new Date() },
    ]);
    prevPendingTitlesRef.current.add(titleKey(gameTitle));
    accountsReadyInitRef.current = true;

    // 0ms Optimistic UI update: Instantly show success toast and play audio
    playTune('bell', 0.6);
    setRequestToast({
      type: 'success',
      title: 'ID Request Sent! 🎯',
      message: `Your request for ${gameTitle} credentials has been sent to Admin. Staff will issue your ID shortly!`,
    });

    try {
      const res = await fetch('/api/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle,
          platform: game.platform || gameTitle,
          requestType: 'ACCOUNT_CREATION',
          transferAmount: 0,
          userEmail: user.email,
          userName: user.username,
          userId: user.userId || user.id || user._id,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {

        broadcastStaffNewRequest({
          requestId: data.requestId,
          request: data.request,
          gameTitle,
          userName: user.username,
          userEmail: user.email,
        });

        loadUserGameAccounts(user.email);
        broadcastPlayerAccountsUpdated({ gameTitle, status: 'PENDING' });
      } else {
        if (data.alreadyHasAccount) {
          loadUserGameAccounts(user.email);
          setActiveExternalGame(game);
        } else if (data.isPending) {
          // Keep the pending state
        } else {
          // Revert optimistic pending state on failure
          setPendingAccountRequests((prev) =>
            prev.filter((p) => (p.gameTitle || '').toLowerCase().trim() !== cleanTitle)
          );
        }
        setRequestToast({
          type: 'info',
          title: data.alreadyHasAccount ? 'ID Ready' : 'Request Notice',
          message: data.message || `Unable to request ID for ${gameTitle}.`,
        });
      }
    } catch {
      setRequestToast({
        type: 'error',
        title: 'Connection Issue',
        message: 'Could not connect to server. Please try again.',
      });
    }

    setTimeout(() => {
      setRequestToast((curr) => (curr ? null : curr));
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col">
      {/* Collapsible Sidebar */}
      <CyberSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenWallet={(tab) => handleSelectTab(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? 'withdraw' : 'deposit', tab === 'withdraw' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => handleRequestGame()}
        onOpenChat={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-live-chat'));
            if (typeof window.openLiveChat === 'function') window.openLiveChat();
          }
        }}
        onOpenSpinWheel={() => handleSelectTab('spin-wheel', '/spin-wheel')}
        onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
      />

      {/* Main Content Layout */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
          onOpenWallet={(tab) => handleSelectTab(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? 'withdraw' : 'deposit', tab === 'withdraw' ? '/withdraw' : '/deposit')}
          onOpenSpinWheel={() => handleSelectTab('spin-wheel', '/spin-wheel')}
          onLogout={handleLogout}
        />

        {/* Page Inner Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
          {activeTab === 'deposit' ? (
            <DepositView
              isEmbedded={true}
              onSelectTab={handleSelectTab}
              seedReadyAccounts={userGameAccounts}
            />
          ) : activeTab === 'withdraw' ? (
            <WithdrawView
              isEmbedded={true}
              onSelectTab={handleSelectTab}
              seedReadyAccounts={userGameAccounts}
            />
          ) : activeTab === 'spin-wheel' ? (
            <SpinWheelView user={user} onSelectTab={handleSelectTab} />
          ) : activeTab === 'referral' ? (
            <ReferralView user={user} onOpenAuth={(mode) => setAuthModal({ open: true, tab: mode })} />
          ) : activeTab === 'promotions' ? (
            <PromotionsView onSelectTab={handleSelectTab} />
          ) : activeTab === 'download-app' ? (
            <DownloadAppView onSelectTab={handleSelectTab} />
          ) : activeTab === 'how-to-play' ? (
            <HowToPlayView onSelectTab={handleSelectTab} />
          ) : activeTab === 'rules' ? (
            <CashoutRulesView onSelectTab={handleSelectTab} />
          ) : activeTab === 'my-game-ids' ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-heading font-black text-white flex items-center gap-2">
                    <KeyRound className="text-[var(--neon-cyan)]" size={26} />
                    <span>MY GAME CREDENTIALS & LOGINS</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Manage all your active game accounts, copy passwords, and request new platform IDs
                  </p>
                </div>
                <button
                  onClick={() => handleRequestGame()}
                  className="cyber-btn-cyan text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Gamepad2 size={16} />
                  <span>Request New Game ID</span>
                </button>
              </div>
              <PlayerGameCredentialsHub
                user={user}
                games={games}
                seedReadyAccounts={userGameAccounts}
                seedPendingRequests={pendingAccountRequests}
                onRequestNewGame={() => handleRequestGame()}
                onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
              />
            </div>
          ) : activeTab === 'games' ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Games Catalog Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy size={24} className="text-[var(--neon-cyan)]" />
                    <h1 className="font-heading font-black text-2xl sm:text-3xl text-white">
                      ALL PLAYABLE PLATFORMS & CYBER SLOTS
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Play verified in-house web sweeps games or access external official platforms
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="Search Ultra Panda, Fire Kirin..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#060917]/95 border border-[var(--neon-cyan)]/30 rounded-xl !pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--neon-cyan)] focus:shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all font-sans"
                  />
                </div>
              </div>

              <p className="text-sm font-heading font-bold text-white">
                All Available Games
                {!loadingGames && games.length > 0 && (
                  <span className="text-slate-500 font-mono font-normal text-xs ml-1.5">({games.length})</span>
                )}
              </p>

              {/* Games Grid */}
              {loadingGames && games.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-[var(--neon-cyan)]/20 bg-[#0B0F22]/80 p-3 space-y-2 animate-pulse shadow-lg"
                    >
                      <div className="h-28 bg-slate-800/60 rounded-lg" />
                      <div className="h-4 bg-slate-700/60 rounded w-3/4" />
                      <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                      <div className="h-9 bg-cyan-950/40 border border-cyan-500/20 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : games.length === 0 ? (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <Gamepad2 size={36} className="mx-auto text-slate-600" />
                  <p className="font-heading text-sm text-white">No games matched your search.</p>
                  <p className="text-xs">Clear the search box to see every game again.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {games.map((g) => {
                    const hasAcc = gameHasReadyAccount(g.title, gameAccountIndex);
                    const isPend = gameHasPendingAccount(g.title, gameAccountIndex);

                    return (
                      <GameCard
                        key={g.id}
                        game={g}
                        hasAccount={hasAcc}
                        isPending={isPend}
                        onPlay={handlePlayGame}
                        onViewCredentials={handlePlayGame}
                        onRequestAccount={handleRequestGame}
                        onLoadCoins={(game) => setLoadCoinsModal({ open: true, game })}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Lobby View */
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Latest wins — top of lobby */}
              <CyberLatestWinsTicker />

              {/* Hero Banner */}
              <CyberHeroBanner
                user={user}
                onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
                onOpenWallet={(tab) => handleSelectTab(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? 'withdraw' : 'deposit', tab === 'withdraw' ? '/withdraw' : '/deposit')}
                onOpenGameRequest={() => handleRequestGame()}
              />

              {/* Player Game Credentials & Request Station */}
              <PlayerGameCredentialsHub
                user={user}
                games={games}
                seedReadyAccounts={userGameAccounts}
                seedPendingRequests={pendingAccountRequests}
                onRequestNewGame={() => handleRequestGame()}
                onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
              />

              {/* Game Catalog Station */}
              <div className="space-y-6 pt-4">
                {/* Header & Filters */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Gamepad2 size={20} className="text-[var(--neon-cyan)]" />
                      <h2 className="font-heading font-black text-2xl text-white">
                        VERIFIED GAMES & PLATFORMS
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Play in-house cyber originals or access popular external sweeps platforms
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <input
                      type="text"
                      placeholder="Search Ultra Panda, Fire Kirin..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#060917]/95 border border-[var(--neon-cyan)]/30 rounded-xl !pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--neon-cyan)] focus:shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all font-sans"
                    />
                  </div>
                </div>

                <p className="text-sm font-heading font-bold text-white">
                  All Available Games
                  {!loadingGames && games.length > 0 && (
                    <span className="text-slate-500 font-mono font-normal text-xs ml-1.5">({games.length})</span>
                  )}
                </p>

                {/* Games Grid */}
                {loadingGames && games.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-[var(--neon-cyan)]/20 bg-[#0B0F22]/80 p-4 space-y-3 animate-pulse shadow-lg"
                      >
                        <div className="h-44 bg-slate-800/60 rounded-xl" />
                        <div className="h-4 bg-slate-700/60 rounded w-3/4" />
                        <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                        <div className="h-9 bg-cyan-950/40 border border-cyan-500/20 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : games.length === 0 ? (
                  <div className="py-16 text-center space-y-2 text-slate-400">
                    <Gamepad2 size={36} className="mx-auto text-slate-600" />
                    <p className="font-heading text-sm text-white">No games matched your search.</p>
                    <p className="text-xs">Clear the search box to see every game again.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {games.map((g) => {
                      const hasAcc = gameHasReadyAccount(g.title, gameAccountIndex);
                      const isPend = gameHasPendingAccount(g.title, gameAccountIndex);

                      return (
                        <GameCard
                          key={g.id}
                          game={g}
                          hasAccount={hasAcc}
                          isPending={isPend}
                          onPlay={handlePlayGame}
                          onViewCredentials={handlePlayGame}
                          onRequestAccount={handleRequestGame}
                          onLoadCoins={(game) => setLoadCoinsModal({ open: true, game })}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Platform Trust Highlights */}
              <div className="my-12 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                    <Zap size={20} />
                  </div>
                  <h3 className="font-heading font-bold text-base text-white">
                    Under 5-Minute Cashouts
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enjoy lightning redemptions directly into Cash App, Chime, Zelle, or Bitcoin with zero hidden fees.
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30 flex items-center justify-center font-bold">
                    <KeyRound size={20} />
                  </div>
                  <h3 className="font-heading font-bold text-base text-white">
                    1-Click Game Credentials
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Staff issues individual logins for Ultra Panda, Fire Kirin, and Orion Stars with real-time balance loading.
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--neon-purple)]/20 text-[var(--neon-purple-light)] border border-[var(--neon-purple)]/30 flex items-center justify-center font-bold">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="font-heading font-bold text-base text-white">
                    100% US Legal Sweepstakes
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Operated strictly under United States promotional sweepstakes frameworks with verified cryptographic fairness.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <CyberFooter />
      </div>

      {/* Mobile Bottom Dock */}
      <CyberMobileBottomNav
        user={user}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
        onOpenWallet={(tab) => handleSelectTab(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? 'withdraw' : 'deposit', tab === 'withdraw' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => handleRequestGame()}
        onOpenSpinWheel={() => handleSelectTab('spin-wheel', '/spin-wheel')}
      />

      {/* Daily Lucky Spin Wheel Modal */}
      <DailySpinWheelModal
        isOpen={spinWheelOpen}
        onClose={() => setSpinWheelOpen(false)}
        user={user}
        onBalanceUpdated={loadUser}
      />


      {/* Modals */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, tab: 'login' })}
        initialTab={authModal.tab}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          loadUser();
        }}
      />

      <WalletModal
        isOpen={walletModal.open}
        onClose={() => setWalletModal({ open: false, tab: 'deposit' })}
        initialTab={walletModal.tab}
        user={user}
        onBalanceUpdated={loadUser}
      />

      <GameRequestModal
        isOpen={gameRequestModal.open}
        onClose={() => setGameRequestModal({ open: false, initialGame: null })}
        initialGame={gameRequestModal.initialGame}
        catalogGames={games}
        user={user}
        onRequestCreated={loadUser}
        onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
      />


      <ExternalGameModal
        isOpen={!!activeExternalGame}
        onClose={() => setActiveExternalGame(null)}
        game={activeExternalGame}
        user={user}
        userGameAccounts={userGameAccounts}
        pendingAccountRequests={pendingAccountRequests}
        onRequestAccount={handleRequestGame}
        onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
      />

      {/* Playable In-House Game Modals */}
      <Panda777SlotsModal
        isOpen={slotsOpen}
        onClose={() => setSlotsOpen(false)}
        user={user}
        onBalanceUpdated={loadUser}
      />

      <CyberCrashModal
        isOpen={crashOpen}
        onClose={() => setCrashOpen(false)}
        user={user}
        onBalanceUpdated={loadUser}
      />

      {/* Bonus Alerts Toast */}
      <BonusAlertToast />

      {/* Promos & Broadcasts Modal */}
      <SubscriptionPromoModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        user={user}
        onSubscribed={loadUser}
      />

      {/* KYC Verification Modal */}
      <KycModal
        isOpen={kycOpen}
        onClose={() => setKycOpen(false)}
        user={user}
        onSuccess={loadUser}
      />

      {/* Sweepstakes Coin Allotment Modal */}
      <LoadCoinsModal
        isOpen={loadCoinsModal.open}
        onClose={() => setLoadCoinsModal({ open: false, game: null })}
        game={loadCoinsModal.game}
        user={user}
        onSuccess={loadUser}
        onOpenDeposit={() => router.push('/deposit')}
      />

      {/* 1-Click Game ID Request Toast Notification */}
      {requestToast && (
        <div className="fixed top-24 right-4 sm:right-8 z-[100] max-w-sm w-full animate-slideInRight">
          <div
            className={`p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl flex items-start gap-3 transition-all ${
              requestToast.type === 'success'
                ? 'bg-[#0B1528]/95 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                : requestToast.type === 'error'
                ? 'bg-[#200A12]/95 border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                : requestToast.type === 'loading'
                ? 'bg-[#0E0C26]/95 border-cyan-500/60 shadow-[0_0_30px_rgba(0,240,255,0.35)]'
                : 'bg-[#18112C]/95 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
              {requestToast.type === 'success' && <CheckCircle2 size={22} className="text-emerald-400" />}
              {requestToast.type === 'loading' && <RefreshCw size={20} className="text-cyan-400 animate-spin" />}
              {requestToast.type === 'error' && <AlertCircle size={22} className="text-rose-400" />}
              {requestToast.type === 'info' && <KeyRound size={20} className="text-amber-400" />}
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                {requestToast.title}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{requestToast.message}</p>
            </div>
            <button
              onClick={() => setRequestToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
