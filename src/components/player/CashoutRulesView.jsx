'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import {
  DEFAULT_CASHOUT_RULES,
  formatPlayerFacingCopy,
  resolveCashoutRulesText,
} from '@/lib/cashoutPolicy';
import {
  CACHE_KEYS,
  readLocalCache,
  writeLocalCache,
} from '@/lib/playerDataCache';
import { LoadingInline } from '@/components/common/LoadState';

function hydrateRulesFromCache() {
  try {
    const cached = readLocalCache(CACHE_KEYS.SETTINGS_SNIPPET);
    if (cached?.cashoutRules) {
      return formatPlayerFacingCopy(resolveCashoutRulesText(cached));
    }
  } catch {}
  return '';
}

export default function CashoutRulesView({ isEmbedded = true }) {
  const [cashoutRules, setCashoutRules] = useState(hydrateRulesFromCache);
  const [loading, setLoading] = useState(() => !hydrateRulesFromCache());
  const [loadError, setLoadError] = useState(null);

  const loadRules = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/settings/public', { cache: 'no-store' });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Could not load cashout rules');
      }
      const text = resolveCashoutRulesText(data);
      const display = formatPlayerFacingCopy(text);
      setCashoutRules(display);
      writeLocalCache(CACHE_KEYS.SETTINGS_SNIPPET, {
        cashoutRules: text,
        minRedemptionSC: data.minRedemptionSC,
      });
    } catch (err) {
      setLoadError(err.message || 'Network error');
      const cached = readLocalCache(CACHE_KEYS.SETTINGS_SNIPPET);
      const fallback = formatPlayerFacingCopy(
        cached?.cashoutRules ? resolveCashoutRulesText(cached) : DEFAULT_CASHOUT_RULES
      );
      setCashoutRules(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasCache = !!hydrateRulesFromCache();
    loadRules(hasCache);
    const onFocus = () => loadRules(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
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
          </div>
          <button
            type="button"
            onClick={() => loadRules(false)}
            className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {loading && !cashoutRules ? (
          <LoadingInline label="Loading cashout rules…" />
        ) : (
          <div className="whitespace-pre-line text-xs sm:text-sm font-sans leading-relaxed text-slate-200">
            {cashoutRules || formatPlayerFacingCopy(DEFAULT_CASHOUT_RULES)}
          </div>
        )}

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
