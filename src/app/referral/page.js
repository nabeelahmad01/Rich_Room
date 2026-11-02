'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import AuthModal from '@/components/modals/AuthModal';
import WalletModal from '@/components/modals/WalletModal';
import {
  Users,
  Copy,
  Check,
  DollarSign,
  Gift,
  Share2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Wallet
} from 'lucide-react';
import { diffSet } from '@/lib/fastDiff';

export default function ReferralPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [walletModal, setWalletModal] = useState({ open: false, tab: 'deposit' });

  const loadUserAndStats = async (isSilent = false) => {
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
      const meData = await meRes.json();
      if (meData.authenticated && meData.user) {
        diffSet(setUser, meData.user);
        const affRes = await fetch('/api/affiliates', { cache: 'no-store' });
        const affData = await affRes.json();
        if (affData.success && affData.stats) {
          diffSet(setStats, affData.stats);
        }
      }
    } catch {}
    if (!isSilent) setLoading(false);
  };

  useEffect(() => {
    loadUserAndStats();

    // Fast zero-refresh polling (2.5s) so new referrals immediately show up
    const interval = setInterval(() => {
      if (!document.hidden) loadUserAndStats(true);
    }, 2500);

    const handleFocus = () => loadUserAndStats(true);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const copyToClipboard = (text, isCode = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleClaimCommission = async () => {
    if (claiming) return;
    setClaiming(true);
    setClaimSuccess('');
    try {
      const res = await fetch('/api/affiliates', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setClaimSuccess(`Claimed $${data.claimedAmount?.toFixed(2) || '0.00'} directly to your playable wallet!`);
        loadUserAndStats();
      } else {
        alert(data.error || 'Failed to claim commission.');
      }
    } catch {
      alert('Network error while claiming.');
    } finally {
      setClaiming(false);
    }
  };

  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://playersparadisehub.com');
  const referralCode = stats?.referralCode || user?.referralCode || user?.username || 'PARADISE';
  const referralUrl = `${origin}/register?ref=${referralCode}`;

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col selection:bg-[var(--neon-cyan)] selection:text-black">
      {/* Sidebar */}
      <CyberSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => router.push('/games')}
      />

      {/* Main Layout Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
          onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
          onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
          onOpenNotifications={() => {}}
          onLogout={() => {
            fetch('/api/auth/logout', { method: 'POST' }).then(() => {
              window.location.href = '/';
            });
          }}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8 max-w-6xl mx-auto w-full space-y-8">
          {/* Header Banner */}
          <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border border-[var(--neon-cyan)]/30 bg-gradient-to-br from-[#0c0824] via-[#09061c] to-[#04020d] shadow-[0_0_40px_rgba(0,240,255,0.15)]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[var(--neon-cyan)]/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/15 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-xs font-heading font-black tracking-wider uppercase">
                <Sparkles size={14} />
                <span>RICH ROOM VIP AFFILIATE SYSTEM</span>
              </div>
              <h1 className="font-heading font-black text-2xl sm:text-4xl tracking-wide leading-tight text-white">
                INVITE PLAYERS. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)]">EARN UNLIMITED COMMISSIONS.</span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Earn high-rate revenue share on all deposits made by players you invite. Instant payouts directly into your playable wallet balance!
              </p>
            </div>
          </div>

          {!user ? (
            /* Logged-out state */
            <div className="p-8 rounded-3xl bg-[#09071c] border border-slate-800 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 flex items-center justify-center mx-auto text-[var(--neon-cyan)]">
                <Users size={32} />
              </div>
              <h2 className="font-heading font-bold text-lg text-white">
                Log In to Get Your Referral Link
              </h2>
              <p className="text-xs text-slate-400">
                Create a free Players Paradise account to unlock your unique referral code, track invited players, and cash out affiliate earnings.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setAuthModal({ open: true, tab: 'login' })}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
                >
                  Log In
                </button>
                <button
                  onClick={() => setAuthModal({ open: true, tab: 'register' })}
                  className="cyber-btn-cyan text-xs py-2.5 px-5 font-bold"
                >
                  Register Now
                </button>
              </div>
            </div>
          ) : (
            /* Logged-in state */
            <div className="space-y-6">
              {/* Claim Success Banner */}
              {claimSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <span>{claimSuccess}</span>
                  <button
                    onClick={() => setClaimSuccess('')}
                    className="text-emerald-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Referral Link & Code Share Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Link Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-[#0c0822] border border-[var(--chrome-border)]/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Share2 size={15} className="text-[var(--neon-cyan)]" />
                      Your Referral Link
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#060312] p-2 rounded-xl border border-slate-800">
                    <input
                      type="text"
                      readOnly
                      value={referralUrl}
                      className="bg-transparent text-xs text-slate-200 flex-1 outline-none font-mono truncate px-2"
                    />
                    <button
                      onClick={() => copyToClipboard(referralUrl, false)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--neon-cyan)] text-black text-xs font-bold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition"
                    >
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Code Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-[#0c0822] border border-[var(--chrome-border)]/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Gift size={15} className="text-amber-400" />
                      Your Referral Code
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                      {stats?.commissionRate ?? 20}% BONUS
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#060312] p-2 rounded-xl border border-slate-800">
                    <span className="font-heading font-black text-sm text-[var(--neon-cyan)] px-3 tracking-widest flex-1 font-mono">
                      {referralCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(referralCode, true)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition border border-slate-700"
                    >
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Commission Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Total Players Referred</span>
                  <div className="font-heading font-black text-2xl text-white mt-2">
                    {stats?.totalReferrals ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">Lifetime Signups</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Active Depositors</span>
                  <div className="font-heading font-black text-2xl text-emerald-400 mt-2">
                    {stats?.activeDepositors ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">Generating Comm.</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Total Comm. Earned</span>
                  <div className="font-heading font-black text-2xl text-amber-400 mt-2">
                    ${Number(stats?.commissionsEarned || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">All-time Earnings</span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-300 font-bold">Unclaimed Balance</span>
                  <div className="font-heading font-black text-2xl text-emerald-400 mt-2">
                    ${Number(stats?.commissionsUnpaid || 0).toFixed(2)}
                  </div>
                  <button
                    onClick={handleClaimCommission}
                    disabled={claiming || Number(stats?.commissionsUnpaid || 0) <= 0}
                    className="mt-2 w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-[11px] font-heading font-black transition active:scale-95"
                  >
                    {claiming ? 'Claiming...' : 'Claim to Wallet'}
                  </button>
                </div>
              </div>

              {/* Referees Table */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                  <Users size={16} className="text-[var(--neon-cyan)]" />
                  <span>Recent Referred Players</span>
                </h3>

                {(!stats?.referees || stats.referees.length === 0) ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No players referred yet. Share your link above to start earning!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                          <th className="py-2 px-3">Player</th>
                          <th className="py-2 px-3">Joined Date</th>
                          <th className="py-2 px-3">Deposit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {stats.referees.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-800/30 transition">
                            <td className="py-2.5 px-3 text-white font-bold">{r.username}</td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : 'Recent'}
                            </td>
                            <td className="py-2.5 px-3">
                              {r.hasDeposited ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                                  ACTIVE DEPOSITOR
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                  Signed Up
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
        onOpenWallet={(tab) => router.push(tab === 'withdraw' || tab === 'redeem' || tab === 'cashout' ? '/withdraw' : '/deposit')}
        onOpenGameRequest={() => router.push('/games')}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, tab: 'login' })}
        initialTab={authModal.tab}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setAuthModal({ open: false, tab: 'login' });
          loadUserAndStats();
        }}
      />

      {/* Wallet Modal */}
      <WalletModal
        isOpen={walletModal.open}
        onClose={() => setWalletModal({ open: false, tab: 'deposit' })}
        initialTab={walletModal.tab}
        user={user}
        onBalanceUpdated={loadUserAndStats}
      />
    </div>
  );
}
