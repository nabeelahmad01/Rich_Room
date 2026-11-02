'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';

export default function TermsPage() {
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

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-10 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-sub font-bold text-[var(--neon-cyan)]">LEGAL AGREEMENT</span>
            <h1 className="text-3xl font-black font-heading text-white">TERMS OF SERVICE</h1>
            <p className="text-xs text-slate-400">Last Updated: October 2026</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 text-xs text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">1. ACCEPTANCE OF TERMS</h2>
              <p>
                By registering an account, accessing, or using the Players Paradise Hub platform, you agree to be bound by these Terms of Service. If you do not agree to all terms, do not access or use the platform.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">2. ACCOUNT SECURITY & RESPONSIBILITY</h2>
              <p>
                Each player is solely permitted one account. Maintaining confidentiality of account credentials and platform logins (such as Ultra Panda or Fire Kirin logins issued by our team) is the sole responsibility of the registered user.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">3. PAYMENTS & PROMOTIONAL CREDITS</h2>
              <p>
                All deposits are processed through approved third-party settlement gateways (e.g., Cash App, Chime, Zelle, cryptocurrency networks). Game credits are non-transferable and can only be redeemed through legitimate gameplay winnings.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">4. FAIR PLAY & ANTI-FRAUD</h2>
              <p>
                Collusion, automated script usage, chargebacks, or exploitative behavior will result in immediate permanent account termination and forfeiture of all accumulated promotional balances.
              </p>
            </section>
          </div>
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav user={null} onOpenAuth={() => {}} onOpenWallet={() => router.push('/wallet')} onOpenGameRequest={() => router.push('/')} />
    </div>
  );
}
