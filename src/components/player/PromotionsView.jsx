'use client';

import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  Zap,
  Gift,
  ShieldCheck,
  Trophy,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function PromotionsView({ onSelectTab }) {
  const [promotions, setPromotions] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  useEffect(() => {
    fetch('/api/promotions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d?.promotions)) {
          setPromotions(d.promotions);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPromos(false));
  }, []);

  const tiers = [
    {
      name: 'Bronze Panda',
      badge: 'TIER 1',
      perks: ['Free 5 SC Welcome Package', 'Daily Mystery Crate', '24/7 Live Support', 'Standard Cashout Queue'],
      scMin: '$0+',
      border: 'border-slate-700',
    },
    {
      name: 'Silver Cyber',
      badge: 'TIER 2',
      perks: ['5% Weekly Loss Rebate', 'Higher Daily Mystery Drops', 'Priority Game ID Release', 'Direct Cash App Desk'],
      scMin: '$250+',
      border: 'border-cyan-500/40',
    },
    {
      name: 'Gold Titan',
      badge: 'TIER 3',
      perks: ['10% Weekly Loss Rebate', 'Personal VIP Host Access', 'Expedited 3-Min Cashouts', 'Monthly Level-up Gift'],
      scMin: '$1,000+',
      border: 'border-amber-500/40',
    },
    {
      name: 'Diamond Overlord',
      badge: 'TIER 4',
      perks: ['20% Weekly Loss Rebate', 'Unlimited Instant Cashouts', 'Bespoke High-Roller Limits', 'Luxury Crypto Vault Access'],
      scMin: '$5,000+',
      border: 'border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    },
  ];

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-xs font-heading font-bold">
          <Sparkles size={14} />
          <span>CYBER REWARDS & VIP PERKS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading text-white">
          PROMOTIONS & <span className="text-[var(--neon-cyan)]">VIP CLUB</span>
        </h1>
        <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Level up your gaming with weekly loss rebates, mystery spin drops, deposit match bonuses, and dedicated high-roller concierge.
        </p>
      </div>

      {/* Featured Promo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-block">
              WELCOME OFFER
            </span>
            <h3 className="font-heading font-black text-2xl text-white">100% First Deposit Match</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Deposit $20 or more via Cash App, Zelle, or Crypto and receive double your credits instantly up to $500 SC.
            </p>
          </div>
          <button
            onClick={() => {
              if (typeof onSelectTab === 'function') onSelectTab('deposit', '/deposit');
            }}
            className="w-full py-3 rounded-2xl cyber-btn-cyan text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>DEPOSIT & CLAIM 100%</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-[var(--neon-purple)]/40 shadow-[0_0_30px_rgba(192,38,211,0.15)] flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--neon-purple)]/30 text-[var(--neon-purple-light)] border border-[var(--neon-purple)]/40 inline-block">
              DAILY REWARD
            </span>
            <h3 className="font-heading font-black text-2xl text-white">Daily Mystery Wheel Spin</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Spin our fortune wheel every 24 hours to win free Sweeps Coins, platform multipliers, and bonus credits.
            </p>
          </div>
          <button
            onClick={() => {
              if (typeof onSelectTab === 'function') onSelectTab('spin-wheel', '/spin-wheel');
            }}
            className="w-full py-3 rounded-2xl cyber-btn-purple text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>SPIN DAILY WHEEL</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-[var(--neon-cyan)]/40 shadow-[0_0_30px_rgba(0,240,255,0.15)] flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/40 inline-block">
              COMMUNITY BONUS
            </span>
            <h3 className="font-heading font-black text-2xl text-white">Refer & Earn $10 SC</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Share your unique invite link with friends. Receive $10 SC bonus cash the moment they complete their first deposit.
            </p>
          </div>
          <button
            onClick={() => {
              if (typeof onSelectTab === 'function') onSelectTab('referral', '/referral');
            }}
            className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>VIEW INVITE LINK</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* VIP Tiers Matrix */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-amber-400 font-heading font-bold text-xs uppercase tracking-wider">
            <Crown size={16} />
            <span>VIP LOYALTY TIERS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white">
            FOUR LEVELS OF ELITE PRIVILEGES
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((t, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-3xl bg-slate-900/80 border ${t.border} flex flex-col justify-between space-y-6 hover:scale-102 transition-transform`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {t.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--neon-cyan)]">{t.scMin}</span>
                </div>
                <h4 className="font-heading font-black text-xl text-white">{t.name}</h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {t.perks.map((p, pIdx) => (
                    <li key={pIdx} className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
