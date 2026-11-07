'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import { getInitialPlayerUser } from '@/lib/playerSessionCache';

export default function PromotionsPage() {
  const router = useRouter();
  const [user, setUser] = useState(getInitialPlayerUser);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  useEffect(() => {
    const onSync = (e) => setUser(e.detail || null);
    window.addEventListener('paradise-user-sync', onSync);
    return () => window.removeEventListener('paradise-user-sync', onSync);
  }, []);

  React.useEffect(() => {
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
      name: 'Diamond Elite',
      badge: 'TIER 4',
      perks: ['15% Instant Rakeback', 'No Cashout Limits', 'Private Discord & Telegram Desk', 'Custom Platform Bonus Codes'],
      scMin: '$5,000+',
      border: 'border-purple-500/50',
    },
    {
      name: 'Paradise Legend',
      badge: 'TIER 5',
      perks: ['25% Exclusive VIP Rakeback', 'Dedicated 24/7 Account Executive', 'Instant Unlimited Redemptions', 'VIP Birthday & Holiday Trips'],
      scMin: '$25,000+',
      border: 'border-rose-500/60',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col">
      <CyberSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        onOpenWallet={() => router.push('/wallet')}
        onOpenGameRequest={() => router.push('/')}
        onOpenChat={() => {}}
        onOpenDailyBonus={() => {}}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'xl:pl-20' : 'xl:pl-64'}`}>
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
          onOpenAuth={() => router.push('/')}
          onOpenWallet={() => router.push('/wallet')}
          onOpenDailyBonus={() => {}}
          onOpenNotifications={() => {}}
          onLogout={() => {}}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 xl:pb-8 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-heading font-bold">
              <Crown size={14} />
              <span>CROWN VIP CLUB & REWARDS</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-heading text-white">
              RICH ROOM <span className="text-amber-400">VIP LOUNGE</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl mx-auto">
              Every spin on Ultra Panda, Fire Kirin, Orion Stars, and our in-house games advances your VIP rank. Climb from Bronze Tier to Sovereign Legend!
            </p>
          </div>

          {/* Active Promotions Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-black font-heading text-white flex items-center gap-2">
                <Sparkles size={20} className="text-cyan-400" />
                <span>ACTIVE PROMOTIONS &amp; BOOSTS</span>
              </h2>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                {promotions.length} ACTIVE
              </span>
            </div>

            {loadingPromos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2].map((i) => (
                  <div key={i} className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 animate-pulse h-40" />
                ))}
              </div>
            ) : promotions.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                <Gift size={32} className="mx-auto text-slate-500" />
                <p className="text-sm font-bold text-slate-300">No active promotions at this time.</p>
                <p className="text-xs text-slate-500">Check back soon for new bonus packages and event drops!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {promotions.map((p, idx) => (
                  <div
                    key={p._id || idx}
                    className="p-6 rounded-3xl bg-gradient-to-br from-[#0c122c] via-[#090d20] to-[#050711] border border-cyan-500/30 hover:border-cyan-400/60 transition shadow-xl space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {p.badge && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono uppercase tracking-wider">
                            {p.badge}
                          </span>
                        )}
                        {p.matchPercent > 0 && (
                          <span className="text-xs font-mono font-black text-amber-400">
                            +{p.matchPercent}% Extra
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading font-black text-xl text-white tracking-wide">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <button
                        onClick={() => router.push(p.category === 'deposit' ? '/deposit' : '/')}
                        className="cyber-btn-cyan py-2 px-4 text-xs font-black flex items-center gap-2"
                      >
                        <span>{p.category === 'deposit' ? 'DEPOSIT NOW' : 'CLAIM BONUS'}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VIP Tiers */}
          <div className="space-y-4">
            <h2 className="font-heading font-black text-xl text-white text-center">
              LOYALTY TIERS & REBATES
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {tiers.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl bg-slate-900/80 border ${t.border} space-y-3 flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{t.badge}</span>
                    <h4 className="font-heading font-bold text-sm text-white">{t.name}</h4>
                    <span className="text-xs font-mono font-bold text-emerald-400 block">{t.scMin}</span>
                    <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                      {t.perks.map((p, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-1.5">
                          <CheckCircle2 size={12} className="text-[var(--neon-cyan)] mt-0.5 shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav user={user} onOpenAuth={() => router.push('/login')} onOpenWallet={() => router.push('/wallet')} onOpenGameRequest={() => router.push('/')} />
    </div>
  );
}
