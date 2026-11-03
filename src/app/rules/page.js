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
  const [cashoutRules, setCashoutRules] = useState('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.settings?.cashoutRules) {
          setCashoutRules(d.settings.cashoutRules);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col font-sans selection:bg-[var(--neon-cyan)] selection:text-black">
      <CyberSidebar
        collapsed={false}
        setCollapsed={() => {}}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={null}
        onOpenWallet={() => router.push('/withdraw')}
        onOpenGameRequest={() => router.push('/')}
        onOpenChat={() => {}}
        onOpenDailyBonus={() => {}}
      />

      <div className="flex-1 flex flex-col lg:pl-64">
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={null}
          onOpenAuth={() => router.push('/')}
          onOpenWallet={() => router.push('/withdraw')}
          onOpenDailyBonus={() => {}}
          onOpenNotifications={() => {}}
          onLogout={() => {}}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-10 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-heading font-bold text-[var(--neon-cyan)] flex items-center gap-1.5">
              <ShieldCheck size={16} /> OFFICIAL CASHOUT &amp; REDEMPTION POLICY
            </span>
            <h1 className="text-3xl font-black font-heading text-white">CASHOUT RULES &amp; GUIDELINES</h1>
            <p className="text-xs text-slate-400">USA Sweepstakes Standard • 24/7 Verified Redemptions</p>
          </div>

          {/* Dynamic Admin-Configured Cashout Rules Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-[var(--chrome-border)] shadow-[0_10px_35px_rgba(0,0,0,0.5)] space-y-5 text-sm text-slate-200 leading-relaxed">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_10px_var(--neon-cyan)] animate-pulse"></span>
              <h2 className="font-heading font-black text-sm text-[var(--neon-cyan)] uppercase tracking-wider">
                Official Cashout Policy
              </h2>
            </div>

            {loading ? (
              <p className="text-xs font-mono text-slate-500 py-6 text-center">LOADING CASHOUT RULES...</p>
            ) : cashoutRules ? (
              <div className="whitespace-pre-line text-xs sm:text-sm font-sans leading-relaxed text-slate-200 space-y-2">
                {cashoutRules}
              </div>
            ) : (
              <div className="space-y-3 text-xs sm:text-sm">
                <p>1. All winnings from eligible sweepstakes games can be redeemed directly to your active cashout method.</p>
                <p>2. Cashouts are processed 24/7 with zero minimum fees.</p>
                <p>3. Ensure your Cashtag, handle, or crypto address matches your verified account.</p>
                <p>4. Processing time is usually within 5 to 15 minutes.</p>
              </div>
            )}
          </div>

          {/* General Sweeps Compliance Card */}
          <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800/80 space-y-4 text-xs text-slate-400 leading-relaxed">
            <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
              Legal Compliance &amp; Sweepstakes Notice
            </h3>
            <p>
              NO PURCHASE NECESSARY TO ENTER OR WIN. A PURCHASE DOES NOT INCREASE YOUR CHANCES OF WINNING.
              Redemptions are paid in USD equivalent to the verified player. Void where prohibited by law.
            </p>
          </div>
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav user={null} onOpenAuth={() => {}} onOpenWallet={() => router.push('/wallet')} onOpenGameRequest={() => router.push('/')} />
    </div>
  );
}
