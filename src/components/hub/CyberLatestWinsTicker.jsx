'use client';

import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { diffSet } from '@/lib/fastDiff';
import { fetchWinsTicker, getInstantWinsTicker } from '@/lib/winsTickerClient';

export default function CyberLatestWinsTicker() {
  const [wins, setWins] = useState(getInstantWinsTicker);

  useEffect(() => {
    let cancelled = false;

    const refresh = async (silent = true) => {
      const list = await fetchWinsTicker({ force: !silent });
      if (!cancelled && list?.length) {
        diffSet(setWins, list);
      }
    };

    refresh(true);
    const timer = setInterval(() => refresh(true), 45000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const doubleList = wins.length > 0 ? [...wins, ...wins] : [];

  return (
    <div className="w-full my-6 overflow-hidden rounded-2xl border border-[var(--chrome-border)]/60 bg-gradient-to-r from-[#070918] via-[#0d122b] to-[#070918] py-2.5 px-3 flex items-center gap-3 shadow-lg min-h-[52px]">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-black font-heading font-black text-xs shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
        <Trophy size={14} />
        <span>LATEST WINS</span>
      </div>

      <div className="flex-1 overflow-hidden relative min-h-[36px] flex items-center">
        <div className="ticker-slide-track gap-4 items-center">
          {doubleList.map((item, idx) => (
            <div
              key={`${item.username}-${item.gameTitle}-${idx}`}
              className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700/60 shrink-0 text-xs shadow-sm hover:border-[var(--neon-cyan)] transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] flex items-center justify-center font-bold text-[10px]">
                {(item.username || '?').charAt(0)}
              </div>
              <span className="font-semibold text-slate-300">{item.username}</span>
              <span className="text-slate-500">•</span>
              <span className="text-[var(--neon-purple-light)] font-medium">{item.gameTitle}</span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                +${Number(item.amount).toFixed(2)} {item.currency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
