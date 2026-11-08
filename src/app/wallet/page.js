'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import WalletModal from '@/components/modals/WalletModal';
import AuthModal from '@/components/modals/AuthModal';
import { diffSet } from '@/lib/fastDiff';
import { getInitialPlayerUser, writeCachedPlayer, broadcastPlayerLogout } from '@/lib/playerSessionCache';
import {
  CACHE_KEYS,
  readSessionCache,
  writeSessionCache,
} from '@/lib/playerDataCache';
import { LoadingInline, TableSkeleton } from '@/components/common/LoadState';

export default function WalletPage() {
  const router = useRouter();
  const [user, setUser] = useState(getInitialPlayerUser);
  const [walletModal, setWalletModal] = useState({ open: false, tab: 'deposit' });
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deposits, setDeposits] = useState(() => {
    const snap = readSessionCache(CACHE_KEYS.WALLET_SNAPSHOT);
    return snap?.deposits || [];
  });
  const [redemptions, setRedemptions] = useState(() => {
    const snap = readSessionCache(CACHE_KEYS.WALLET_SNAPSHOT);
    return snap?.redemptions || [];
  });
  const [loadingWallet, setLoadingWallet] = useState(
    () => typeof window !== 'undefined' && readSessionCache(CACHE_KEYS.WALLET_SNAPSHOT) == null
  );

  const loadData = async (isSilent = false) => {
    if (!isSilent && !readSessionCache(CACHE_KEYS.WALLET_SNAPSHOT)) {
      setLoadingWallet(true);
    }
    try {
      const meRes = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      const meData = await meRes.json();
      if (meData.authenticated && meData.user) {
        writeCachedPlayer(meData.user);
        diffSet(setUser, meData.user);
        const [depRes, withRes] = await Promise.all([
          fetch('/api/payments/deposit?lightweight=true', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/payments/withdraw?lightweight=true', { credentials: 'include', cache: 'no-store' }),
        ]);
        const depData = await depRes.json();
        const withData = await withRes.json();
        const nextDeposits = depData.success ? depData.deposits || [] : deposits;
        const nextRedemptions = withData.success ? withData.redemptions || [] : redemptions;
        if (depData.success) diffSet(setDeposits, nextDeposits);
        if (withData.success) diffSet(setRedemptions, nextRedemptions);
        writeSessionCache(CACHE_KEYS.WALLET_SNAPSHOT, {
          deposits: nextDeposits,
          redemptions: nextRedemptions,
        });
      }
    } catch {}
    finally {
      if (!isSilent) setLoadingWallet(false);
    }
  };

  useEffect(() => {
    loadData(Boolean(readSessionCache(CACHE_KEYS.WALLET_SNAPSHOT)));

    const interval = setInterval(() => {
      if (!document.hidden) loadData(true);
    }, 8000);

    const handleUserSync = (e) => {
      if (e.detail) diffSet(setUser, e.detail);
    };

    const handleFocus = () => loadData();

    let balanceChan = null;
    try {
      balanceChan = new BroadcastChannel('paradise_balance_sync');
      balanceChan.onmessage = () => loadData();
    } catch {}

    const handleStorageSync = (e) => {
      if (e.key === 'paradise_user_balance_sync') loadData();
    };

    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      if (balanceChan) balanceChan.close();
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col">
      <CyberSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => router.push('/')}
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

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 pb-28 xl:pb-8">
          {/* Header Card */}
          <div className="p-6 md:p-8 rounded-3xl border border-[var(--chrome-border)] bg-gradient-to-br from-[#0c1333] via-[#090d24] to-[#050711] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-sub font-bold text-[var(--neon-cyan)] tracking-wider">
                OFFICIAL CASHIER
              </span>
              <h1 className="text-2xl md:text-3xl font-black font-heading text-white">
                WALLET & BALANCE MANAGER
              </h1>
              <p className="text-xs text-slate-300">
                Instant deposits via Cash App, Zelle, Chime & Crypto. Payouts processed 24/7 in under 5 minutes.
              </p>
            </div>

            {/* Single Unified Wallet Balance Display */}
            <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AVAILABLE BALANCE</span>
                <div className="font-mono font-black text-2xl text-emerald-400">
                  ${Number(user?.availableSC ?? (user?.balanceSC - (user?.frozenBalance || 0)) ?? user?.balance ?? 0).toFixed(2)}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TOTAL BALANCE</span>
                <div className="font-mono font-black text-xl text-white">
                  ${Number(user?.balance ?? user?.balanceSC ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/deposit"
              className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border border-[var(--neon-cyan)]/40 hover:border-[var(--neon-cyan)] flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--neon-cyan)] text-black flex items-center justify-center font-black shadow-md">
                  <ArrowDownLeft size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-heading font-black text-base text-white group-hover:text-[var(--neon-cyan)]">
                    DEPOSIT CREDITS
                  </h3>
                  <p className="text-xs text-slate-400">Cash App • Zelle • Chime • Crypto</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--neon-cyan)]">START →</span>
            </Link>

            <Link
              href="/withdraw"
              className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 hover:border-emerald-500 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black shadow-md">
                  <ArrowUpRight size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-heading font-black text-base text-white group-hover:text-emerald-300">
                    REDEEM CASHOUT
                  </h3>
                  <p className="text-xs text-slate-400">Min $40 • Instant 24/7 payout</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400">START →</span>
            </Link>
          </div>

          {/* Recent Deposits & Cashouts History */}
          <div className="space-y-4">
            <h2 className="font-heading font-black text-lg text-white">
              MY RECENT TRANSACTIONS
            </h2>

            {!user ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Please sign in to view your personal deposit and cashout history.
              </p>
            ) : loadingWallet ? (
              <TableSkeleton rows={5} />
            ) : deposits.length === 0 && redemptions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No transactions recorded yet. Use the buttons above to load credits or redeem winnings!
              </p>
            ) : (
              <div className="space-y-2">
                {[...deposits.map((d) => ({ ...d, isDeposit: true })), ...redemptions.map((r) => ({ ...r, isDeposit: false }))]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 15)
                  .map((tx, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tx.isDeposit
                              ? 'bg-cyan-500/20 text-[var(--neon-cyan)]'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {tx.isDeposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <div className="font-heading font-bold text-white flex items-center gap-2 flex-wrap">
                            <span>{tx.isDeposit ? `Deposit via ${tx.method || tx.methodName || 'Payment'}` : `Cashout to ${tx.destinationTag}`}</span>
                            {tx.gameTitle && (
                              <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full font-sans font-semibold">
                                🎮 {tx.gameTitle} {tx.gameAccountUsername ? `(@${tx.gameAccountUsername})` : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(tx.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-sm ${
                            tx.isDeposit ? 'text-[var(--neon-cyan)]' : 'text-emerald-400'
                          }`}
                        >
                          {tx.isDeposit ? `+$${parseFloat(tx.amount).toFixed(2)}` : `-$${parseFloat(tx.amount).toFixed(2)}`}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            tx.status === 'COMPLETED' || tx.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
        onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => router.push('/')}
      />

      <WalletModal
        isOpen={walletModal.open}
        onClose={() => setWalletModal({ open: false, tab: 'deposit' })}
        initialTab={walletModal.tab}
        user={user}
        onBalanceUpdated={loadData}
      />

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, tab: 'login' })}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
