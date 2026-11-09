'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import {
  DEFAULT_CASHOUT_RULES,
  formatPlayerFacingCopy,
  resolveCashoutRulesText,
} from '@/lib/cashoutPolicy';
import { fetchPublicSettings, getInstantCashoutRulesDisplay } from '@/lib/publicSettingsClient';

export default function CashoutRulesView({ isEmbedded = true }) {
  const [cashoutRules, setCashoutRules] = useState(getInstantCashoutRulesDisplay);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const applyPayload = useCallback((payload) => {
    if (!payload?.cashoutRules) return;
    const display = formatPlayerFacingCopy(resolveCashoutRulesText(payload));
    setCashoutRules(display);
  }, []);

  const loadRules = useCallback(async (silent = true) => {
    if (!silent) setRefreshing(true);
    setLoadError(null);
    try {
      const payload = await fetchPublicSettings({ force: true });
      if (payload?.cashoutRules) {
        applyPayload(payload);
      } else {
        throw new Error('Could not load cashout rules');
      }
    } catch (err) {
      setLoadError(err.message || 'Network error');
      setCashoutRules((prev) => prev || formatPlayerFacingCopy(DEFAULT_CASHOUT_RULES));
    } finally {
      setRefreshing(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    loadRules(true);

    const onFocus = () => loadRules(true);
    const onSettingsSync = () => loadRules(true);

    let bc = null;
    try {
      bc = new BroadcastChannel('paradise_settings_sync');
      bc.onmessage = onSettingsSync;
    } catch {}
    const onStorage = (e) => {
      if (e.key === 'paradise_settings_sync') onSettingsSync();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('storage', onStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [loadRules]);

  return (
    <main
      className={`flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 space-y-6 ${
        isEmbedded ? 'py-6' : 'py-8 pb-28 xl:pb-10'
      }`}
    >
      <div className="space-y-2">
        <span className="text-xs font-heading font-bold text-[var(--neon-cyan)] flex items-center gap-1.5">
          <ShieldCheck size={16} /> OFFICIAL CASHOUT &amp; REDEMPTION POLICY
        </span>
        <h1 className="text-3xl font-black font-heading text-white">CASHOUT RULES &amp; GUIDELINES</h1>
        <p className="text-xs text-slate-400">USA Sweepstakes Standard • 24/7 Verified Redemptions</p>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/90 border border-[var(--chrome-border)] shadow-[0_10px_35px_rgba(0,0,0,0.5)] space-y-5 text-sm text-slate-200 leading-relaxed">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_10px_var(--neon-cyan)] animate-pulse" />
            <h2 className="font-heading font-black text-sm text-[var(--neon-cyan)] uppercase tracking-wider">
              Official Cashout Policy
            </h2>
            {refreshing && (
              <RefreshCw size={12} className="text-slate-500 animate-spin" aria-hidden />
            )}
          </div>
          <button
            type="button"
            onClick={() => loadRules(false)}
            className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="whitespace-pre-line text-xs sm:text-sm font-sans leading-relaxed text-slate-200">
          {cashoutRules || formatPlayerFacingCopy(DEFAULT_CASHOUT_RULES)}
        </div>

        {loadError && (
          <p className="text-[10px] text-amber-300/90 border border-amber-500/30 bg-amber-950/30 rounded-xl px-3 py-2">
            Showing saved copy — live refresh failed ({loadError}). Tap Refresh to retry.
          </p>
        )}
      </div>

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
  );
}
