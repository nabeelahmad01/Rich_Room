'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Zap,
  Gift,
  KeyRound,
  Wallet,
  Download,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import FreeplayTaskModal from '@/components/modals/FreeplayTaskModal';

export default function CyberHeroBanner({
  user,
  onOpenAuth,
  onOpenWallet,
  onOpenGameRequest,
}) {
  const router = useRouter();
  const [freeplayFeedback, setFreeplayFeedback] = useState(null);
  const [bonusSettings, setBonusSettings] = useState({
    welcomeBonusPercent: 120,
    welcomeBonusTitle: 'WELCOME BONUS',
    welcomeBonusSubtitle: 'Get a 120% bonus on your first deposit! Instant approval & fast cashouts.',
    welcomeBonusActive: true,
  });
  const [freeplayModalOpen, setFreeplayModalOpen] = useState(false);

  React.useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.settings) {
          setBonusSettings(d.settings);
        }
      })
      .catch(() => {});
  }, []);

  const handleGetFreeplay = () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth('register');
      else router.push('/register');
      return;
    }
    setFreeplayFeedback(null);
    setFreeplayModalOpen(true);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-[var(--chrome-border)] bg-gradient-to-br from-[#0c122c] via-[#090d20] to-[#050711] p-6 md:p-10 shadow-[0_15px_50px_rgba(0,0,0,0.6)]">
      {/* Background Cyber Glowing Ambient Lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--neon-cyan)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--neon-purple)]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 240, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.2) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="relative z-10 max-w-4xl">
        {/* Headlines & CTAs */}
        <div className="space-y-5">
          {/* Top Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] text-xs font-heading font-bold shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Flame size={14} className="text-amber-400 animate-pulse" />
            <span>OFFICIAL CYBER SWEEPSTAKES HUB</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)]"></span>
            <span className="text-slate-300">USA 2026</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black font-heading leading-tight tracking-tight text-white">
            RICH <span className="text-[var(--neon-cyan)]">ROOM</span>{' '}
            <span className="text-transparent bg-clip-text text-cyber-gradient">
              VIP LOUNGE
            </span>
          </h1>

          {/* Description */}
          <p className="text-sm md:text-base text-slate-300 max-w-xl leading-relaxed">
            Instant game credentials for <strong className="text-white">Orion Star</strong>,{' '}
            <strong className="text-white">Fire Kirin</strong>,{' '}
            <strong className="text-white">Juwa</strong>, and{' '}
            <strong className="text-white">Game Vault</strong>. 24/7 automated cashouts via Cash App & Crypto.
          </p>

          {/* Dynamic Bonus Highlight Card */}
          {bonusSettings?.welcomeBonusActive !== false && Number(bonusSettings?.welcomeBonusPercent ?? 120) > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900/70 to-cyan-950/40 border border-purple-500/30 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-cyan)] flex items-center justify-center text-black font-black text-xl shrink-0 shadow-[0_0_15px_rgba(192,38,211,0.5)]">
                %
              </div>
              <div>
                <div className="text-xs font-sub font-bold text-amber-300 uppercase tracking-wider">
                  {bonusSettings?.welcomeBonusTitle || 'WELCOME BONUS'}
                </div>
                <div className="font-heading font-extrabold text-base sm:text-lg text-white">
                  {bonusSettings?.welcomeBonusPercent ?? 120}% Match Bonus + Free 10,000 GC Credits
                </div>
                {bonusSettings?.welcomeBonusSubtitle && (
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug m-0">
                    {bonusSettings.welcomeBonusSubtitle}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Freeplay Feedback Banner */}
          {freeplayFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                freeplayFeedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : freeplayFeedback.type === 'info'
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                  : 'bg-red-950/80 border-red-500 text-red-200'
              }`}
            >
              {freeplayFeedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-cyan-400 shrink-0" />
              )}
              <span>{freeplayFeedback.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {bonusSettings?.freeplayActive !== false && (
              <button
                onClick={handleGetFreeplay}
                className="cyber-btn-cyan py-3 px-6 text-sm font-black flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)]"
              >
                <Gift size={17} className="text-black" />
                <span>GET ${Number(bonusSettings?.freeplayAmountSC ?? 3).toFixed(0)} FREEPLAY</span>
              </button>
            )}

            <button
              onClick={() => router.push('/deposit')}
              className="cyber-btn-purple py-3 px-6 text-sm"
            >
              <Wallet size={17} />
              <span>INSTANT DEPOSIT</span>
            </button>

            <button
              onClick={() => router.push('/games')}
              className="cyber-btn-outline py-3 px-5 text-sm"
            >
              <Sparkles size={17} />
              <span>EXPLORE ALL GAMES</span>
            </button>
          </div>

          {/* Mini Trust Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-sub">
                <Clock size={13} className="text-emerald-400" />
                <span>CASHOUT SPEED</span>
              </div>
              <div className="font-heading font-bold text-sm text-white">Under 5 Min</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-sub">
                <ShieldCheck size={13} className="text-[var(--neon-cyan)]" />
                <span>PAYOUT RATIO</span>
              </div>
              <div className="font-heading font-bold text-sm text-emerald-400">100% Guaranteed</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-sub">
                <Sparkles size={13} className="text-amber-400" />
                <span>PLATFORMS</span>
              </div>
              <div className="font-heading font-bold text-sm text-white">10+ Verified</div>
            </div>
          </div>
        </div>
      </div>

      <FreeplayTaskModal
        isOpen={freeplayModalOpen}
        onClose={() => setFreeplayModalOpen(false)}
        user={user}
        freeplayAmount={bonusSettings?.freeplayAmountSC ?? 3}
        onSuccess={(data) => {
          setFreeplayFeedback({
            type: 'success',
            message: data.message || 'Freeplay task submitted successfully! Staff is reviewing your proof.',
          });
          setTimeout(() => setFreeplayFeedback(null), 8000);
        }}
      />
    </div>
  );
}
