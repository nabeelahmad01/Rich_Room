'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';

export default function PrivacyPage() {
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
            <span className="text-xs font-sub font-bold text-[var(--neon-cyan)]">DATA PROTECTION</span>
            <h1 className="text-3xl font-black font-heading text-white">PRIVACY POLICY</h1>
            <p className="text-xs text-slate-400">Commitment to Player Security & Confidentiality</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 text-xs text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">1. INFORMATION WE COLLECT</h2>
              <p>
                We collect personal information necessary to maintain your player profile, process deposits and prize redemptions, and satisfy statutory KYC anti-money laundering regulations. This includes email address, username, transaction receipts, and identity documents.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">2. DATA SECURITY</h2>
              <p>
                All account records, passwords, and transaction archives are encrypted at rest using industry-standard AES-256 and transmitted exclusively over secure HTTPS / TLS 1.3 channels. We do not sell your personal data to third parties.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-sm text-white">3. RETENTION & RIGHTS</h2>
              <p>
                You may request access to, correction of, or deletion of your profile data by submitting a formal request to privacy@playersparadisehub.com.
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
