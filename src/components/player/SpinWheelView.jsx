'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Gift,
  Award,
  AlertCircle,
  Wallet,
  CheckCircle2
} from 'lucide-react';
import { WHEEL_SLICES } from '@/lib/wheelConstants';

export default function SpinWheelView({ user: propUser, onSelectTab }) {
  const [user, setUser] = useState(propUser || null);
  const [canSpin, setCanSpin] = useState(false);
  const [availableSpins, setAvailableSpins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [winResult, setWinResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/daily-spin');
      const d = await res.json();
      if (d.success) {
        setCanSpin(Boolean(d.canSpin));
        setAvailableSpins(d.availableSpins || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUser();
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const slices = WHEEL_SLICES || [
    { label: '$0.50', amount: 0.5, color: '#00F0FF', isBadLuck: false },
    { label: 'TRY AGAIN', amount: 0, color: '#334155', isBadLuck: true },
    { label: '$1.00', amount: 1.0, color: '#A855F7', isBadLuck: false },
    { label: '$2.00', amount: 2.0, color: '#10B981', isBadLuck: false },
    { label: '$5.00', amount: 5.0, color: '#F59E0B', isBadLuck: false },
    { label: 'TRY AGAIN', amount: 0, color: '#475569', isBadLuck: true },
    { label: '$10.00', amount: 10.0, color: '#EC4899', isBadLuck: false },
    { label: '$25.00', amount: 25.0, color: '#EAB308', isBadLuck: false },
  ];

  const sliceAngle = 360 / slices.length;

  const handleSpin = async () => {
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
      const baseRevolutions = 5 * 360;
      const finalDegree = rotationDegree + baseRevolutions + (360 - (targetSliceCenter % 360));

      setRotationDegree(finalDegree);

      setTimeout(() => {
        setSpinning(false);
        setCanSpin(Boolean(data.canSpin));
        setAvailableSpins(data.availableSpins || 0);
        setWinResult({ amount: data.winAmount, isBadLuck: data.isBadLuck });
        fetchUser();
        window.dispatchEvent(new CustomEvent('balanceUpdated'));

        if (!data.isBadLuck && data.winAmount > 0) {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#00F0FF', '#10B981', '#F59E0B', '#EC4899'],
          });
        }
      }, 4500);
    } catch (err) {
      setLoading(false);
      setSpinning(false);
      setErrorMessage(err.message || 'Network error occurred.');
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-[#0c102b] p-6 sm:p-8 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles size={14} className="text-amber-400" />
              <span>Depositor Exclusive Lucky Wheel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
              LUCKY <span className="text-amber-400">SPIN WHEEL</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Get 2 Free Spins on every approved deposit! Win real wallet cash directly credited with zero playthrough requirements.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 flex flex-col items-end min-w-[160px]">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">WALLET BALANCE</span>
            <span className="font-mono font-black text-2xl sm:text-3xl text-emerald-400 mt-0.5">
              ${Number(user?.balance ?? user?.balanceSC ?? 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1 mt-1">
              <Sparkles size={11} className="text-amber-400" /> {availableSpins} Free Spins Available
            </span>
          </div>
        </div>
      </div>

      {/* Main Wheel Card */}
      <div className="p-6 sm:p-10 rounded-3xl bg-[#0d102b] border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Wheel */}
        <div className="relative flex flex-col items-center justify-center my-4">
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center">
            {/* Pointer */}
            <div className="absolute -top-4 z-20 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[30px] border-t-amber-400" />
              <div className="w-3.5 h-3.5 rounded-full bg-amber-300 -mt-8 shadow-sm" />
            </div>

            {/* Rotating SVG */}
            <div
              className="w-full h-full rounded-full border-4 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.45)] overflow-hidden"
              style={{
                transform: `rotate(${rotationDegree}deg)`,
                transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.95, 0.35, 1)' : 'none',
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {slices.map((slice, index) => {
                  const angle = sliceAngle;
                  const startAngle = index * angle;
                  const endAngle = startAngle + angle;

                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);

                  const x1 = 50 + 50 * Math.cos(startRad);
                  const y1 = 50 + 50 * Math.sin(startRad);
                  const x2 = 50 + 50 * Math.cos(endRad);
                  const y2 = 50 + 50 * Math.sin(endRad);

                  const textAngle = startAngle + angle / 2;
                  const textRad = (textAngle - 90) * (Math.PI / 180);
                  const tx = 50 + 34 * Math.cos(textRad);
                  const ty = 50 + 34 * Math.sin(textRad);

                  return (
                    <g key={index}>
                      <path
                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                        fill={slice.color}
                        stroke="#070919"
                        strokeWidth="1"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill="#FFFFFF"
                        fontSize="6"
                        fontWeight="900"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                      >
                        {slice.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Hub */}
            <div className="absolute z-10 w-20 h-20 rounded-full bg-slate-950 border-4 border-amber-400 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(0,0,0,0.9)] pointer-events-none">
              <Gift size={24} className="text-amber-400" />
            </div>
          </div>
        </div>

        {/* Win announcement */}
        {winResult !== null && (
          <div
            className={`my-4 p-4 rounded-2xl border text-center animate-bounce max-w-md w-full ${
              winResult.isBadLuck
                ? 'bg-slate-900/90 border-slate-700 text-slate-300'
                : 'bg-emerald-950/80 border-emerald-500/70 text-emerald-200'
            }`}
          >
            <div
              className={`flex items-center justify-center gap-2 font-heading font-black text-xl ${
                winResult.isBadLuck ? 'text-amber-400' : 'text-emerald-300'
              }`}
            >
              <Award size={24} className={winResult.isBadLuck ? 'text-slate-400' : 'text-amber-400'} />
              <span>
                {winResult.isBadLuck
                  ? 'BAD LUCK! TRY AGAIN'
                  : `CONGRATULATIONS! YOU WON $${Number(winResult.amount).toFixed(2)} SC!`}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {winResult.isBadLuck
                ? 'Better luck on your next spin! Keep playing.'
                : 'Added directly to your balance. Ready to play!'}
            </p>
          </div>
        )}

        {/* Error banner */}
        {errorMessage && (
          <div className="my-3 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-xs text-red-200 text-center flex items-center justify-center gap-2 max-w-md w-full">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Spin CTA Button */}
        <div className="w-full max-w-md mt-4">
          {canSpin ? (
            <button
              onClick={handleSpin}
              disabled={spinning || loading}
              className="w-full py-4 rounded-2xl font-heading font-black text-lg sm:text-xl tracking-wider bg-gradient-to-r from-amber-400 via-orange-500 to-[var(--neon-cyan)] text-black shadow-[0_0_35px_rgba(245,158,11,0.5)] hover:scale-102 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {spinning
                ? 'SPINNING THE WHEEL...'
                : loading
                ? 'CHECKING...'
                : `SPIN NOW (${availableSpins} SPINS AVAILABLE)`}
            </button>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={16} />
                <span>DEPOSITOR FREE SPINS</span>
              </div>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Free spins are awarded exclusively to depositors! You receive <strong className="text-emerald-400">2 Free Spins</strong> on every deposit approved by admin.
              </p>
              <button
                onClick={() => {
                  if (typeof onSelectTab === 'function') onSelectTab('deposit', '/deposit');
                }}
                className="cyber-btn-cyan py-3 px-6 text-sm font-black w-full flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)]"
              >
                <Wallet size={16} />
                <span>MAKE A DEPOSIT FOR 2 FREE SPINS</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
