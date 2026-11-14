'use client';

import React, { useState } from 'react';
import {
  Search,
  Key,
  Check,
  X,
  Copy,
  CheckCheck,
  Gamepad2,
  Clock,
  Coins,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { sanitizePlainText } from '@/lib/sanitizeText';
import { cleanGameTitle } from '@/lib/fastDiff';

function displayPlayerName(req) {
  return sanitizePlainText(req.userName, 64) || 'Player';
}

function displayGameTitle(req) {
  return cleanGameTitle(sanitizePlainText(req.gameTitle, 120)) || '—';
}

function displayCredential(value) {
  return sanitizePlainText(value, 80);
}

export default function AccountRequestsView({
  requests = [],
  filter = 'PENDING',
  onFilterChange,
  onOpenApproveModal,
  onCancelRequest,
  onRefresh,
  isRefreshing = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Strictly filter only account creation requests (never show coin loads here)
  const accountCreationOnly = requests.filter(
    (r) =>
      r.requestType === 'ACCOUNT_CREATION' ||
      (!r.requestType && (!r.transferAmount || Number(r.transferAmount) <= 0))
  );

  const filtered = accountCreationOnly.filter((r) => {
    const matchesFilter =
      filter === 'ALL' ? true : (r.status || '').toUpperCase() === filter.toUpperCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.userName?.toLowerCase().includes(q) ||
      r.userEmail?.toLowerCase().includes(q) ||
      r.gameTitle?.toLowerCase().includes(q) ||
      r.gameAccountUsername?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = accountCreationOnly.filter((r) => (r.status || '').toUpperCase() === 'PENDING').length;
  const readyCount = accountCreationOnly.filter((r) => (r.status || '').toUpperCase() === 'READY').length;

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
      {/* Top Filter & Search Bar */}
      <div
        className="p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-card) 100%)',
          border: '1px solid rgba(255, 215, 0, 0.28)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(255, 215, 0, 0.1)',
        }}
      >
        <div
          className="flex items-center gap-2 p-1.5 rounded-xl w-full md:w-auto overflow-x-auto"
          style={{
            backgroundColor: 'var(--bg-deep)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {[
            { key: 'PENDING', label: 'Pending', count: pendingCount, color: '#F59E0B' },
            { key: 'READY', label: 'Ready', count: readyCount, color: '#10B981' },
            { key: 'ALL', label: 'All Requests', count: requests.length, color: 'var(--neon-cyan)' },
          ].map(({ key, label, count, color }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onFilterChange(key)}
                className="px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer hover:scale-[1.02]"
                style={
                  isActive
                    ? {
                        backgroundColor: color,
                        color: key === 'READY' ? '#FFFFFF' : 'var(--bg-deep)',
                        boxShadow: `0 0 16px ${color}55`,
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: '#9A91A8',
                      }
                }
              >
                {key === 'PENDING' && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: isActive ? 'var(--bg-deep)' : '#F59E0B',
                      boxShadow: isActive ? 'none' : '0 0 8px #F59E0B',
                    }}
                  />
                )}
                <span>{label}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? 'inherit' : '#9A91A8',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl w-full md:w-72 transition-all"
            style={{
              backgroundColor: 'var(--bg-deep)',
              border: '1px solid rgba(255, 215, 0, 0.28)',
            }}
          >
            <Search size={14} className="text-[var(--neon-cyan)] shrink-0" />
            <input
              type="text"
              placeholder="Search player, game, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none p-0 border-none"
              style={{ fontFamily: 'Lexend, sans-serif' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-white shrink-0 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              color: 'var(--neon-cyan)',
              boxShadow: '0 0 15px rgba(255, 215, 0, 0.2)',
              fontFamily: 'Lexend, sans-serif',
            }}
          >
            <RefreshCw size={13} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: '72px 28px',
            textAlign: 'center',
            background: 'radial-gradient(ellipse at center, rgba(255, 215, 0, 0.12) 0%, rgba(7, 5, 20, 0.95) 75%)',
            borderRadius: '20px',
            border: '1.5px dashed rgba(255, 215, 0, 0.35)',
            boxShadow: 'inset 0 0 40px rgba(255, 215, 0, 0.06)',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(245, 158, 11, 0.2) 100%)',
              border: '1.5px solid rgba(255, 215, 0, 0.5)',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
            }}
          >
            <Gamepad2 size={34} color="var(--neon-cyan)" />
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 215, 0, 0.15)',
              border: '1px solid rgba(255, 215, 0, 0.35)',
              color: 'var(--neon-cyan)',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '10px',
              fontFamily: 'Lexend, sans-serif',
            }}
          >
            All Clear · Zero Pending Backlog
          </div>
          <p style={{ margin: 0, fontFamily: 'Lexend, sans-serif', fontSize: '17px', fontWeight: 900, color: '#FFFFFF' }}>
            No Game Account Requests Found
          </p>
          <p style={{ margin: '8px auto 0 auto', maxWidth: '480px', fontSize: '13px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif', lineHeight: 1.6 }}>
            Incoming player credentials requests will ring and arrive here in real-time.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div
            className="hidden lg:block rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid rgba(255, 215, 0, 0.28)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 25px rgba(255, 215, 0, 0.1)',
            }}
          >
            <table className="w-full text-left text-xs border-collapse" style={{ fontFamily: 'Lexend, sans-serif' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead style={{ backgroundColor: 'var(--bg-deep)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <tr>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Player</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Requested Game</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Issued Credentials</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '14px 18px', color: '#9A91A8', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((req) => {
                  const isPending = (req.status || '').toUpperCase() === 'PENDING';
                  return (
                    <tr
                      key={req.id}
                      className={`transition-colors ${
                        isPending ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.07]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-800 flex items-center justify-center font-black text-white text-xs uppercase shadow">
                            {displayPlayerName(req).charAt(0) || 'P'}
                          </div>
                          <div>
                            <p className="font-black text-white text-sm">{displayPlayerName(req)}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{req.userEmail}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className="font-heading font-black text-amber-400 text-sm">{displayGameTitle(req)}</span>
                        {Boolean(req.freeplayPending) && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg shadow-sm">
                              🎁 Freeplay: ${Number(req.freeplayAmount || 3).toFixed(2)} SC
                            </span>
                            {(req.freeplayScreenshot || req.screenshot) && (
                              <button
                                type="button"
                                onClick={() => setPreviewScreenshot(req.freeplayScreenshot || req.screenshot)}
                                className="text-[10px] font-bold text-[var(--neon-cyan)] hover:text-amber-300 underline cursor-pointer"
                              >
                                View Proof
                              </button>
                            )}
                          </div>
                        )}
                        {Boolean(req.transferAmount && req.transferAmount > 0) && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                              Load: ${Number(req.transferAmount).toFixed(2)} SC
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            PENDING
                          </span>
                        ) : req.status === 'READY' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <Check size={11} strokeWidth={3} />
                            READY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                            {req.status}
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-mono">
                        {req.gameAccountUsername ? (
                          <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-amber-300 font-black text-xs">U: {displayCredential(req.gameAccountUsername)}</span>
                              <button
                                onClick={() =>
                                  handleCopy(
                                    `${displayCredential(req.gameAccountUsername)} / ${displayCredential(req.gameAccountPassword)}`,
                                    req.id
                                  )
                                }
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                                title="Copy credentials"
                              >
                                {copiedId === req.id ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                            <p className="text-gray-400 text-xs">P: {displayCredential(req.gameAccountPassword)}</p>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-xs">Not issued yet</span>
                        )}
                      </td>

                      <td className="p-4 whitespace-nowrap text-gray-400 text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1">
                            <Clock size={11} />
                            {formatRelativeTime(req.createdAt)}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onOpenApproveModal(req)}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95"
                            >
                              <Key size={13} />
                              <span>Issue Credentials</span>
                            </button>
                            <button
                              onClick={() => onCancelRequest(req.id)}
                              className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold transition active:scale-95"
                              title="Cancel Request"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onOpenApproveModal(req)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition"
                          >
                            Edit Credentials
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE & TABLET CARDS */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filtered.map((req) => {
              const isPending = (req.status || '').toUpperCase() === 'PENDING';
              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border flex flex-col gap-3.5 transition shadow-xl ${
                    isPending
                      ? 'bg-[var(--bg-surface)] border-amber-500/40 shadow-amber-500/10'
                      : 'bg-[var(--bg-surface)] border-[var(--neon-cyan)]/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--neon-cyan)] to-[var(--neon-purple)] flex items-center justify-center font-black text-black text-sm shadow">
                        {displayPlayerName(req).charAt(0) || 'P'}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm leading-tight">{displayPlayerName(req)}</h4>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{req.userEmail}</p>
                      </div>
                    </div>

                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        PENDING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {req.status}
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold">Game Requested:</span>
                      <span className="font-heading font-black text-amber-400 text-sm">{displayGameTitle(req)}</span>
                    </div>

                    {Boolean(req.freeplayPending) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-300 font-bold">Freeplay Task:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                            ${Number(req.freeplayAmount || 3).toFixed(2)} SC
                          </span>
                          {(req.freeplayScreenshot || req.screenshot) && (
                            <button
                              type="button"
                              onClick={() => setPreviewScreenshot(req.freeplayScreenshot || req.screenshot)}
                              className="text-[10.5px] font-bold text-[var(--neon-cyan)] underline"
                            >
                              Proof
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {Boolean(req.transferAmount && req.transferAmount > 0) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold">Initial Load SC:</span>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                          ${Number(req.transferAmount).toFixed(2)} SC
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                      <span>Time:</span>
                      <span>{formatRelativeTime(req.createdAt)}</span>
                    </div>
                  </div>

                  {req.gameAccountUsername && (
                    <div className="p-3 bg-amber-500/[0.06] rounded-xl border border-amber-500/20 flex items-center justify-between">
                      <div className="font-mono text-xs">
                        <p className="text-amber-300 font-bold">User: {displayCredential(req.gameAccountUsername)}</p>
                        <p className="text-gray-400">Pass: {req.gameAccountPassword}</p>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(
                            `${displayCredential(req.gameAccountUsername)} / ${displayCredential(req.gameAccountPassword)}`,
                            req.id
                          )
                        }
                        className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-white"
                      >
                        {copiedId === req.id ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}

                  {isPending ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => onOpenApproveModal(req)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95"
                      >
                        <Key size={13} />
                        <span>Issue Login</span>
                      </button>
                      <button
                        onClick={() => onCancelRequest(req.id)}
                        className="w-full py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-black text-xs flex items-center justify-center gap-1 active:scale-95"
                      >
                        <X size={13} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenApproveModal(req)}
                      className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition"
                    >
                      Edit Credentials
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Screenshot Proof Preview Modal */}
      {previewScreenshot && (
        <div
          onClick={() => setPreviewScreenshot(null)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-[var(--bg-surface)] border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>🎁 Player Freeplay Task Inbox Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-black border border-white/10 flex items-center justify-center p-2">
              <img
                src={previewScreenshot}
                alt="Freeplay Task Inbox Proof"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="px-5 py-2 rounded-xl bg-[var(--neon-cyan)] text-black font-black text-xs uppercase"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
