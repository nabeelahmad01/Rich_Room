'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  Play,
  ArrowDownCircle,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Coins,
  Lock,
  X,
} from 'lucide-react';
import LoadCoinsModal from '@/components/modals/LoadCoinsModal';
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';
import { readCachedPlayer } from '@/lib/playerSessionCache';
import {
  readGameAccountsCache,
  writeGameAccountsCache,
} from '@/lib/gameAccountsClientCache';
import { subscribePlayerAccountsSync } from '@/lib/playerAccountSync';
import { broadcastStaffNewRequest } from '@/lib/staffAlertsSync';

const DEFAULT_GAME_THUMB = '/images/vegas-777.svg';

function normalizeGameTitleKey(s) {
  return cleanGameTitle(String(s || '')).toLowerCase().trim();
}

function mapSeedAccounts(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((a) => ({
    ...a,
    gameTitle: cleanGameTitle(a.gameTitle),
  }));
}

export default function PlayerGameAccountsHub({
  user,
  games = [],
  onOpenAuth,
  onPlayGame,
  onDeposit,
  seedReadyAccounts = null,
  seedPendingRequests = null,
}) {
  const router = useRouter();
  const resolvedEmail = user?.email || readCachedPlayer()?.email || '';

  const initialFromCache = resolvedEmail ? readGameAccountsCache(resolvedEmail) : null;
  const initialActive =
    seedReadyAccounts?.length > 0
      ? mapSeedAccounts(seedReadyAccounts)
      : initialFromCache?.active?.length
        ? initialFromCache.active
        : [];
  const initialPending =
    seedPendingRequests?.length > 0
      ? seedPendingRequests
      : initialFromCache?.pending?.length
        ? initialFromCache.pending
        : [];

  const [activeAccounts, setActiveAccounts] = useState(initialActive);
  const [pendingRequests, setPendingRequests] = useState(initialPending);
  const [rejectedRequests, setRejectedRequests] = useState(
    () => initialFromCache?.rejected || []
  );
  const [loadCoinsModal, setLoadCoinsModal] = useState({ open: false, game: null });
  const [loading, setLoading] = useState(
    () => Boolean(resolvedEmail) && initialActive.length === 0 && initialPending.length === 0
  );
  const [hasFetchedOnce, setHasFetchedOnce] = useState(
    () => initialActive.length > 0 || initialPending.length > 0
  );
  const [copiedKey, setCopiedKey] = useState(null);
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [requestingGameId, setRequestingGameId] = useState(null);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  /** Match catalog row by stored gameId first, then normalized title (handles typos vs admin catalog). */
  const matchGameForAccount = useCallback(
    (acc) => {
      if (acc?.gameId) {
        const idStr = String(acc.gameId);
        const byId = games.find(
          (g) =>
            String(g.id || g._id || g.gameId || '') === idStr ||
            String(g.gameId || '') === idStr
        );
        if (byId) return byId;
      }
      const key = normalizeGameTitleKey(acc?.gameTitle);
      if (!key) return null;
      return games.find((g) => normalizeGameTitleKey(g.title || g.name) === key);
    },
    [games]
  );

  const fetchAccountsAndRequests = async (isSilent = false) => {
    if (!user?.email) return;

    if (!isSilent) setLoading(true);
    try {
      const [credRes, reqRes] = await Promise.all([
        fetch(`/api/game-accounts?email=${encodeURIComponent(user.email)}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/account-requests?email=${encodeURIComponent(user.email)}`, { credentials: 'include', cache: 'no-store' }),
      ]);

      const credData = await credRes.json();
      const reqData = await reqRes.json();

      const readyList = [];
      const pendingList = [];
      const rejectedList = [];

      // Add verified ready credentials
      if (credData.success && credData.gameAccounts) {
        readyList.push(...credData.gameAccounts);
      }

      // Check account requests
      if (reqData.success && reqData.accountRequests) {
        // Step 1: Collect all verified READY credentials first
        reqData.accountRequests.forEach((req) => {
          if (req.status === 'READY') {
            const reqKey = normalizeGameTitleKey(req.gameTitle);
            const alreadyExists = readyList.some(
              (a) => normalizeGameTitleKey(a.gameTitle) === reqKey
            );
            if (!alreadyExists) {
              readyList.push({
                gameTitle: req.gameTitle,
                gameId: req.gameId,
                username: req.gameAccountUsername,
                password: req.gameAccountPassword,
                status: 'READY',
              });
            }
          }
        });

        // Step 2: Only show pending or rejected for games the user does NOT already have accounts for
        reqData.accountRequests.forEach((req) => {
          if (req.status === 'READY') return;

          const reqTitleKey = normalizeGameTitleKey(req.gameTitle);
          const hasActiveAccount = readyList.some(
            (a) =>
              (a.gameTitle && req.gameTitle && normalizeGameTitleKey(a.gameTitle) === reqTitleKey) ||
              (a.gameId && req.gameId && String(a.gameId) === String(req.gameId))
          );

          if (req.status === 'PENDING') {
            // Only add pending if user does not already have an active account for this game, OR if it's a coin load
            if (!hasActiveAccount || req.requestType === 'COIN_LOAD') {
              pendingList.push(req);
            }
          } else if (req.status === 'REJECTED' || req.status === 'CANCELLED') {
            // Once account is created/ready, DO NOT show retry/rejected card! It is resolved.
            if (!hasActiveAccount) {
              rejectedList.push(req);
            }
          }
        });
      }

      // Ensure each row has gameId + thumbnail (from games catalog / API) for correct artwork
      for (let i = 0; i < readyList.length; i++) {
        const row = readyList[i];
        const m = matchGameForAccount(row);
        readyList[i] = {
          ...row,
          gameId: row.gameId || m?.gameId || m?.id || m?._id || '',
          thumbnail: row.thumbnail || m?.thumbnail || m?.image || m?.imageUrl,
        };
      }

      diffSet(setActiveAccounts, readyList);
      diffSet(setPendingRequests, pendingList);
      diffSet(setRejectedRequests, rejectedList);
      if (user?.email) {
        writeGameAccountsCache(user.email, {
          active: readyList,
          pending: pendingList,
          rejected: rejectedList,
        });
      }
      setHasFetchedOnce(true);
    } catch (err) {
      console.error('Error fetching game accounts:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (seedReadyAccounts?.length) {
      diffSet(setActiveAccounts, mapSeedAccounts(seedReadyAccounts));
      setHasFetchedOnce(true);
      setLoading(false);
    }
    if (seedPendingRequests?.length) {
      diffSet(setPendingRequests, seedPendingRequests);
      setHasFetchedOnce(true);
      setLoading(false);
    }
  }, [seedReadyAccounts, seedPendingRequests]);

  useEffect(() => {
    const email = user?.email || readCachedPlayer()?.email;
    if (email) {
      if (!hasFetchedOnce && activeAccounts.length === 0 && pendingRequests.length === 0) {
        setLoading(true);
      }
      fetchAccountsAndRequests(activeAccounts.length > 0 || pendingRequests.length > 0);
      const pollMs = pendingRequests.length > 0 ? 2500 : 5000;
      const interval = setInterval(() => {
        if (!document.hidden) fetchAccountsAndRequests(true);
      }, pollMs);

      const handleFocus = () => fetchAccountsAndRequests(true);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);
      window.addEventListener('accountRequestUpdated', handleFocus);
      const unsubscribe = subscribePlayerAccountsSync(() => handleFocus());

      return () => {
        clearInterval(interval);
        unsubscribe();
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
        window.removeEventListener('accountRequestUpdated', handleFocus);
      };
    } else if (!readCachedPlayer()) {
      diffSet(setActiveAccounts, []);
      diffSet(setPendingRequests, []);
      diffSet(setRejectedRequests, []);
      setLoading(false);
      setHasFetchedOnce(false);
    }
  }, [user?.email, pendingRequests.length]);

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (key) => {
    setShowPasswordMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleDismissRejected = async (requestId) => {
    setRejectedRequests((prev) => prev.filter((r) => r.id !== requestId && r._id !== requestId));
    try {
      await fetch(`/api/account-requests?id=${encodeURIComponent(requestId)}`, {
        method: 'DELETE',
      });
    } catch {
      // silently handle
    }
  };

  const handleRequestAccount = async (game, previousRequestId = null) => {
    if (!user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const gameTitle = game.title || game.name;
    const gameId = game.gameId || game.id || game._id;

    // Check if user already has active credentials for this game
    const existing = activeAccounts.find(
      (a) =>
        (a.gameTitle && gameTitle && a.gameTitle.toLowerCase().trim() === gameTitle.toLowerCase().trim()) ||
        (a.gameId && gameId && String(a.gameId) === String(gameId))
    );

    if (existing) {
      if (previousRequestId) {
        handleDismissRejected(previousRequestId);
      }
      setErrorMsg(`You already have active credentials for ${gameTitle} (Username: ${existing.username}).`);
      return;
    }

    // Dismiss previous rejected request if retrying
    if (previousRequestId) {
      handleDismissRejected(previousRequestId);
    }

    setRequestingGameId(gameId);
    setErrorMsg(null);
    setRequestSuccessMsg(null);

    try {
      const res = await fetch('/api/account-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle,
          gameId,
          requestType: 'ACCOUNT_CREATION',
          transferAmount: 0,
          userEmail: user.email,
          userName: user.username,
        }),
      });

      const data = await res.json();
      setRequestingGameId(null);

      if (data.success) {
        broadcastStaffNewRequest({
          requestId: data.requestId,
          request: data.request,
          gameTitle,
          userName: user.username,
          userEmail: user.email,
        });

        router.push(`/game-accounts/provisioning?requestId=${data.requestId || ''}&game=${encodeURIComponent(gameTitle)}`);
      } else {
        setErrorMsg(data.message || 'Failed to submit request.');
      }
    } catch {
      setRequestingGameId(null);
      setErrorMsg('Network error. Could not request game account.');
    }
  };

  return (
    <section id="my-game-accounts-section" style={{ marginBottom: '50px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            <Key size={13} />
            <span>PLAYER PLATFORM MANAGER</span>
          </div>
          <h2 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            My Game Accounts &amp; Platform IDs
          </h2>
        </div>

        {user && (
          <button
            type="button"
            onClick={fetchAccountsAndRequests}
            disabled={loading}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--chrome-border)',
              color: 'var(--neon-cyan)',
              borderRadius: '9999px',
              padding: '7px 16px',
              fontSize: '11.5px',
              fontFamily: 'Lexend, sans-serif',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync Accounts</span>
          </button>
        )}
      </div>

      {/* Success Notification Alert */}
      {requestSuccessMsg && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#A7F3D0',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '12.5px',
            fontFamily: 'Lexend, sans-serif',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span>{requestSuccessMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '12.5px',
            fontFamily: 'Lexend, sans-serif',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} color="#EF4444" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. MY ACTIVE GAME ACCOUNTS (Approved & Ready)             */}
      {/* ======================================================== */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 10px #10B981' }} />
          <h3 style={{ margin: 0, fontFamily: 'Lexend, sans-serif', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
            Active Accounts ({activeAccounts.length})
          </h3>
          <span style={{ fontSize: '11px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif' }}>
            — Direct credentials ready to play
          </span>
        </div>

        {!user ? (
          readCachedPlayer() ? (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--chrome-border)',
                borderRadius: '18px',
                padding: '28px 20px',
                textAlign: 'center',
              }}
            >
              <RefreshCw size={28} color="var(--neon-cyan)" style={{ margin: '0 auto 10px auto', opacity: 0.85 }} className="animate-spin" />
              <p style={{ margin: 0, fontSize: '12px', color: '#8E849E', fontFamily: 'Lexend, sans-serif' }}>
                Restoring your session…
              </p>
            </div>
          ) : (
            /* Guest Lock Card */
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.7) 0%, rgba(10, 6, 26, 0.7) 100%)',
                border: '1px dashed var(--chrome-border)',
                borderRadius: '18px',
                padding: '30px 20px',
                textAlign: 'center',
              }}
            >
              <Key size={36} color="var(--neon-cyan)" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
              <h4 style={{ margin: '0 0 6px 0', fontFamily: 'Lexend, sans-serif', fontSize: '16px', fontWeight: 900, color: '#FFFFFF' }}>
                Sign in to view your game accounts
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#A69FB3', fontFamily: 'Lexend, sans-serif', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                Your usernames, passwords, and balances for Fire Kirin, Orion Stars, and Juwa will appear here once authenticated.
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login')}
                style={{
                  background: 'var(--primary-gradient)',
                  color: '#030712',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '10px 28px',
                  fontFamily: 'Lexend, sans-serif',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px var(--neon-cyan-glow)',
                }}
              >
                SIGN IN / REGISTER
              </button>
            </div>
          )
        ) : loading && activeAccounts.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--chrome-border)',
              borderRadius: '18px',
              padding: '24px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <RefreshCw size={18} color="var(--neon-cyan)" className="animate-spin" />
              <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 800, color: '#E2DCEB', fontFamily: 'Lexend, sans-serif' }}>
                Loading your game IDs…
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {[0, 1].map((i) => (
                <div
                  key={`skel-acc-${i}`}
                  style={{
                    height: '120px',
                    borderRadius: '14px',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'pulse 1.4s ease-in-out infinite',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                />
              ))}
            </div>
          </div>
        ) : activeAccounts.length === 0 ? (
          /* User has 0 active accounts after load */
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '18px',
              padding: '28px 20px',
              textAlign: 'center',
            }}
          >
            <Sparkles size={28} color="var(--neon-cyan)" style={{ margin: '0 auto 10px auto', opacity: 0.8 }} />
            <p style={{ margin: '0 0 6px 0', fontFamily: 'Lexend, sans-serif', fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF' }}>
              No Active Platform IDs Yet
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#8E849E', fontFamily: 'Lexend, sans-serif' }}>
              Request a platform from the games lobby or open Live Support — approved IDs show up here automatically.
            </p>
          </div>
        ) : (
          /* Active Accounts Grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
              gap: '16px',
            }}
          >
            {activeAccounts.map((acc, index) => {
              const matchedGame = matchGameForAccount(acc);
              const thumbSrc =
                (acc.thumbnail && String(acc.thumbnail).trim()) ||
                matchedGame?.thumbnail ||
                matchedGame?.image ||
                matchedGame?.imageUrl ||
                DEFAULT_GAME_THUMB;
              const isPasswordVisible = showPasswordMap[`acc_${index}`];

              return (
                <div
                  key={`acc_${index}`}
                  style={{
                    backgroundColor: '#120B2E',
                    border: '1px solid rgba(0, 240, 255, 0.35)',
                    borderRadius: '18px',
                    padding: '16px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 240, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Top Row: Thumbnail + Title + Ready Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: 'var(--bg-deep)',
                          border: '1px solid var(--chrome-border)',
                          flexShrink: 0,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element — data:image admin uploads must bypass next/image */}
                        <img
                          src={thumbSrc}
                          alt={acc.gameTitle || 'Game'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                          style={{
                            margin: '0 0 3px 0',
                            fontFamily: 'Lexend, sans-serif',
                            fontSize: '15px',
                            fontWeight: 900,
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {acc.gameTitle}
                        </h4>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '9.5px',
                            fontFamily: 'Lexend, sans-serif',
                            fontWeight: 900,
                            color: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                          }}
                        >
                          <CheckCircle2 size={10} />
                          READY TO PLAY
                        </span>
                      </div>
                    </div>

                    {/* Credentials Box */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-deep)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        marginBottom: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Username Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '9px', color: '#8E849E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            USERNAME / ID
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontFamily: 'Lexend, sans-serif', fontSize: '13px', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                            {acc.username || 'VIP Player'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.username, `user_${index}`)}
                          style={{
                            background: 'var(--neon-cyan-glow)',
                            border: '1px solid var(--chrome-border)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            color: 'var(--neon-cyan)',
                            fontSize: '10px',
                            fontFamily: 'Lexend, sans-serif',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {copiedKey === `user_${index}` ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedKey === `user_${index}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }} />

                      {/* Password Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '9px', color: '#8E849E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            PIN / PASSWORD
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontFamily: 'Lexend, sans-serif', fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                            {isPasswordVisible ? acc.password : '••••••••'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(`acc_${index}`)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#8E849E',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            {isPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.password, `pass_${index}`)}
                            style={{
                              background: 'var(--neon-cyan-glow)',
                              border: '1px solid var(--chrome-border)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              color: 'var(--neon-cyan)',
                              fontSize: '10px',
                              fontFamily: 'Lexend, sans-serif',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {copiedKey === `pass_${index}` ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedKey === `pass_${index}` ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Launch + Top Up */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => matchedGame && onPlayGame ? onPlayGame(matchedGame) : window.open(`/game/${matchedGame?.gameId || matchedGame?.id}`, '_self')}
                      style={{
                        background: 'var(--primary-gradient)',
                        color: '#030712',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '9px 0',
                        fontFamily: 'Lexend, sans-serif',
                        fontSize: '11.5px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px var(--neon-cyan-glow)',
                      }}
                    >
                      <Play size={13} fill="#0E0816" />
                      <span>LAUNCH GAME</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLoadCoinsModal({ open: true, game: matchedGame || { title: acc.gameTitle, gameId: acc.gameId } })}
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--chrome-border)',
                        color: 'var(--neon-cyan)',
                        borderRadius: '10px',
                        padding: '9px 0',
                        fontFamily: 'Lexend, sans-serif',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Coins size={13} />
                      <span>LOAD COINS</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. PENDING REQUESTS (Desk Preparing Credentials)         */}
      {/* ======================================================== */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B', boxShadow: '0 0 10px #F59E0B' }} />
            <h3 style={{ margin: 0, fontFamily: 'Lexend, sans-serif', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
              Pending Credentials ({pendingRequests.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif' }}>
              — Desk is generating your player ID (typically 2-5 mins)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
              gap: '14px',
            }}
          >
            {pendingRequests.map((req, index) => (
              <div
                key={`pend_${index}`}
                style={{
                  backgroundColor: '#0F0924',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 3px 0', fontFamily: 'Lexend, sans-serif', fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF' }}>
                    {req.gameTitle}
                  </h4>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '9.5px',
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 800,
                      color: '#F59E0B',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    <Clock size={10} className="animate-spin" />
                    GENERATING CREDENTIALS
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {req.transferAmount > 0 ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        color: '#FDE68A',
                        fontSize: '11px',
                        fontWeight: 900,
                      }}
                    >
                      <Lock size={10} color="#F59E0B" />
                      <span>${Number(req.transferAmount).toFixed(2)} SC Frozen</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#8E849E', fontFamily: 'Lexend, sans-serif' }}>
                      In Queue ⏳
                    </span>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => router.push(`/game-accounts/provisioning?requestId=${req.id}&game=${encodeURIComponent(req.gameTitle)}`)}
                      style={{
                        marginTop: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--neon-cyan-glow)',
                        border: '1px solid var(--chrome-border)',
                        color: 'var(--neon-cyan)',
                        fontSize: '10px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      <Clock size={10} />
                      <span>Track Handshake</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* 3. REJECTED REQUESTS WITH ADMIN REASON NOTES             */}
      {/* ======================================================== */}
      {rejectedRequests.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444', boxShadow: '0 0 10px #EF4444' }} />
            <h3 style={{ margin: 0, fontFamily: 'Lexend, sans-serif', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
              Requests Requiring Attention ({rejectedRequests.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif' }}>
              — Staff feedback on your previous requests
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
              gap: '14px',
            }}
          >
            {rejectedRequests.map((req, index) => (
              <div
                key={`rej_${index}`}
                style={{
                  backgroundColor: '#0F0924',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, fontFamily: 'Lexend, sans-serif', fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                    {req.gameTitle}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 800,
                        color: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      NOT APPROVED
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDismissRejected(req.id || req._id)}
                      title="Dismiss this notification"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '10px',
                    padding: '10px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '12px', color: '#FCA5A5', fontFamily: 'Lexend, sans-serif', lineHeight: 1.4 }}>
                    <strong>Support Note:</strong> {req.rejectionReason || 'Game server unavailable or request cancelled.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRequestAccount({ title: req.gameTitle, gameId: req.gameId }, req.id || req._id)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.18)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Retry Request ↻
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Load Coins Modal */}
      <LoadCoinsModal
        isOpen={loadCoinsModal.open}
        game={loadCoinsModal.game}
        user={user}
        onClose={() => setLoadCoinsModal({ open: false, game: null })}
        onSuccess={() => fetchAccountsAndRequests()}
      />
    </section>
  );
}
