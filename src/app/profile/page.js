'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Wallet,
  Sparkles,
  Trophy,
  Copy,
  Check,
  LogOut,
  Clock,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import AuthModal from '@/components/modals/AuthModal';
import { diffSet } from '@/lib/fastDiff';
import { getInitialPlayerUser, writeCachedPlayer, clearCachedPlayer, broadcastPlayerLogout } from '@/lib/playerSessionCache';
import { LoadingInline } from '@/components/common/LoadState';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(getInitialPlayerUser);
  const [loading, setLoading] = useState(() => !getInitialPlayerUser());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [copiedCode, setCopiedCode] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [passMsg, setPassMsg] = useState(null);

  const fetchProfile = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        writeCachedPlayer(data.user);
        diffSet(setUser, data.user);
      } else if (!isSilent) {
        clearCachedPlayer();
        diffSet(setUser, null);
        router.push('/login?redirect=/profile');
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(false);
    const interval = setInterval(() => {
      if (!document.hidden) fetchProfile(true);
    }, 4000);

    const handleUserSync = (e) => {
      if (e.detail) diffSet(setUser, e.detail);
    };

    const handleInstant = () => fetchProfile(true);
    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('paradise-instant-sync', handleInstant);
    return () => {
      clearInterval(interval);
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('paradise-instant-sync', handleInstant);
    };
  }, []);

  const handleCopyReferral = () => {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setPassSubmitting(true);
    setPassMsg(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPassMsg({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMsg({ type: 'error', text: data.error || data.message || 'Failed to update password.' });
      }
    } catch {
      setPassMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setPassSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col font-sans selection:bg-[var(--neon-cyan)] selection:text-black">
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
            router.push('/');
          }}
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 pb-28 xl:pb-8">
          {loading && !user ? (
            <LoadingInline label="Loading your profile…" />
          ) : null}
          {/* Header Card */}
          <div className="p-6 md:p-8 rounded-3xl border border-[var(--chrome-border)] bg-gradient-to-br from-[#0c1333] via-[#090d24] to-[#050711] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] p-0.5 shadow-[0_0_25px_var(--neon-cyan-glow)] shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-heading font-black text-2xl sm:text-3xl text-[var(--neon-cyan)] uppercase">
                  {user?.username ? user.username.charAt(0) : 'P'}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black font-heading text-white">
                    {user?.username || 'VIP Player'}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/40 font-mono">
                    {user?.vipTier || 'Bronze Panda'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{user?.email || 'Authenticated Player'}</p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <ShieldCheck size={14} /> KYC: {user?.kycStatus?.toUpperCase() || 'VERIFIED'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 font-mono">
                    ID: #{user?.id?.slice(-6) || user?._id?.slice(-6) || '777001'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Wallet Stats */}
            <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">BALANCE</span>
                <div className="font-mono font-black text-2xl text-emerald-400">
                  ${Number(user?.balance ?? user?.balanceSC ?? 0).toFixed(2)}
                </div>
              </div>
              <Link
                href="/deposit"
                className="cyber-btn-cyan text-xs py-2 px-3 font-bold"
              >
                + DEPOSIT
              </Link>
            </div>
          </div>

          {/* 3-Column Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-400" /> VIP Status
              </span>
              <p className="text-lg font-black text-white">{user?.vipTier || 'Bronze Panda'}</p>
              <p className="text-xs text-slate-400">Earn up to 2.5% daily cashback & exclusive concierge recharges.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[var(--neon-cyan)]" /> Referral Code
              </span>
              <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                <span className="font-mono font-bold text-white text-sm">
                  {user?.referralCode || 'RICHROOM'}
                </span>
                <button
                  onClick={handleCopyReferral}
                  className="text-xs text-[var(--neon-cyan)] font-bold flex items-center gap-1 hover:text-white"
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  {copiedCode ? 'COPIED' : 'COPY'}
                </button>
              </div>
              <p className="text-xs text-slate-400">Earn 5% on every friend recharge forever.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Headphones size={14} className="text-cyan-400" /> Support Desk
              </span>
              <p className="text-sm font-bold text-slate-200">24/7 VIP Concierge Active</p>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-live-chat'));
                    if (typeof window.openLiveChat === 'function') window.openLiveChat();
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-900/60 transition"
              >
                OPEN LIVE CHAT
              </button>
            </div>
          </div>

          {/* Security & Password Manager */}
          <div className="p-6 md:p-8 rounded-3xl border border-slate-800 bg-slate-900/50 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-heading font-black text-white text-base flex items-center gap-2">
                  <KeyRound size={18} className="text-[var(--neon-cyan)]" /> ACCOUNT SECURITY
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage your login credentials & password</p>
              </div>
            </div>

            {passMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  passMsg.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/70 border border-rose-500/50 text-rose-200'
                }`}
              >
                {passMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[var(--neon-cyan)] text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[var(--neon-cyan)] text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[var(--neon-cyan)] text-white text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passSubmitting}
                className="cyber-btn-cyan text-xs py-2.5 px-5 font-bold"
              >
                {passSubmitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </form>
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

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, tab: 'login' })}
        initialTab={authModal.tab}
      />
    </div>
  );
}
