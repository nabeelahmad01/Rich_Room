'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  KeyRound,
  Gamepad2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';

export default function GameRequestModal({
  isOpen,
  onClose,
  initialGame = null,
  user,
  onRequestCreated,
  onOpenAuth,
}) {
  const router = useRouter();
  const [adminGames, setAdminGames] = useState([]);
  const [existingAccounts, setExistingAccounts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedGame, setSelectedGame] = useState(initialGame?.title ? cleanGameTitle(initialGame.title) : '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ error: '', success: '' });

  const platforms = adminGames.map((g) => ({
    title: cleanGameTitle(g.title || ''),
    category: g.category || 'Sweepstakes',
    badge: g.badge || (g.isHot ? 'HOT' : (g.isFeatured ? 'POPULAR' : 'OFFICIAL')),
  }));

  useEffect(() => {
    if (isOpen) {
      // 1. Fetch live admin games
      fetch('/api/games', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.games) && data.games.length > 0) {
            const cleanList = data.games.map((g) => ({
              ...g,
              title: cleanGameTitle(g.title || '')
            }));
            diffSet(setAdminGames, cleanList);
            if (!initialGame?.title) {
              setSelectedGame(cleanList[0]?.title || '');
            }
          }
        })
        .catch(() => {});

      // 2. Fetch user existing game accounts and pending requests
      if (user?.email) {
        fetch(`/api/game-accounts?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              diffSet(setExistingAccounts, data.gameAccounts || []);
              diffSet(setPendingRequests, data.pendingRequests || []);

              const accTitles = (data.gameAccounts || []).map((a) => (a.gameTitle || '').toLowerCase().trim());
              const pendTitles = (data.pendingRequests || []).map((p) => (p.gameTitle || '').toLowerCase().trim());

              if (initialGame?.title) {
                const initClean = cleanGameTitle(initialGame.title);
                const initLower = initClean.toLowerCase().trim();
                if (!accTitles.includes(initLower) && !pendTitles.includes(initLower)) {
                  setSelectedGame(initClean);
                  return;
                }
              }

              const firstAvailable = platforms.find((p) => {
                const t = p.title.toLowerCase().trim();
                return !accTitles.includes(t) && !pendTitles.includes(t);
              });
              if (firstAvailable) {
                setSelectedGame(firstAvailable.title);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, user?.email, initialGame]);

  if (!isOpen) return null;

  const isPlatformReady = (title) => {
    const t = title.toLowerCase().trim();
    return existingAccounts.some((a) => (a.gameTitle || '').toLowerCase().trim() === t);
  };

  const isPlatformPending = (title) => {
    const t = title.toLowerCase().trim();
    return pendingRequests.some((p) => (p.gameTitle || '').toLowerCase().trim() === t);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onClose();
      onOpenAuth('login');
      return;
    }

    if (isPlatformReady(selectedGame)) {
      setStatus({
        error: `Aap ke paas pehle se hi ${selectedGame} ke credentials majood hain! Dobara request nahi ki ja sakti.`,
        success: '',
      });
      return;
    }

    if (isPlatformPending(selectedGame)) {
      setStatus({
        error: `Aap ki ${selectedGame} ki request pehle se pending hai. Staff jald credentials issue karega.`,
        success: '',
      });
      return;
    }

    setStatus({ error: '', success: '' });
    setLoading(true);

    try {
      const res = await fetch('/api/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle: selectedGame,
          requestType: 'ACCOUNT_CREATION',
          transferAmount: 0,
          userEmail: user.email,
          userName: user.username,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit account request.');
      }

      if (onRequestCreated) onRequestCreated();

      // Instant cross-tab broadcast so admin tab receives alert in 0ms!
      try {
        const ch = new BroadcastChannel('paradise_staff_alerts');
        ch.postMessage({
          type: 'NEW_REQUEST',
          category: 'ACCOUNT_CREATION',
          gameTitle: selectedGame,
          userName: user.username,
          userEmail: user.email,
          timestamp: Date.now(),
        });
        ch.close();
      } catch {}
      try {
        localStorage.setItem('paradise_staff_event', JSON.stringify({
          type: 'NEW_REQUEST',
          category: 'ACCOUNT_CREATION',
          gameTitle: selectedGame,
          userName: user.username,
          time: Date.now(),
        }));
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('accountRequestUpdated'));
      }
      onClose();
      router.push(`/game-accounts/provisioning?requestId=${data.requestId || ''}&game=${encodeURIComponent(selectedGame)}`);
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cyber-modal-overlay">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--chrome-border)] bg-[var(--bg-deep)] p-5 sm:p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] custom-scrollbar">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--neon-purple)]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors z-20"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--neon-purple)] to-pink-500 flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(192,38,211,0.4)]">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 className="font-heading font-black text-xl text-white">
              REQUEST GAME ID
            </h2>
            <p className="text-xs text-slate-400">
              Get official login credentials for your favorite platform
            </p>
          </div>
        </div>

        {/* Status alert */}
        {status.error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center gap-2 text-xs text-red-200">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{status.error}</span>
          </div>
        )}
        {status.success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-200">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{status.success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-sub font-bold text-slate-300 mb-2">
              SELECT GAME PLATFORM
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {platforms.map((p) => {
                const isSelected = selectedGame === p.title;
                const isReady = isPlatformReady(p.title);
                const isPending = isPlatformPending(p.title);
                const isDisabled = isReady || isPending;

                return (
                  <div
                    key={p.title}
                    onClick={() => {
                      if (!isDisabled) setSelectedGame(p.title);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isDisabled
                        ? 'opacity-60 bg-slate-950/80 border-slate-800 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[var(--neon-purple)]/20 border-[var(--neon-purple)] shadow-[0_0_15px_rgba(192,38,211,0.3)] cursor-pointer'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Gamepad2
                        size={18}
                        className={
                          isReady
                            ? 'text-emerald-400'
                            : isPending
                            ? 'text-amber-400'
                            : isSelected
                            ? 'text-[var(--neon-cyan)]'
                            : 'text-slate-500'
                        }
                      />
                      <div>
                        <div className="font-heading font-bold text-xs text-white flex items-center gap-2">
                          <span>{p.title}</span>
                          {isReady && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                              ✓ ID CREATED
                            </span>
                          )}
                          {isPending && (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded">
                              ⏳ PENDING
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{p.category}</div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isReady
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          : isSelected
                          ? 'bg-[var(--neon-purple)] text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isReady ? 'ACTIVE' : isPending ? 'WAITING' : p.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <Sparkles size={14} className="text-amber-400" />
              <span>Instant Staff Processing</span>
            </div>
            <p className="text-[11px]">
              Upon request, staff will generate your exclusive username and password. You can access it anytime under <strong className="text-slate-200">My Game IDs</strong>.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || isPlatformReady(selectedGame) || isPlatformPending(selectedGame)}
            className="w-full cyber-btn-cyan py-3 rounded-xl font-heading font-black text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'SUBMITTING REQUEST...'
              : isPlatformReady(selectedGame)
              ? 'ID ALREADY CREATED ✓'
              : isPlatformPending(selectedGame)
              ? 'REQUEST ALREADY PENDING ⏳'
              : 'SUBMIT ID REQUEST'}
          </button>
        </form>
      </div>
    </div>
  );
}
