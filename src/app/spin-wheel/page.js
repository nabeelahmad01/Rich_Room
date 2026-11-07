'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Gift,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Gamepad2,
  Zap
} from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberFooter from '@/components/common/CyberFooter';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import { WHEEL_SLICES } from '@/lib/wheelConstants';
import { getInitialPlayerUser, writeCachedPlayer, readCachedPlayer } from '@/lib/playerSessionCache';

export default function SpinWheelPage() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(getInitialPlayerUser);
  const [canSpin, setCanSpin] = useState(false);
  const [availableSpins, setAvailableSpins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [winResult, setWinResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/daily-spin', { cache: 'no-store' }),
      ]);
      const [uData, sData] = await Promise.all([uRes.json(), sRes.json()]);

      if (uData.authenticated && uData.user) {
        writeCachedPlayer(uData.user);
        setUser(uData.user);
      }
      if (sData.success) {
        setCanSpin(Boolean(sData.canSpin));
        setAvailableSpins(sData.availableSpins || 0);
      }
    } catch (e) {
      console.error('Failed to check spin status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const slices = WHEEL_SLICES || [
    { label: '$1 SC', value: 1, color: '#3B82F6' },
    { label: '$2 SC', value: 2, color: '#10B981' },
    { label: '$3 SC', value: 3, color: '#8B5CF6' },
    { label: '$5 SC', value: 5, color: '#F59E0B' },
    { label: '$10 SC', value: 10, color: '#EC4899' },
    { label: '$15 SC', value: 15, color: '#06B6D4' },
    { label: '$25 SC', value: 25, color: '#F97316' },
    { label: '$50 SC', value: 50, color: '#E11D48' },
  ];

  const sliceAngle = 360 / slices.length;

  const handleSpin = async () => {
    if (!user && !readCachedPlayer()) {
      router.push('/login?redirect=/spin-wheel');
      return;
    }
    if (!canSpin || spinning || loading) return;
    setLoading(true);
    setErrorMessage('');
    setWinResult(null);

    try {
      const res = await fetch('/api/daily-spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Spin failed.');
        setLoading(false);
        setCanSpin(Boolean(data.canSpin));
        setAvailableSpins(data.availableSpins || 0);
        return;
      }

      setSpinning(true);
      setLoading(false);

      const targetIndex = data.sliceIndex;
      const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
      const baseRevolutions = 6 * 360;
      const finalDegree = rotationDegree + baseRevolutions + (360 - (targetSliceCenter % 360));

      setRotationDegree(finalDegree);

      setTimeout(() => {
        setSpinning(false);
        setCanSpin(Boolean(data.canSpin));
        setAvailableSpins(data.availableSpins || 0);
        setWinResult({ amount: data.winAmount, isBadLuck: data.isBadLuck });
        fetchStatus();

        if (!data.isBadLuck && data.winAmount > 0) {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#00F0FF', '#10B981', '#F59E0B', '#EC4899', '#C026D3'],
          });
        }
      }, 4500);
    } catch (e) {
      setErrorMessage(e.message || 'Network error.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col font-sans selection:bg-[var(--neon-cyan)] selection:text-black">
      <CyberSidebar
        collapsed={false}
        setCollapsed={() => {}}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        onOpenWallet={() => router.push('/deposit')}
        onOpenGameRequest={() => router.push('/games')}
        onOpenChat={() => {}}
      />

      <div className="flex-1 flex flex-col xl:pl-64">
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
          onOpenAuth={(mode) => router.push(`/${mode}`)}
          onOpenWallet={() => router.push('/deposit')}
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 xl:pb-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-heading font-black shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Gift size={14} className="animate-pulse" />
              <span>OFFICIAL VIP LUCKY FREE SPIN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>WIN UP TO $50 SC</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading tracking-tight text-white">
              DAILY <span className="bg-gradient-to-r from-amber-300 via-[var(--neon-cyan)] to-[var(--neon-purple)] bg-clip-text text-transparent">LUCKY WHEEL</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Spin daily for free real Sweeps Cash &amp; Game Coins. All winnings are credited instantly to your wallet.
            </p>
          </div>

          {/* Wheel Arena */}
          <div className="relative max-w-lg mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0e1333] via-[#090d24] to-[#050714] border border-[var(--chrome-border)] shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col items-center">
            {/* Ambient Lighting */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Status Badge */}
            <div className="flex items-center gap-2 mb-6 z-10">
              <span className="px-3 py-1 rounded-full text-xs font-heading font-black bg-slate-900 border border-slate-700 text-white flex items-center gap-1.5">
                <Trophy size={13} className="text-amber-400" />
                <span>SPINS REMAINING:</span>
                <strong className="text-[var(--neon-cyan)] font-mono">{availableSpins}</strong>
              </span>
            </div>

            {/* Pointer / Flapper Arrow at the Top */}
            <div className="relative z-20 mb-[-18px]">
              <div
                className="w-0 h-0 border-x-[16px] border-x-transparent border-t-[26px] border-t-amber-400 drop-shadow-[0_4px_12px_rgba(251,191,36,0.9)]"
                style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.8))' }}
              />
            </div>

            {/* Rotating SVG Wheel */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 my-2">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full drop-shadow-[0_0_30px_rgba(0,240,255,0.35)]"
                style={{
                  transform: `rotate(${rotationDegree}deg)`,
                  transition: spinning ? 'transform 4.5s cubic-bezier(0.12, 0.8, 0.2, 1)' : 'none',
                }}
              >
                <circle cx="200" cy="200" r="196" fill="#060919" stroke="#00F0FF" strokeWidth="6" />

                {slices.map((slice, i) => {
                  const startAngle = (i * sliceAngle - 90) * (Math.PI / 180);
                  const endAngle = ((i + 1) * sliceAngle - 90) * (Math.PI / 180);
                  const x1 = 200 + 190 * Math.cos(startAngle);
                  const y1 = 200 + 190 * Math.sin(startAngle);
                  const x2 = 200 + 190 * Math.cos(endAngle);
                  const y2 = 200 + 190 * Math.sin(endAngle);

                  const textAngle = i * sliceAngle + sliceAngle / 2;
                  const rad = (textAngle - 90) * (Math.PI / 180);
                  const textX = 200 + 125 * Math.cos(rad);
                  const textY = 200 + 125 * Math.sin(rad);

                  return (
                    <g key={i}>
                      <path
                        d={`M 200 200 L ${x1} ${y1} A 190 190 0 0 1 ${x2} ${y2} Z`}
                        fill={slice.color}
                        stroke="#0a0e27"
                        strokeWidth="3"
                        opacity="0.9"
                      />
                      <text
                        x={textX}
                        y={textY}
                        fill="#FFFFFF"
                        fontSize="17"
                        fontWeight="900"
                        fontFamily="Lexend, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                      >
                        {slice.label}
                      </text>
                    </g>
                  );
                })}

                {/* Outer Ring Studs */}
                {Array.from({ length: 24 }).map((_, idx) => {
                  const deg = (idx * 15) * (Math.PI / 180);
                  const px = 200 + 194 * Math.cos(deg);
                  const py = 200 + 194 * Math.sin(deg);
                  return <circle key={idx} cx={px} cy={py} r="3" fill="#FDE047" />;
                })}

                {/* Center Hub */}
                <circle cx="200" cy="200" r="42" fill="#0A0F29" stroke="#00F0FF" strokeWidth="4" />
                <circle cx="200" cy="200" r="28" fill="#F59E0B" />
              </svg>

              {/* Center Emblem Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-heading font-black text-xs text-black tracking-wider uppercase">
                  SPIN
                </span>
              </div>
            </div>

            {/* Spin CTA Button */}
            <div className="w-full mt-6 space-y-3 z-10">
              <button
                type="button"
                onClick={handleSpin}
                disabled={spinning || loading || (!canSpin && availableSpins <= 0)}
                className={`w-full py-4 rounded-2xl font-heading font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
                  canSpin || availableSpins > 0
                    ? 'bg-gradient-to-r from-amber-400 via-[var(--neon-cyan)] to-emerald-400 text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(0,240,255,0.5)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Zap size={18} />
                <span>
                  {spinning
                    ? 'SPINNING THE WHEEL...'
                    : loading
                    ? 'VERIFYING ELIGIBILITY...'
                    : canSpin || availableSpins > 0
                    ? 'SPIN NOW FOR FREE'
                    : 'NEXT DAILY SPIN LOCKED'}
                </span>
              </button>

              {/* Win Result Card */}
              {winResult && (
                <div
                  className={`p-4 rounded-2xl border text-center space-y-1 transition-all ${
                    winResult.amount > 0
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  <p className="font-heading font-black text-lg">
                    {winResult.amount > 0 ? `🎉 CONGRATULATIONS! YOU WON $${winResult.amount} SC!` : 'Better luck next time!'}
                  </p>
                  <p className="text-xs text-slate-300">
                    {winResult.amount > 0 ? 'Your winnings have been credited to your wallet balance.' : 'Check back tomorrow for another daily spin.'}
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {!canSpin && availableSpins <= 0 && (
                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                  <Clock size={12} className="text-amber-400" />
                  <span>Deposit to unlock +2 bonus spins, or return tomorrow!</span>
                </p>
              )}
            </div>
          </div>
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(mode) => router.push(`/${mode}`)}
        onOpenWallet={() => router.push('/deposit')}
        onOpenGameRequest={() => router.push('/games')}
      />
    </div>
  );
}
