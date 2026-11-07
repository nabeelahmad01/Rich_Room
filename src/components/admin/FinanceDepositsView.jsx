'use client';

import React, { useState } from 'react';
import {
  Search,
  Check,
  X,
  Copy,
  CheckCheck,
  RefreshCw,
  Coins,
  DollarSign,
  User,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function FinanceDepositsView({
  deposits = [],
  onApprove,
  onReject,
  onRefresh,
  isRefreshing = false,
  customDepositSC = {},
  setCustomDepositSC,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [copiedId, setCopiedId] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, deposit: null, reason: '' });
  const [previewImage, setPreviewImage] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDeposits = deposits.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      d.username?.toLowerCase().includes(q) ||
      d.senderNote?.toLowerCase().includes(q) ||
      d.txHash?.toLowerCase().includes(q) ||
      d.methodName?.toLowerCase().includes(q) ||
      d.amount?.toString().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = deposits.filter((d) => d.status === 'pending').length;
  const approvedCount = deposits.filter((d) => d.status === 'approved').length;
  const rejectedCount = deposits.filter((d) => d.status === 'rejected').length;

  const handleConfirmReject = () => {
    if (!rejectModal.deposit) return;
    const targetId = rejectModal.deposit.id;
    const reason = rejectModal.reason.trim() || 'Payment details could not be verified.';
    setRejectModal({ open: false, deposit: null, reason: '' });
    onReject(targetId, reason);
  };

  const handleExecuteApprove = async (deposit, scToCredit) => {
    setApprovingId(deposit.id);
    try {
      await onApprove(deposit.id, scToCredit);
    } finally {
      setApprovingId(null);
    }
  };

  const getMethodBadgeStyle = (methodName = '') => {
    const m = methodName.toLowerCase();
    if (m.includes('cash') || m.includes('app')) {
      return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', tag: 'Cash App' };
    }
    if (m.includes('crypto') || m.includes('btc') || m.includes('bitcoin')) {
      return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', tag: 'Crypto' };
    }
    if (m.includes('zelle')) {
      return { bg: 'bg-purple-500/15', border: 'border-amber-600/30', text: 'text-[var(--neon-purple)]', tag: 'Zelle' };
    }
    if (m.includes('apple') || m.includes('pay')) {
      return { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', tag: 'Apple Pay' };
    }
    return { bg: 'bg-white/10', border: 'border-white/20', text: 'text-gray-300', tag: methodName || 'Direct' };
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
      {/* Search, Filter & Live Sync Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/25 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-xl">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-card)] rounded-xl border border-white/10 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'all' ? 'bg-[var(--neon-cyan)] text-black shadow-lg shadow-[var(--neon-cyan)]/30' : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({deposits.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
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
            Approved ({approvedCount})
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

        {/* Search & Refresh Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--bg-card)] border border-[var(--neon-cyan)]/30 rounded-xl w-full md:w-64 focus-within:border-[var(--neon-cyan)] transition">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search player, Cashtag..."
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
            title="Refresh requests"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[var(--neon-cyan)]' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      {filteredDeposits.length === 0 ? (
        <div className="p-12 text-center bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/25 rounded-2xl shadow-xl">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <Coins size={26} />
          </div>
          <h4 className="text-sm font-bold text-white">No deposit requests found</h4>
          <p className="text-xs text-[#9A91A8] mt-1 max-w-sm mx-auto">
            {statusFilter === 'pending'
              ? 'All incoming deposits have been reviewed! New requests will notify you automatically.'
              : 'Try selecting a different filter or clearing search keywords.'}
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (Screens >= 1024px) */}
          <div className="hidden lg:block bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/20 rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs border-collapse" style={{ fontFamily: 'Lexend, sans-serif' }}>
              <thead className="bg-[var(--bg-deep)] text-[#9A91A8] uppercase font-black text-[11px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-4">Time &amp; Date</th>
                  <th className="p-4">Player</th>
                  <th className="p-4">Deposit Amount</th>
                  <th className="p-4">Coins to Credit (SC &amp; GC)</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Player Tag &amp; Email</th>
                  <th className="p-4">Proof Screenshot</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDeposits.map((d) => {
                  const calculatedSC = Number(
                    d.totalSC !== undefined ? d.totalSC : d.amount + (d.bonusSC || 0)
                  ).toFixed(2);
                  const bonusType = d.bonusType || 'welcome';
                  const bonusPercent = d.bonusPercent ?? (bonusType === 'welcome' ? 300 : 50);
                  const bonusSC = Number(
                    d.bonusSC !== undefined ? d.bonusSC : (d.amount * bonusPercent) / 100
                  ).toFixed(2);
                  const calculatedGC = (d.totalGC || d.amount * 10000).toLocaleString();
                  const scToCredit =
                    customDepositSC[d.id] !== undefined ? customDepositSC[d.id] : calculatedSC;

                  const methodStyle = getMethodBadgeStyle(d.methodName);
                  const note = d.senderNote || d.txHash;
                  const isPending = d.status === 'pending';

                  return (
                    <tr
                      key={d.id}
                      className={`transition-colors ${
                        isPending ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.07]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Clock size={12} className="text-gray-400" />
                            {formatRelativeTime(d.createdAt)}
                          </span>
                          <span className="text-[10.5px] text-gray-400 mt-0.5">
                            {new Date(d.createdAt).toLocaleString([], {
                              month: 'numeric',
                              day: 'numeric',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Player */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center font-black text-white text-xs uppercase shadow">
                            {d.username ? d.username.charAt(0) : 'U'}
                          </div>
                          <div>
                            <p className="font-black text-white text-sm">{d.username}</p>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                              ID: {d.userId?.slice(-6) || d.id?.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Deposit USD */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-sm">
                          <span>${Number(d.amount).toFixed(2)}</span>
                          <span className="text-[10px] uppercase font-bold text-amber-400">USD</span>
                        </div>
                      </td>

                      {/* Coins to Credit */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5 min-w-[210px]">
                          {/* Top row: Final SC & Bonus Tag */}
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-400 text-base font-mono">
                              {calculatedSC} SC
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase border ${
                                bonusType === 'welcome'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-purple-500/15 text-amber-300 border-amber-600/30'
                              }`}
                            >
                              +{bonusPercent}% {bonusType}
                            </span>
                          </div>

                          {/* Breakdown text */}
                          <div className="text-[11px] text-gray-300 flex items-center gap-1.5">
                            <span>Base: ${d.amount}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-emerald-400 font-medium">Bonus: +${bonusSC} SC</span>
                          </div>

                          {/* Editable SC Input for Pending */}
                          {isPending ? (
                            <div className="mt-1 flex items-center gap-1.5 bg-black/60 border border-emerald-500/40 rounded-xl px-2.5 py-1">
                              <span className="text-[10.5px] font-black uppercase text-gray-400">To Credit:</span>
                              <div className="flex items-center font-mono font-bold text-emerald-400 text-xs">
                                <span>$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={scToCredit}
                                  onChange={(e) =>
                                    setCustomDepositSC({ ...customDepositSC, [d.id]: e.target.value })
                                  }
                                  className="w-20 bg-transparent text-emerald-300 font-mono text-xs font-black focus:outline-none px-1"
                                  title="Admin can adjust final credited amount"
                                />
                                <span>SC</span>
                              </div>
                            </div>
                          ) : (
                            d.creditedSC && (
                              <span className="text-[10.5px] font-mono text-emerald-300/80">
                                Credited: {Number(d.creditedSC).toFixed(2)} SC
                              </span>
                            )
                          )}

                          {/* Gold Coins */}
                          <span className="text-[10.5px] text-amber-400/90 font-mono">
                            +{calculatedGC} GC
                          </span>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border ${methodStyle.bg} ${methodStyle.border} ${methodStyle.text}`}
                        >
                          {d.methodName}
                        </span>
                      </td>

                      {/* Player Tag & Email */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-amber-300 bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg text-xs max-w-[140px] truncate select-all font-bold">
                              {d.playerTagName || note || 'No tag'}
                            </span>
                            <button
                              onClick={() => handleCopy(d.playerTagName || note, d.id)}
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition"
                              title="Copy Tag"
                            >
                              {copiedId === d.id ? (
                                <CheckCheck size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          {d.playerPaymentEmail && (
                            <span className="text-[10.5px] text-gray-400 truncate max-w-[150px] font-mono">
                              {d.playerPaymentEmail}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Proof Screenshot */}
                      <td className="p-4">
                        {(() => {
                          const proofSrc = d.proofImage || d.proofUrl || d.receiptImage || d.screenshot || (d.hasProof ? `/api/payments/deposit/proof?id=${d.id || d._id}` : null);
                          return proofSrc ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={proofSrc}
                                alt="Receipt"
                                onClick={() => setPreviewImage({ url: proofSrc, title: `${d.username} Payment Receipt` })}
                                className="w-11 h-11 object-cover rounded-xl border border-white/20 hover:border-emerald-400 transition cursor-pointer shadow-md"
                                title="Click to zoom screenshot"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: proofSrc, title: `${d.username} Payment Receipt` })}
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[10.5px] text-[var(--neon-cyan)] font-bold border border-white/10 flex items-center gap-1 transition cursor-pointer"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-[11px]">No receipt</span>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            PENDING
                          </span>
                        ) : d.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check size={12} strokeWidth={3} />
                            APPROVED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                            <X size={12} strokeWidth={3} />
                            REJECTED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleExecuteApprove(d, scToCredit)}
                              disabled={approvingId === d.id}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
                            >
                              {approvingId === d.id ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <Check size={14} strokeWidth={3} />
                              )}
                              <span>Approve &amp; Credit {scToCredit} SC</span>
                            </button>

                            <button
                              onClick={() => setRejectModal({ open: true, deposit: d, reason: '' })}
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

          {/* RESPONSIVE MOBILE & TABLET CARDS VIEW (< 1024px) */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredDeposits.map((d) => {
              const calculatedSC = Number(
                d.totalSC !== undefined ? d.totalSC : d.amount + (d.bonusSC || 0)
              ).toFixed(2);
              const bonusType = d.bonusType || 'welcome';
              const bonusPercent = d.bonusPercent ?? (bonusType === 'welcome' ? 300 : 50);
              const bonusSC = Number(
                d.bonusSC !== undefined ? d.bonusSC : (d.amount * bonusPercent) / 100
              ).toFixed(2);
              const calculatedGC = (d.totalGC || d.amount * 10000).toLocaleString();
              const scToCredit =
                customDepositSC[d.id] !== undefined ? customDepositSC[d.id] : calculatedSC;

              const methodStyle = getMethodBadgeStyle(d.methodName);
              const note = d.senderNote || d.txHash;
              const isPending = d.status === 'pending';

              return (
                <div
                  key={d.id}
                  className={`p-4 rounded-2xl border flex flex-col gap-3.5 transition shadow-xl ${
                    isPending
                      ? 'bg-[var(--bg-surface)] border-amber-500/40 shadow-amber-500/10'
                      : 'bg-[var(--bg-surface)] border-[var(--neon-cyan)]/25'
                  }`}
                >
                  {/* Card Header: User & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--neon-cyan)] to-[var(--neon-purple)] flex items-center justify-center font-black text-black text-sm shadow">
                        {d.username ? d.username.charAt(0) : 'U'}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm leading-tight">{d.username}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                          <Clock size={11} />
                          <span>{formatRelativeTime(d.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        PENDING
                      </span>
                    ) : d.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check size={11} />
                        APPROVED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                        <X size={11} />
                        REJECTED
                      </span>
                    )}
                  </div>

                  {/* Financial Details Box */}
                  <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold">Deposit Amount:</span>
                      <span className="font-black text-amber-300 text-sm font-mono">
                        ${Number(d.amount).toFixed(2)} USD
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold">Payment Method:</span>
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${methodStyle.bg} ${methodStyle.border} ${methodStyle.text}`}
                      >
                        {d.methodName}
                      </span>
                    </div>

                    {note && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-[11px] text-gray-400 font-bold">Cashtag/TX:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-amber-300 text-xs select-all">{note}</span>
                          <button
                            onClick={() => handleCopy(note, d.id)}
                            className="p-1 rounded bg-white/10 text-gray-300 hover:text-white"
                          >
                            {copiedId === d.id ? (
                              <CheckCheck size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coins Breakdown Box */}
                  <div className="p-3 bg-emerald-500/[0.06] rounded-xl border border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-emerald-400 text-sm font-mono">{calculatedSC} SC</span>
                        <span
                          className={`text-[9.5px] px-1.5 py-0.5 rounded font-black uppercase border ${
                            bonusType === 'welcome'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-600/30'
                          }`}
                        >
                          +{bonusPercent}%
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">+{calculatedGC} GC</span>
                    </div>

                    <div className="text-[10.5px] text-gray-400">
                      Base: ${d.amount} + Bonus: ${bonusSC} SC
                    </div>

                    {isPending && (
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase text-gray-300">To Credit:</span>
                        <div className="flex items-center bg-black/60 border border-emerald-500/50 rounded-lg px-2 py-1 font-mono font-bold text-emerald-400 text-xs">
                          <span>$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={scToCredit}
                            onChange={(e) =>
                              setCustomDepositSC({ ...customDepositSC, [d.id]: e.target.value })
                            }
                            className="w-16 bg-transparent text-emerald-300 font-mono text-xs font-black focus:outline-none px-1"
                          />
                          <span>SC</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isPending && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleExecuteApprove(d, scToCredit)}
                        disabled={approvingId === d.id}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                      >
                        {approvingId === d.id ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Check size={14} strokeWidth={3} />
                        )}
                        <span>Approve ({scToCredit} SC)</span>
                      </button>

                      <button
                        onClick={() => setRejectModal({ open: true, deposit: d, reason: '' })}
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
                <h3 className="text-base font-black text-white">Reject Deposit Request</h3>
              </div>
              <button
                onClick={() => setRejectModal({ open: false, deposit: null, reason: '' })}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Rejecting request of{' '}
              <strong className="text-white">${rejectModal.deposit?.amount} USD</strong> from{' '}
              <strong className="text-amber-400">{rejectModal.deposit?.username}</strong>. Provide a reason
              so the player can fix payment:
            </p>

            <div className="space-y-2">
              {[
                'Cashtag/Transaction ID not found in bank ledger.',
                'Incorrect amount sent. Please contact 24/7 Concierge.',
                'Deposit pending verification. Please resend proof screenshot.',
              ].map((quickReason) => (
                <button
                  key={quickReason}
                  type="button"
                  onClick={() => setRejectModal({ ...rejectModal, reason: quickReason })}
                  className="w-full text-left p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 border border-white/5 transition"
                >
                  {quickReason}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Or enter custom rejection reason..."
              className="w-full p-3 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModal({ open: false, deposit: null, reason: '' })}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black shadow-lg shadow-red-500/30"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Payment Receipt Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/40 rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--neon-cyan)]" />
                {previewImage.title || 'Payment Receipt Proof'}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black/50 rounded-2xl p-2 border border-white/5">
              <img
                src={previewImage.url}
                alt="Receipt Full Preview"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400 font-mono">
                Click outside to close preview
              </span>
              <a
                href={previewImage.url}
                download="payment_proof.png"
                className="px-4 py-2 rounded-xl bg-[var(--neon-cyan)] hover:bg-amber-300 text-black text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-amber-500/25"
              >
                <span>Save Image</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
