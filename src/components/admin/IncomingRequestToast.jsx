'use client';

import React, { useEffect } from 'react';
import { Bell, ArrowRight, X, DollarSign, Wallet, Gamepad2, Headphones, KeyRound } from 'lucide-react';

export default function IncomingRequestToast({ alert, onDismiss, onViewRequest }) {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 10000);
    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const getIcon = () => {
    if (alert.type === 'deposit') return <DollarSign size={18} className="text-amber-400" />;
    if (alert.type === 'redemption') return <Wallet size={18} className="text-[var(--neon-purple)]" />;
    if (alert.type === 'chat') return <Headphones size={18} className="text-pink-400" />;
    if (alert.type === 'account') return <KeyRound size={18} className="text-[var(--neon-cyan)]" />;
    return <Gamepad2 size={18} className="text-[var(--neon-cyan)]" />;
  };

  const getBorderColor = () => {
    if (alert.type === 'deposit') return 'border-amber-500/50 shadow-amber-500/20';
    if (alert.type === 'redemption') return 'border-amber-600/50 shadow-purple-500/20';
    if (alert.type === 'chat') return 'border-pink-500/50 shadow-pink-500/20';
    if (alert.type === 'account') return 'border-amber-500/50 shadow-amber-500/20';
    return 'border-amber-500/50 shadow-amber-500/20';
  };

  return (
    <div className="fixed top-20 right-4 z-[90] max-w-sm w-full animate-slideInRight">
      <div
        onClick={() => {
          if (onViewRequest) onViewRequest(alert);
          onDismiss();
        }}
        className={`p-4 rounded-2xl bg-[#0e1224]/95 backdrop-blur-xl border ${getBorderColor()} shadow-2xl flex flex-col gap-3 transition-all cursor-pointer hover:scale-[1.02]`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  {alert.title || 'New Request Received'}
                </h4>
              </div>
              <p className="text-sm font-bold text-amber-300 mt-0.5">{alert.message}</p>
              {alert.subtext && <p className="text-[11px] text-gray-400 mt-0.5">{alert.subtext}</p>}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onViewRequest) onViewRequest(alert);
              onDismiss();
            }}
            className={
              alert.type === 'chat'
                ? 'px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-amber-700 hover:from-pink-400 hover:to-amber-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-pink-500/20'
                : 'px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20'
            }
          >
            <span>{alert.type === 'chat' ? 'Open Chat & Reply' : 'Review Request'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
