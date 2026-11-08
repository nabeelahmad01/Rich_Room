'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import GameCard from '@/components/hub/GameCard';
import AuthModal from '@/components/modals/AuthModal';
import WalletModal from '@/components/modals/WalletModal';
import GameRequestModal from '@/components/modals/GameRequestModal';
import ExternalGameModal from '@/components/modals/ExternalGameModal';
import Panda777SlotsModal from '@/components/games/Panda777SlotsModal';
import CyberCrashModal from '@/components/games/CyberCrashModal';

import {
  Gamepad2,
  Trophy,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  KeyRound
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';
import { gamesCacheKey, readGamesFromSession, writeGamesToSession } from '@/lib/gamesClientCache';
import { getInitialPlayerUser, writeCachedPlayer, broadcastPlayerLogout } from '@/lib/playerSessionCache';

export default function GamesPage() {
  const router = useRouter();
  const [user, setUser] = useState(getInitialPlayerUser);
  const [games, setGames] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(
    () => typeof window === 'undefined' || !readGamesFromSession(gamesCacheKey(category, search))
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [walletModal, setWalletModal] = useState({ open: false, tab: 'deposit' });
  const [gameRequestModal, setGameRequestModal] = useState({ open: false, initialGame: null });
  const [activeExternalGame, setActiveExternalGame] = useState(null);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [crashOpen, setCrashOpen] = useState(false);

  const [userGameAccounts, setUserGameAccounts] = useState([]);
  const [pendingAccountRequests, setPendingAccountRequests] = useState([]);

  const loadUserGameAccounts = async (userEmail) => {
    if (!userEmail) {
      diffSet(setUserGameAccounts, []);
      diffSet(setPendingAccountRequests, []);
      return;
    }
    try {
      const res = await fetch(`/api/game-accounts?email=${encodeURIComponent(userEmail)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        diffSet(setUserGameAccounts, data.gameAccounts || []);
        diffSet(setPendingAccountRequests, data.pendingRequests || []);
      }
    } catch {}
  };

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        writeCachedPlayer(data.user);
        diffSet(setUser, data.user);
        loadUserGameAccounts(data.user.email);
      } else {
        diffSet(setUser, null);
        diffSet(setUserGameAccounts, []);
        diffSet(setPendingAccountRequests, []);
      }
    } catch {
      diffSet(setUser, null);
      diffSet(setUserGameAccounts, []);
      diffSet(setPendingAccountRequests, []);
    }
  };

  const loadGames = async (isSilent = false) => {
    const key = gamesCacheKey(category, search);
    if (!isSilent) {
      const cached = readGamesFromSession(key);
      if (cached) {
        diffSet(setGames, cached.map((g) => ({ ...g, title: cleanGameTitle(g.title || '') })));
        setLoading(false);
      } else {
        setLoading(true);
      }
    }
    try {
      let url = '/api/games';
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (search) params.append('search', search);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.games) {
        const cleanList = (data.games || []).map(g => ({
          ...g,
          title: cleanGameTitle(g.title || '')
        }));
        diffSet(setGames, cleanList);
        writeGamesToSession(key, cleanList);
      }
    } catch {}
    if (!isSilent) setLoading(false);
  };

  useEffect(() => {
    loadUser();

    const handleAccountSync = () => {
      loadUser();
    };

    const handleUserSync = (e) => {
      if (e.detail) {
        diffSet(setUser, e.detail);
        loadUserGameAccounts(e.detail.email);
      } else {
        diffSet(setUser, null);
        diffSet(setUserGameAccounts, []);
        diffSet(setPendingAccountRequests, []);
      }
    };

    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('accountRequestUpdated', handleAccountSync);
    window.addEventListener('focus', handleAccountSync);
    document.addEventListener('visibilitychange', handleAccountSync);

    return () => {
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('accountRequestUpdated', handleAccountSync);
      window.removeEventListener('focus', handleAccountSync);
      document.removeEventListener('visibilitychange', handleAccountSync);
    };
  }, []);

  useEffect(() => {
    if (user?.email) {
      loadUserGameAccounts(user.email);
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadUserGameAccounts(user.email);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user?.email]);

  useEffect(() => {
    loadGames();
  }, [category, search]);

  const handlePlayGame = (game) => {
    if (!user) {
      setAuthModal({ open: true, tab: 'login' });
      return;
    }
    if (game.id === 'panda-777-slots') setSlotsOpen(true);
    else if (game.id === 'cyber-matrix-crash') setCrashOpen(true);
    else setActiveExternalGame(game);
  };

  const [requestToast, setRequestToast] = useState(null);

  const handleRequestGame = async (game = null) => {
    if (!user) {
      setAuthModal({ open: true, tab: 'login' });
      return;
    }

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

    setRequestToast({
      type: 'loading',
      title: 'Submitting ID Request...',
      message: `Sending credentials request for ${gameTitle} to Admin...`,
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
        playTune('bell', 0.6);
        setRequestToast({
          type: 'success',
          title: 'ID Request Sent! 🎯',
          message: `Your request for ${gameTitle} credentials has been sent to Admin. Staff will issue your ID shortly!`,
        });

        // Instant cross-tab broadcast so admin tab receives alert in 0ms!
        try {
          const ch = new BroadcastChannel('paradise_staff_alerts');
          ch.postMessage({
            type: 'NEW_REQUEST',
            category: 'ACCOUNT_CREATION',
            gameTitle,
            userName: user.username,
            userEmail: user.email,
            timestamp: Date.now(),
          });
          ch.close();
        } catch {}
        try {
          localStorage.setItem('paradise_staff_event', JSON.stringify({
            type: 'NEW_REQUEST',
            category: 'ACCOUNT_CREATION',
            gameTitle,
            userName: user.username,
            time: Date.now(),
          }));
        } catch {}

        loadUserGameAccounts(user.email);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accountRequestUpdated'));
        }
      } else {
        if (data.alreadyHasAccount) {
          loadUserGameAccounts(user.email);
          setActiveExternalGame(game);
        } else if (data.isPending) {
          // Keep pending state
        } else {
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

  const categories = [
    { id: 'all', label: 'All Catalog', icon: '🌟' },
    { id: 'sweeps', label: 'Web Sweeps', icon: '🎰' },
    { id: 'fish', label: 'Fish Arcade', icon: '🐟' },
    { id: 'slots', label: 'Cyber Slots', icon: '⚡' },
    { id: 'crash', label: 'Crash Matrix', icon: '🚀' },
    { id: 'table', label: 'Table VIP', icon: '🃏' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col">
      <CyberSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => handleRequestGame()}
        onOpenChat={() => {}}
        onOpenDailyBonus={() => {}}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'xl:pl-20' : 'xl:pl-64'}`}>
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
          onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
          onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
          onOpenDailyBonus={() => {}}
          onOpenNotifications={() => {}}
          onLogout={() => {
            fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            broadcastPlayerLogout();
          }}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 xl:px-8 py-8 space-y-8 pb-28 xl:pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy size={22} className="text-[var(--neon-cyan)]" />
                <h1 className="font-heading font-black text-2xl md:text-3xl text-white">
                  ALL VERIFIED GAMES & REELS
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Browse official sweepstakes machines, fish hunter tables, and cyber arcade titles
              </p>
            </div>

            <div className="relative w-full md:w-72 min-w-0 shrink">
              <input
                type="search"
                placeholder="Search platforms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="cyber-input games-search-input pl-9 py-2.5"
                autoComplete="off"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* All Available Games Header */}
          <div className="flex items-center gap-2.5 pt-2 pb-1 border-b border-slate-800/80">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_10px_var(--neon-cyan)] animate-pulse"></span>
            <h3 className="font-heading font-black text-sm text-[var(--neon-cyan)] uppercase tracking-wider">
              All Available Games
            </h3>
          </div>

          {/* Grid — show skeleton when empty fetch; avoid full-page flash if cache hydrated */}
          {loading && games.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/40 aspect-[4/5] animate-pulse"
                />
              ))}
            </div>
          ) : games.length === 0 ? (
            <p className="text-xs text-center text-slate-400 py-16">No games found in this category.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {games.map((g) => {
                const cleanGTitle = (g.title || '').toLowerCase().trim();
                const hasAcc = userGameAccounts.some((a) => {
                  const t = (a.gameTitle || '').toLowerCase().trim();
                  return t === cleanGTitle || (cleanGTitle && t.includes(cleanGTitle)) || (t && cleanGTitle.includes(t));
                });
                const isPend = !hasAcc && pendingAccountRequests.some((p) => {
                  const t = (p.gameTitle || '').toLowerCase().trim();
                  return t === cleanGTitle || (cleanGTitle && t.includes(cleanGTitle)) || (t && cleanGTitle.includes(t));
                });

                return (
                  <GameCard
                    key={g.id}
                    game={g}
                    hasAccount={hasAcc}
                    isPending={isPend}
                    onPlay={handlePlayGame}
                    onViewCredentials={handlePlayGame}
                    onRequestAccount={handleRequestGame}
                  />
                );
              })}
            </div>
          )}
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
        onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => handleRequestGame()}
      />

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, tab: 'login' })}
        onSuccess={() => loadUser()}
      />

      <WalletModal
        isOpen={walletModal.open}
        onClose={() => setWalletModal({ open: false, tab: 'deposit' })}
        user={user}
        onBalanceUpdated={loadUser}
      />

      <GameRequestModal
        isOpen={gameRequestModal.open}
        onClose={() => setGameRequestModal({ open: false, initialGame: null })}
        initialGame={gameRequestModal.initialGame}
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
