'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  X,
  KeyRound,
  Gamepad2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';
import { readAdminGamesFromCache, refreshAdminGamesCatalog } from '@/lib/playerGamesCatalog';
import { broadcastPlayerAccountsUpdated } from '@/lib/playerAccountSync';
import { broadcastStaffNewRequest } from '@/lib/staffAlertsSync';
import { fetchJsonWithTimeout } from '@/lib/fetchWithTimeout';
import { getCachedUser } from '@/lib/authClient';

function mapCatalogGames(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((g) => g && g.isActive !== false)
    .map((g) => ({
      ...g,
      title: cleanGameTitle(g.title || g.name || ''),
    }))
    .filter((g) => g.title);
}

export default function GameRequestModal({
  isOpen,
  onClose,
  initialGame = null,
  user,
  catalogGames = [],
  onRequestCreated,
  onOpenAuth,
}) {
  const router = useRouter();
  const [portalReady, setPortalReady] = useState(false);
  const [adminGames, setAdminGames] = useState(() => mapCatalogGames(catalogGames));
  const [loadingGames, setLoadingGames] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedGame, setSelectedGame] = useState(
    initialGame?.title ? cleanGameTitle(initialGame.title) : ''
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ error: '', success: '' });

  const platforms = useMemo(
    () =>
      adminGames.map((g) => ({
        title: g.title,
        category: g.category || 'Sweepstakes',
        badge: g.badge || (g.isHot ? 'HOT' : g.isFeatured ? 'POPULAR' : 'OFFICIAL'),
      })),
    [adminGames]
  );

  const pickDefaultGame = useCallback(
    (list, accounts, pending) => {
      const accTitles = (accounts || []).map((a) => (a.gameTitle || '').toLowerCase().trim());
      const pendTitles = (pending || []).map((p) => (p.gameTitle || '').toLowerCase().trim());

      if (initialGame?.title) {
        const initClean = cleanGameTitle(initialGame.title);
        const initLower = initClean.toLowerCase().trim();
        if (!accTitles.includes(initLower) && !pendTitles.includes(initLower)) {
          return initClean;
        }
      }

      const firstAvailable = list.find((g) => {
        const t = (g.title || '').toLowerCase().trim();
        return t && !accTitles.includes(t) && !pendTitles.includes(t);
      });
      return firstAvailable?.title || list[0]?.title || '';
    },
    [initialGame]
  );

  const loadGamesCatalog = useCallback(async () => {
    setLoadingGames(true);
    try {
      const cached = readAdminGamesFromCache();
      if (cached?.length) {
        const mapped = mapCatalogGames(cached);
        setAdminGames(mapped);
        setSelectedGame((prev) => prev || pickDefaultGame(mapped, existingAccounts, pendingRequests));
      }
      if (catalogGames?.length) {
        const mapped = mapCatalogGames(catalogGames);
        if (mapped.length) setAdminGames(mapped);
      }
      const fresh = mapCatalogGames(await refreshAdminGamesCatalog({ force: true }));
      if (fresh.length) {
        setAdminGames(fresh);
        setSelectedGame((prev) => {
          if (prev && fresh.some((g) => g.title === prev)) return prev;
          return pickDefaultGame(fresh, existingAccounts, pendingRequests);
        });
      }
    } finally {
      setLoadingGames(false);
    }
  }, [catalogGames, existingAccounts, pendingRequests, pickDefaultGame]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setStatus({ error: '', success: '' });
    if (catalogGames?.length) {
      const mapped = mapCatalogGames(catalogGames);
      setAdminGames(mapped);
      setSelectedGame((prev) => prev || pickDefaultGame(mapped, [], []));
    }
    loadGamesCatalog();

    if (!user?.email) return;

    fetch('/api/game-accounts', { credentials: 'include', cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) return;
        diffSet(setExistingAccounts, data.gameAccounts || []);
        diffSet(setPendingRequests, data.pendingRequests || []);
        setSelectedGame((prev) =>
          prev || pickDefaultGame(adminGames.length ? adminGames : mapCatalogGames(catalogGames), data.gameAccounts, data.pendingRequests)
        );
      })
      .catch(() => {});
  }, [isOpen, user?.email, initialGame?.title]);

  useEffect(() => {
    if (isOpen && adminGames.length && user?.email) {
      setSelectedGame((prev) => {
        if (prev) return prev;
        return pickDefaultGame(adminGames, existingAccounts, pendingRequests);
      });
    }
  }, [adminGames, existingAccounts, pendingRequests, isOpen, pickDefaultGame, user?.email]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !portalReady) return null;

  const isPlatformReady = (title) => {
    const t = title.toLowerCase().trim();
    return existingAccounts.some((a) => (a.gameTitle || '').toLowerCase().trim() === t);
  };

  const isPlatformPending = (title) => {
    const t = title.toLowerCase().trim();
    return pendingRequests.some((p) => (p.gameTitle || '').toLowerCase().trim() === t);
  };

  const selectedReady = selectedGame && isPlatformReady(selectedGame);
  const selectedPending = selectedGame && isPlatformPending(selectedGame);
  const canSubmit = selectedGame && !selectedReady && !selectedPending && platforms.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const activeUser = user || getCachedUser();
    if (!activeUser?.email) {
      onClose();
      onOpenAuth('login');
      return;
    }

    if (!selectedGame) {
      setStatus({ error: 'Please choose a game platform first.', success: '' });
      return;
    }

    if (isPlatformReady(selectedGame)) {
      setStatus({
        error: `You already have credentials for ${selectedGame}.`,
        success: '',
      });
      return;
    }

    if (isPlatformPending(selectedGame)) {
      setStatus({
        error: `A request for ${selectedGame} is already pending.`,
        success: '',
      });
      return;
    }

    setStatus({ error: '', success: '' });
    setLoading(true);

    const picked = adminGames.find((g) => g.title === selectedGame);
    const gameId = picked?.gameId || picked?.id || picked?._id || '';

    try {
      const { res, data } = await fetchJsonWithTimeout(
        '/api/account-requests',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameTitle: selectedGame,
            gameId,
            requestType: 'ACCOUNT_CREATION',
            transferAmount: 0,
            userEmail: activeUser.email,
            userName: activeUser.username || activeUser.email.split('@')[0],
          }),
        },
        28000
      );

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit account request.');
      }

      if (onRequestCreated) onRequestCreated();

      broadcastStaffNewRequest({
        requestId: data.requestId,
        request: data.request,
        gameTitle: selectedGame,
        userName: activeUser.username || activeUser.email.split('@')[0],
        userEmail: activeUser.email,
      });

      broadcastPlayerAccountsUpdated({ gameTitle: selectedGame, status: 'PENDING' });
      setLoading(false);
      onClose();
      router.push(
        `/game-accounts/provisioning?requestId=${data.requestId || ''}&game=${encodeURIComponent(selectedGame)}`
      );
    } catch (err) {
      setStatus({ error: err?.message || 'Could not submit request.', success: '' });
      setLoading(false);
    }
  };

  const modal = (
    <div
      className="cyber-modal-overlay"
      style={{ zIndex: 10050 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-request-title"
    >
      <div
        className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl border border-[var(--chrome-border)] bg-[var(--bg-deep)] p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.85)] custom-scrollbar overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--neon-purple)]/15 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors z-20"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--neon-purple)] to-pink-500 flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(192,38,211,0.4)]">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 id="game-request-title" className="font-heading font-black text-xl text-white">
              REQUEST GAME ID
            </h2>
            <p className="text-xs text-slate-400">Choose a game, then submit</p>
          </div>
        </div>

        {status.error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center gap-2 text-xs text-red-200">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{status.error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="game-request-select" className="block text-[11px] font-sub font-bold text-slate-300 mb-2 uppercase">
              Select game platform *
            </label>

            {loadingGames && platforms.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                <RefreshCw size={14} className="animate-spin text-[var(--neon-cyan)]" />
                Loading games…
              </div>
            ) : platforms.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-100 space-y-2">
                <p>No games available right now.</p>
                <button
                  type="button"
                  onClick={loadGamesCatalog}
                  className="text-[11px] font-bold text-amber-300 underline"
                >
                  Retry loading games
                </button>
              </div>
            ) : (
              <>
                <select
                  id="game-request-select"
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-heading font-bold text-sm focus:outline-none focus:border-[var(--neon-cyan)] mb-3"
                >
                  {platforms.map((p) => {
                    const disabled = isPlatformReady(p.title) || isPlatformPending(p.title);
                    return (
                      <option key={p.title} value={p.title} disabled={disabled} className="bg-slate-900">
                        {p.title}
                        {isPlatformReady(p.title) ? ' — ID ready' : ''}
                        {isPlatformPending(p.title) ? ' — pending' : ''}
                      </option>
                    );
                  })}
                </select>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {platforms.map((p) => {
                    const isSelected = selectedGame === p.title;
                    const isReady = isPlatformReady(p.title);
                    const isPending = isPlatformPending(p.title);
                    const isDisabled = isReady || isPending;

                    return (
                      <button
                        key={`row-${p.title}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedGame(p.title)}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                          isDisabled
                            ? 'opacity-60 bg-slate-950/80 border-slate-800 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[var(--neon-purple)]/20 border-[var(--neon-purple)] shadow-[0_0_15px_rgba(192,38,211,0.3)]'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Gamepad2 size={18} className="shrink-0 text-[var(--neon-cyan)]" />
                          <span className="font-heading font-bold text-xs text-white truncate">{p.title}</span>
                        </div>
                        {isReady && <span className="text-[9px] text-emerald-400 font-bold">READY</span>}
                        {isPending && <span className="text-[9px] text-amber-400 font-bold">PENDING</span>}
                        {!isReady && !isPending && isSelected && (
                          <CheckCircle2 size={14} className="text-[var(--neon-cyan)] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-white font-semibold mb-1">
              <Sparkles size={14} className="text-amber-400" />
              <span>Staff issues credentials in minutes</span>
            </div>
            <p className="text-[11px]">Track status under <strong className="text-slate-200">My Game IDs</strong>.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full cyber-btn-cyan py-3 rounded-xl font-heading font-black text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'SUBMITTING…'
              : selectedReady
              ? 'ID ALREADY CREATED'
              : selectedPending
              ? 'REQUEST PENDING'
              : !platforms.length
              ? 'NO GAMES TO REQUEST'
              : 'SUBMIT ID REQUEST'}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
