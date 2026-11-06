'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import PlayerGameCredentialsHub from '@/components/hub/PlayerGameCredentialsHub';
import AuthModal from '@/components/modals/AuthModal';
import WalletModal from '@/components/modals/WalletModal';
import ExternalGameModal from '@/components/modals/ExternalGameModal';
import Panda777SlotsModal from '@/components/games/Panda777SlotsModal';
import CyberCrashModal from '@/components/games/CyberCrashModal';

import {
  KeyRound,
  ShieldCheck,
  Gamepad2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function MyGameIdsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [walletModal, setWalletModal] = useState({ open: false, tab: 'deposit' });
  const [activeExternalGame, setActiveExternalGame] = useState(null);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [crashOpen, setCrashOpen] = useState(false);

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const loadGames = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (data.success && data.games) setGames(data.games);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
    loadGames();

    const handleUserSync = (e) => {
      if (e.detail) setUser(e.detail);
    };

    const handleFocus = () => loadUser();

    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const handlePlayGame = (game) => {
    if (!user) {
      setAuthModal({ open: true, tab: 'login' });
      return;
    }
    if (game.id === 'panda-777-slots') setSlotsOpen(true);
    else if (game.id === 'cyber-matrix-crash') setCrashOpen(true);
    else setActiveExternalGame(game);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
      <CyberSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => {}}
        onOpenChat={() => {}}
        onOpenDailyBonus={() => {}}
        onOpenSpinWheel={() => setSpinWheelOpen(true)}
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
          }}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 xl:px-8 py-8 space-y-8 pb-28 xl:pb-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 border border-[var(--chrome-border)] bg-[var(--bg-card)] shadow-[0_0_30px_var(--neon-cyan-glow)]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--neon-cyan)]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[var(--neon-purple)]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/10 border border-[var(--chrome-border)] text-[var(--neon-cyan)] text-xs font-bold tracking-wider uppercase">
                  <ShieldCheck size={14} className="text-[var(--neon-cyan)]" />
                  <span>OFFICIAL PLATFORM VAULT</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                  MY GAME IDs &amp; PLATFORM ACCOUNTS
                </h1>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  View and manage your verified credentials for Orion Star, Fire Kirin, Game Vault, and Juwa. Copy your official login credentials or request credentials for additional platforms below.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push('/games')}
                  className="px-5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Gamepad2 size={16} className="text-[var(--neon-cyan)]" />
                  <span>Explore Games</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/deposit')}
                  className="px-5 py-2.5 rounded-xl text-black text-xs font-black transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                  style={{
                    background: 'var(--primary-gradient)',
                    boxShadow: '0 0 20px var(--neon-cyan-glow)',
                  }}
                >
                  <Sparkles size={16} />
                  <span>Deposit Funds</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Credentials Hub Component */}
          <PlayerGameCredentialsHub
            user={user}
            games={games}
            onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
            onPlayGame={handlePlayGame}
            onDeposit={() => router.push('/deposit')}
          />
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
        onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => router.push('/my-game-ids')}
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

      <ExternalGameModal
        isOpen={!!activeExternalGame}
        onClose={() => setActiveExternalGame(null)}
        game={activeExternalGame}
        user={user}
        onRequestAccount={() => {}}
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
    </div>
  );
}
