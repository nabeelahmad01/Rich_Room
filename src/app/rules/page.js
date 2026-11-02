'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';

export default function RulesPage() {
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
            <span className="text-xs font-sub font-bold text-[var(--neon-cyan)]">LEGAL COMPLIANCE</span>
            <h1 className="text-3xl font-black font-heading text-white">OFFICIAL SWEEPSTAKES RULES</h1>
            <p className="text-xs text-slate-400">Effective Date: October 2026 • United States Jurisdictions</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 text-xs text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">1. NO PURCHASE NECESSARY</h2>
              <p>
                NO PURCHASE OR PAYMENT OF ANY KIND IS NECESSARY TO ENTER OR WIN PROMOTIONAL SWEEPSTAKES ON PLAYERS PARADISE HUB. A PURCHASE DOES NOT INCREASE YOUR CHANCES OF WINNING. VOID WHERE PROHIBITED BY APPLICABLE FEDERAL OR STATE LAW.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">2. ELIGIBILITY</h2>
              <p>
                Promotional sweepstakes are open only to legal residents of the United States who are at least twenty-one (21) years of age at the time of entry. Sweepstakes are void in Washington, Idaho, and Michigan, and any jurisdictions where prohibited.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">3. DUAL CURRENCY MODEL</h2>
              <p>
                Players Paradise Hub operates with two currencies: Game Coins (GC) which hold zero monetary value and are used exclusively for social and arcade recreation; and Sweeps Cash (SC) which are received as complimentary promotional awards and may be redeemed for cash prizes upon completion of playthrough requirements.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">4. PRIZE REDEMPTIONS & VERIFICATION</h2>
              <p>
                A minimum of 25.00 SC is required to request a prize redemption. Redemptions are paid 1:1 in USD equivalent via Cash App, Chime, Zelle, or approved cryptocurrency. All redemptions are subject to standard Customer Due Diligence (CDD) and KYC verification.
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
