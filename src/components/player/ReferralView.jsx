'use client';

import React, { useState, useEffect } from 'react';
import { diffSet } from '@/lib/fastDiff';
import {
  Users,
  Copy,
  Check,
  DollarSign,
  Gift,
  Share2,
  Sparkles,
  TrendingUp,
  Award,
  Wallet
} from 'lucide-react';

export default function ReferralView({ user: propUser, onOpenAuth }) {
  const [user, setUser] = useState(propUser || null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(!propUser);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');

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
    const interval = setInterval(() => {
      if (!document.hidden) loadUserAndStats(true);
    }, 3000);
    return () => clearInterval(interval);
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
        loadUserAndStats(true);
        window.dispatchEvent(new CustomEvent('balanceUpdated'));
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
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border border-[var(--neon-cyan)]/30 bg-gradient-to-br from-[#0c0824] via-[#09061c] to-[#04020d] shadow-[0_0_40px_rgba(0,240,255,0.15)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[var(--neon-cyan)]/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/15 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-xs font-heading font-black tracking-wider uppercase">
            <Sparkles size={14} />
            <span>PLAYERS PARADISE AFFILIATE SYSTEM</span>
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
        <div className="p-8 rounded-3xl bg-[#09071c] border border-slate-800 text-center space-y-4 max-w-md mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 flex items-center justify-center mx-auto text-[var(--neon-cyan)]">
            <Users size={32} />
          </div>
          <h2 className="font-heading font-bold text-lg text-white">
            Log In to Get Your Referral Link
          </h2>
          <p className="text-xs text-slate-400">
            Create a free player account or sign in to generate your unique referral link and start earning.
          </p>
          <button
            onClick={() => {
              if (typeof onOpenAuth === 'function') onOpenAuth('login');
            }}
            className="w-full py-3 rounded-xl cyber-btn-cyan text-xs font-bold cursor-pointer"
          >
            LOG IN / REGISTER
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL INVITED</span>
              <div className="font-mono font-black text-2xl text-white">{stats?.totalReferred || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE DEPOSITORS</span>
              <div className="font-mono font-black text-2xl text-emerald-400">{stats?.activeDepositors || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COMMISSION RATE</span>
              <div className="font-mono font-black text-2xl text-[var(--neon-cyan)]">{stats?.commissionPercent || 10}%</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CLAIMABLE COMMISSIONS</span>
              <div className="font-mono font-black text-2xl text-amber-400">${Number(stats?.claimableBalance || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Referral Link Box */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-cyan-500/30 space-y-4">
            <h3 className="font-heading font-black text-base text-white">YOUR EXCLUSIVE REFERRAL LINK</h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-cyan-300 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(referralUrl, false)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl cyber-btn-cyan text-xs font-bold shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'COPIED!' : 'COPY LINK'}</span>
              </button>
            </div>

            {/* Claim button if balance > 0 */}
            {Number(stats?.claimableBalance || 0) > 0 && (
              <div className="pt-2">
                <button
                  onClick={handleClaimCommission}
                  disabled={claiming}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-heading font-bold text-xs shadow-lg cursor-pointer"
                >
                  {claiming ? 'CLAIMING...' : `CLAIM $${Number(stats?.claimableBalance || 0).toFixed(2)} TO WALLET`}
                </button>
              </div>
            )}
            {claimSuccess && (
              <div className="text-xs text-emerald-400 font-bold">{claimSuccess}</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
