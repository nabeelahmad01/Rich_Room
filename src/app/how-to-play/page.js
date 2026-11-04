'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HelpCircle,
  UserPlus,
  KeyRound,
  Wallet,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';

export default function HowToPlayPage() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const steps = [
    {
      num: '01',
      title: 'Create Your Free Account',
      desc: 'Sign up in under 30 seconds with just a username and email. Receive 5 Free Sweeps Cash (SC) and 10,000 Game Coins (GC) instantly.',
      icon: UserPlus,
    },
    {
      num: '02',
      title: 'Request Your Game Platform ID',
      desc: 'Browse our catalog of games including Ultra Panda, Fire Kirin, Orion Stars, and Game Vault. Click "Get ID" to have staff create your unique login credentials.',
      icon: KeyRound,
    },
    {
      num: '03',
      title: 'Load Credits & Play',
      desc: 'Deposit via Cash App, Zelle, Chime, or Crypto. Balance is automatically synchronized with your platform account. Play on mobile app or web browser.',
      icon: Wallet,
    },
    {
      num: '04',
      title: 'Cash Out Your Winnings',
      desc: 'Ready to redeem? Simply open Cashier -> Redeem, specify your Cashtag or payout address, and get paid within 5 minutes directly into your account.',
      icon: Play,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col">
      <CyberSidebar
        collapsed={false}
        setCollapsed={() => {}}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={null}
        onOpenWallet={() => router.push('/wallet')}
        onOpenGameRequest={() => router.push('/')}
        onOpenChat={() => {}}
        onOpenDailyBonus={() => {}}
      />

      <div className="flex-1 flex flex-col lg:pl-64">
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={null}
          onOpenAuth={() => router.push('/')}
          onOpenWallet={() => router.push('/wallet')}
          onOpenDailyBonus={() => {}}
          onOpenNotifications={() => {}}
          onLogout={() => {}}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-10 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-xs font-heading font-bold">
              <HelpCircle size={14} />
              <span>PLAYER ONBOARDING MANUAL</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-heading text-white">
              HOW TO PLAY AT <span className="text-[var(--neon-cyan)]">RICH ROOM</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl mx-auto">
              Follow our 4 simple steps to start spinning, fish hunting, and redeeming cash prizes today.
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-5 hover:border-[var(--neon-cyan)]/50 transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--neon-cyan)] to-blue-600 text-black flex items-center justify-center font-heading font-black text-xl shrink-0 shadow-md">
                    {s.num}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-heading font-bold text-base text-white">{s.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-950/60 to-cyan-950/40 border border-[var(--neon-cyan)]/40 text-center space-y-4">
            <h2 className="font-heading font-black text-xl text-white">READY TO JOIN THE PARADISE?</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Sign up today and get 100% deposit match bonus on your first Cash App or Crypto transfer.
            </p>
            <button
              onClick={() => router.push('/')}
              className="cyber-btn-cyan py-3 px-8 text-xs font-bold"
            >
              <span>GET STARTED NOW</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav user={null} onOpenAuth={() => {}} onOpenWallet={() => router.push('/wallet')} onOpenGameRequest={() => router.push('/')} />
    </div>
  );
}
