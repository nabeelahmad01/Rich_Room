'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, HeartHandshake, PhoneCall, AlertTriangle } from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';

export default function ResponsibleGamingPage() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

      <div className="flex-1 flex flex-col xl:pl-64">
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={null}
          onOpenAuth={() => router.push('/')}
          onOpenWallet={() => router.push('/wallet')}
          onOpenDailyBonus={() => {}}
          onOpenNotifications={() => {}}
          onLogout={() => {}}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 xl:pb-10 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-sub font-bold text-amber-400">PLAYER WELL-BEING</span>
            <h1 className="text-3xl font-black font-heading text-white">RESPONSIBLE GAMING</h1>
            <p className="text-xs text-slate-400">Promoting Safe, Fun, and Sustainable Social Play</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="block font-heading text-xs text-white">GAMING SHOULD ALWAYS BE ENTERTAINMENT</strong>
                <span>Never play with funds you cannot afford to lose. Set personal budgets and take regular breaks.</span>
              </div>
            </div>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">SELF-EXCLUSION & LIMITS</h2>
              <p>
                Players Paradise Hub offers voluntary self-exclusion options ranging from 24-hour cool-offs to permanent account restrictions. Contact support@playersparadisehub.com or ping our 24/7 live chat desk to set custom daily deposit limits or request an immediate timeout.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">HELP & RESOURCES</h2>
              <p>
                If you or someone you know is experiencing difficulties with gaming behavior, support is free, confidential, and available 24/7:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>National Council on Problem Gambling: <strong>1-800-522-4700</strong> (Call or Text)</li>
                <li>Visit <strong>www.ncpgambling.org</strong> for live confidential chat</li>
                <li>Gamblers Anonymous: <strong>www.gamblersanonymous.org</strong></li>
              </ul>
            </section>
          </div>
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav user={null} onOpenAuth={() => {}} onOpenWallet={() => router.push('/wallet')} onOpenGameRequest={() => router.push('/')} />
    </div>
  );
}
