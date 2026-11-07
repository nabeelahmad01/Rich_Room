'use client';

import React, { useState } from 'react';
import {
  Search,
  Check,
  X,
  Copy,
  CheckCheck,
  RefreshCw,
  Wallet,
  Clock,
  AlertTriangle,
  ArrowRight,
  Eye,
  Download,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';

export default function FinanceRedemptionsView({
  redemptions = [],
  onApprove,
  onReject,
  onRefresh,
  isRefreshing = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, item: null, reason: '' });
  const [previewModal, setPreviewModal] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = redemptions.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.username?.toLowerCase().includes(q) ||
      r.destinationAddress?.toLowerCase().includes(q) ||
      r.destinationTag?.toLowerCase().includes(q) ||
      r.payoutMethod?.toLowerCase().includes(q) ||
      r.amount?.toString().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = redemptions.filter((r) => r.status === 'pending').length;
  const approvedCount = redemptions.filter((r) => r.status === 'approved').length;
  const rejectedCount = redemptions.filter((r) => r.status === 'rejected').length;

  const handleConfirmReject = () => {
    if (!rejectModal.item) return;
    const targetId = rejectModal.item.id;
    const reason = rejectModal.reason.trim() || 'Cashout request rejected. Please check requirements.';
    setRejectModal({ open: false, item: null, reason: '' });
    onReject(targetId, reason);
  };

  const handleExecuteApprove = async (item) => {
    setProcessingId(item.id);
    try {
      await onApprove(item.id);
    } finally {
      setProcessingId(null);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
      {/* Search & Filter Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/25 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-card)] rounded-xl border border-white/10 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'all' ? 'bg-[var(--neon-cyan)] text-black shadow-lg shadow-[var(--neon-cyan)]/30' : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({redemptions.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-[var(--neon-purple)] hover:bg-amber-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            Dispatched ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'text-red-400 hover:bg-red-500/10'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--bg-card)] border border-[var(--neon-cyan)]/30 rounded-xl w-full md:w-64 focus-within:border-[var(--neon-cyan)] transition">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search player, tag, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none p-0 border-none"
              style={{ fontFamily: 'Lexend, sans-serif' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-white shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-[var(--neon-cyan)]/30 hover:border-[var(--neon-cyan)] text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[var(--neon-cyan)]' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/25 rounded-2xl shadow-xl">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <Wallet size={26} />
          </div>
          <h4 className="text-sm font-bold text-white">No redemption requests found</h4>
          <p className="text-xs text-[#9A91A8] mt-1">Pending cashouts will appear here instantly with sound alert.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden lg:block bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/20 rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs border-collapse" style={{ fontFamily: 'Lexend, sans-serif' }}>
              <thead className="bg-[var(--bg-deep)] text-[#9A91A8] uppercase font-black text-[11px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-4">Time &amp; Date</th>
                  <th className="p-4">Player</th>
                  <th className="p-4">Redeem Amount</th>
                  <th className="p-4">Payout Method &amp; Tag</th>
                  <th className="p-4">Game Win Proof</th>
                  <th className="p-4">Payout QR Code</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((r) => {
                  const isPending = r.status === 'pending';
                  const displayTag = r.destinationTag || r.destinationAddress;
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isPending ? 'bg-purple-500/[0.04] hover:bg-purple-500/[0.08]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Clock size={12} className="text-gray-400" />
                            {formatRelativeTime(r.createdAt)}
                          </span>
                          <span className="text-[10.5px] text-gray-400 mt-0.5">
                            {new Date(r.createdAt).toLocaleString([], {
                              month: 'numeric',
                              day: 'numeric',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-800 flex items-center justify-center font-black text-white text-xs uppercase shadow">
                            {r.username ? r.username.charAt(0) : 'U'}
                          </div>
                          <div>
                            <p className="font-black text-white text-sm">{r.username}</p>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                              ID: {r.userId?.slice(-6) || r.id?.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-amber-600/30 text-amber-300 font-black text-sm">
                          <span>${Number(r.amount).toFixed(2)}</span>
                          <span className="text-[10.5px] uppercase font-bold text-[var(--neon-purple)]">SC</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-white/10 border border-white/15 text-gray-300">
                            {r.payoutMethod || 'Direct'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-amber-300 bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg text-xs max-w-[160px] truncate select-all">
                              {displayTag || 'N/A'}
                            </span>
                            {displayTag && (
                              <button
                                onClick={() => handleCopy(displayTag, r.id)}
                                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition"
                                title="Copy Tag"
                              >
                                {copiedId === r.id ? (
                                  <CheckCheck size={12} className="text-emerald-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Game Win Proof Column */}
                      <td className="p-4">
                        {r.gameScreenshot ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModal({
                                url: r.gameScreenshot,
                                title: `Game Winning Screenshot — @${r.username}`,
                                filename: `gamewin_${r.username || 'proof'}.png`,
                              })
                            }
                            className="group relative w-12 h-12 rounded-xl overflow-hidden border border-amber-600/40 hover:border-purple-300 transition bg-black/50 block shadow-md"
                            title="Click to view full game screenshot"
                          >
                            <img
                              src={r.gameScreenshot}
                              alt="Game Win Proof"
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                              <Eye size={14} />
                            </div>
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-500 italic">No image</span>
                        )}
                      </td>

                      {/* Payout QR Code Column */}
                      <td className="p-4">
                        {r.qrCodeImage ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewModal({
                                  url: r.qrCodeImage,
                                  title: `Payout QR Code — @${r.username}`,
                                  filename: `payout_qr_${r.username || 'proof'}.png`,
                                })
                              }
                              className="group relative w-12 h-12 rounded-xl overflow-hidden border border-[var(--neon-cyan)]/40 hover:border-[var(--neon-cyan)] transition bg-black/50 block shadow-md"
                              title="Click to view full payout QR"
                            >
                              <img
                                src={r.qrCodeImage}
                                alt="Payout QR"
                                className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[var(--neon-cyan)]">
                                <Eye size={14} />
                              </div>
                            </button>
                            <a
                              href={r.qrCodeImage}
                              download={`payout_qr_${r.username || 'tag'}.png`}
                              title="Download QR Code"
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition"
                            >
                              <Download size={13} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500 italic">No QR</span>
                        )}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-600/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            PENDING
                          </span>
                        ) : r.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check size={12} strokeWidth={3} />
                            DISPATCHED
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                              <X size={12} strokeWidth={3} />
                              REJECTED
                            </span>
                            {r.adminNote && (
                              <p className="text-[10px] text-red-300/80 max-w-[140px] truncate" title={r.adminNote}>
                                {r.adminNote}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleExecuteApprove(r)}
                              disabled={processingId === r.id}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-600/30 active:scale-95 disabled:opacity-50"
                            >
                              {processingId === r.id ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <Check size={14} strokeWidth={3} />
                              )}
                              <span>Mark Dispatched</span>
                            </button>

                            <button
                              onClick={() => setRejectModal({ open: true, item: r, reason: '' })}
                              className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-black text-xs flex items-center gap-1 transition active:scale-95"
                            >
                              <X size={13} strokeWidth={3} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500 font-bold uppercase">Processed</span>
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
            {filtered.map((r) => {
              const isPending = r.status === 'pending';
              const displayTag = r.destinationTag || r.destinationAddress;
              return (
                <div
                  key={r.id}
                  className={`p-4 rounded-2xl border flex flex-col gap-3.5 transition shadow-xl ${
                    isPending
                      ? 'bg-[var(--bg-surface)] border-amber-600/40 shadow-purple-500/10'
                      : 'bg-[var(--bg-surface)] border-[var(--neon-cyan)]/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--neon-cyan)] to-[var(--neon-purple)] flex items-center justify-center font-black text-black text-sm shadow">
                        {r.username ? r.username.charAt(0) : 'U'}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm leading-tight">{r.username}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                          <Clock size={11} />
                          <span>{formatRelativeTime(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-600/40 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        PENDING
                      </span>
                    ) : r.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check size={11} />
                        DISPATCHED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                        <X size={11} />
                        REJECTED
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold">Redeem Amount:</span>
                      <span className="font-black text-amber-300 text-sm font-mono">
                        ${Number(r.amount).toFixed(2)} SC
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold">Payout Method:</span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-white">
                        {r.payoutMethod || 'Direct'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[11px] text-gray-400 font-bold">Tag / Address:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-amber-300 text-xs select-all truncate max-w-[150px]">
                          {displayTag || 'N/A'}
                        </span>
                        {displayTag && (
                          <button
                            onClick={() => handleCopy(displayTag, r.id)}
                            className="p-1 rounded bg-white/10 text-gray-300 hover:text-white"
                          >
                            {copiedId === r.id ? (
                              <CheckCheck size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Screenshots Section */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1 font-bold">Game Win:</span>
                        {r.gameScreenshot ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModal({
                                url: r.gameScreenshot,
                                title: `Game Winning Screenshot — @${r.username}`,
                                filename: `gamewin_${r.username || 'proof'}.png`,
                              })
                            }
                            className="w-full h-16 rounded-lg overflow-hidden border border-amber-600/40 relative block bg-black/40"
                          >
                            <img src={r.gameScreenshot} alt="Game Win" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-full h-16 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-[10px] text-gray-500">
                            No Win Proof
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1 font-bold">Payout QR:</span>
                        {r.qrCodeImage ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewModal({
                                  url: r.qrCodeImage,
                                  title: `Payout QR Code — @${r.username}`,
                                  filename: `payout_qr_${r.username || 'proof'}.png`,
                                })
                              }
                              className="w-full h-16 rounded-lg overflow-hidden border border-[var(--neon-cyan)]/40 relative block bg-black/40"
                            >
                              <img src={r.qrCodeImage} alt="Payout QR" className="w-full h-full object-cover" />
                            </button>
                            <a
                              href={r.qrCodeImage}
                              download={`payout_qr_${r.username || 'tag'}.png`}
                              className="absolute bottom-1 right-1 p-1 bg-black/80 rounded-md text-white hover:text-[var(--neon-cyan)]"
                              title="Download QR"
                            >
                              <Download size={11} />
                            </a>
                          </div>
                        ) : (
                          <div className="w-full h-16 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-[10px] text-gray-500">
                            No QR Code
                          </div>
                        )}
                      </div>
                    </div>

                    {r.adminNote && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-300">
                        <strong>Rejection Note:</strong> {r.adminNote}
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleExecuteApprove(r)}
                        disabled={processingId === r.id}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/25 active:scale-95 disabled:opacity-50"
                      >
                        {processingId === r.id ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Check size={14} strokeWidth={3} />
                        )}
                        <span>Mark Dispatched</span>
                      </button>

                      <button
                        onClick={() => setRejectModal({ open: true, item: r, reason: '' })}
                        className="w-full py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-black text-xs flex items-center justify-center gap-1 active:scale-95"
                      >
                        <X size={13} strokeWidth={3} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Reject Reason Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d1021] border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={20} />
                <h3 className="text-base font-black text-white">Reject Cashout Request</h3>
              </div>
              <button
                onClick={() => setRejectModal({ open: false, item: null, reason: '' })}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Rejecting cashout of{' '}
              <strong className="text-amber-300">${rejectModal.item?.amount} SC</strong> for{' '}
              <strong className="text-white">{rejectModal.item?.username}</strong>. Please provide a note explaining the reason:
            </p>

            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Enter reason for rejection (e.g. Invalid game score screenshot or tag)..."
              className="w-full p-3 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModal({ open: false, item: null, reason: '' })}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black shadow-lg shadow-red-500/30"
              >
                Confirm Rejection &amp; Send Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Proof / QR Preview Modal */}
      {previewModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/40 rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--neon-cyan)]" />
                {previewModal.title || 'Proof Preview'}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black/50 rounded-2xl p-2 border border-white/5">
              <img
                src={previewModal.url}
                alt="Full Preview"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400 font-mono">
                Click outside to close preview
              </span>
              <a
                href={previewModal.url}
                download={previewModal.filename || 'preview.png'}
                className="px-4 py-2 rounded-xl bg-[var(--neon-cyan)] hover:bg-amber-300 text-black text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-amber-500/25"
              >
                <Download size={14} />
                <span>Save Image</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
