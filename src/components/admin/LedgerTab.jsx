'use client';

import React, { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  CreditCard,
  AlertCircle,
  DollarSign,
  Gamepad2,
  Check,
  RotateCcw,
  Ban,
  FileText,
  Upload,
  X,
  RefreshCw
} from 'lucide-react';

export default function LedgerTab({
  deposits = [],
  withdrawals = [],
  onApproveDeposit,
  onRejectDeposit,
  onProcessPayout,
  onReApproveTransaction,
  onInspectProof,
}) {
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('PENDING'); // 'PENDING' | 'FAILED' | 'SUCCESS' | 'ALL'
  const [searchTerm, setSearchTerm] = useState('');

  // Payout Processing Modal State
  const [payoutModal, setPayoutModal] = useState({
    isOpen: false,
    tx: null,
    payoutType: 'full', // 'full' | 'partial'
    sentAmount: '',
    holdAmount: '0',
    gateway: 'Chime',
    customNote: '',
    payoutProof: '',
  });

  // Filter deposits
  const filteredDeposits = deposits.filter((tx) => {
    if (ledgerStatusFilter === 'PENDING' && tx.status !== 'PENDING') return false;
    if (ledgerStatusFilter === 'FAILED' && tx.status !== 'REJECTED' && tx.status !== 'FAILED') return false;
    if (ledgerStatusFilter === 'SUCCESS' && tx.status !== 'APPROVED' && tx.status !== 'COMPLETED') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchEmail = (tx.email || tx.userEmail || '').toLowerCase().includes(q);
      const matchMethod = (tx.methodName || tx.method || '').toLowerCase().includes(q);
      const matchTag = (tx.senderTag || tx.cashtag || '').toLowerCase().includes(q);
      const matchGame = (tx.gameTitle || '').toLowerCase().includes(q);
      if (!matchEmail && !matchMethod && !matchTag && !matchGame) return false;
    }
    return true;
  });

  // Filter withdrawals
  const filteredWithdrawals = withdrawals.filter((tx) => {
    if (ledgerStatusFilter === 'PENDING' && tx.status !== 'PENDING') return false;
    if (ledgerStatusFilter === 'FAILED' && tx.status !== 'REJECTED' && tx.status !== 'FAILED') return false;
    if (ledgerStatusFilter === 'SUCCESS' && tx.status !== 'APPROVED' && tx.status !== 'COMPLETED') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchEmail = (tx.email || tx.userEmail || '').toLowerCase().includes(q);
      const matchMethod = (tx.methodName || tx.method || '').toLowerCase().includes(q);
      const matchTag = (tx.payoutAddress || tx.cashtag || '').toLowerCase().includes(q);
      const matchGame = (tx.gameTitle || '').toLowerCase().includes(q);
      if (!matchEmail && !matchMethod && !matchTag && !matchGame) return false;
    }
    return true;
  });

  const handleOpenPayout = (tx) => {
    const total = parseFloat(tx.amountSC || tx.amount || 0);
    setPayoutModal({
      isOpen: true,
      tx,
      payoutType: 'full',
      sentAmount: total.toString(),
      holdAmount: '0',
      gateway: tx.methodName || tx.method || 'Cash App',
      customNote: `Full payout processed to ${tx.methodName || tx.method || 'account'}`,
      payoutProof: '',
    });
  };

  const handlePayoutTypeChange = (type) => {
    if (!payoutModal.tx) return;
    const total = parseFloat(payoutModal.tx.amountSC || payoutModal.tx.amount || 0);
    if (type === 'full') {
      setPayoutModal((prev) => ({
        ...prev,
        payoutType: 'full',
        sentAmount: total.toString(),
        holdAmount: '0',
        customNote: `Full payout processed to ${prev.gateway}`,
      }));
    } else {
      const half = (total / 2).toFixed(2);
      const hold = (total - parseFloat(half)).toFixed(2);
      setPayoutModal((prev) => ({
        ...prev,
        payoutType: 'partial',
        sentAmount: half,
        holdAmount: hold,
        customNote: `$${half} sent to your ${prev.gateway} & $${hold} is on hold`,
      }));
    }
  };

  const handleSentAmountChange = (val) => {
    if (!payoutModal.tx) return;
    const total = parseFloat(payoutModal.tx.amountSC || payoutModal.tx.amount || 0);
    const sent = parseFloat(val || 0);
    const hold = Math.max(0, total - sent).toFixed(2);
    setPayoutModal((prev) => ({
      ...prev,
      sentAmount: val,
      holdAmount: hold,
      customNote: prev.payoutType === 'partial' ? `$${val} sent to your ${prev.gateway} & $${hold} is on hold` : prev.customNote,
    }));
  };

  const submitPayout = async (e) => {
    e.preventDefault();
    if (!payoutModal.tx) return;
    const txId = payoutModal.tx.id || payoutModal.tx._id;
    await onProcessPayout?.({
      id: txId,
      sentAmount: payoutModal.sentAmount,
      holdAmount: payoutModal.holdAmount,
      gateway: payoutModal.gateway,
      customNote: payoutModal.customNote,
      payoutProof: payoutModal.payoutProof,
    });
    setPayoutModal({ isOpen: false, tx: null, payoutType: 'full', sentAmount: '', holdAmount: '0', gateway: '', customNote: '', payoutProof: '' });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-sm md:text-base text-white tracking-wider flex items-center gap-2">
            <Wallet size={20} className="text-[var(--neon-cyan)]" />
            FINANCIAL TRANSACTION LEDGER
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit deposits, verify receipt screenshots, and process player redemption payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          <select
            value={ledgerStatusFilter}
            onChange={(e) => setLedgerStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-amber-400 text-amber-300 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="PENDING">PENDING (Requires Action)</option>
            <option value="SUCCESS">SUCCESS / APPROVED</option>
            <option value="FAILED">FAILED / REJECTED</option>
            <option value="ALL">ALL STATUSES</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ledger by email, player username, gateway, sender tag, or notes..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. DEPOSIT REQUESTS SECTION                                     */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
          <h3 className="font-heading font-black text-xs md:text-sm text-emerald-400 tracking-wider flex items-center gap-2">
            <ArrowDownLeft size={18} />
            DEPOSIT REQUESTS ({filteredDeposits.length} Records)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Incoming player funding</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-[var(--bg-deep)] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/90 bg-[#060814] text-slate-400 text-[10px] font-heading font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4">User Email &amp; Gamer</th>
                  <th className="py-3 px-3">Game Title</th>
                  <th className="py-3 px-3">Tx Type</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-4">Gateway &amp; Sender Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Payment Proof</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDeposits.map((tx, idx) => {
                  const isPending = tx.status === 'PENDING';
                  const isSuccess = tx.status === 'APPROVED' || tx.status === 'COMPLETED';
                  const isFailed = tx.status === 'REJECTED' || tx.status === 'FAILED';
                  const hasProof = !!(tx.proofImage || tx.receiptUrl || tx.screenshot);

                  return (
                    <tr
                      key={tx.id || tx._id}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        isPending ? 'bg-emerald-950/15' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{tx.email || tx.userEmail || '—'}</div>
                        {(tx.gameUsername || tx.username) && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-[var(--neon-cyan)] font-mono mt-0.5 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                            <Gamepad2 size={11} />
                            <span>@{tx.gameUsername || tx.username}</span>
                          </div>
                        )}
                      </td>

                      {/* Game Title */}
                      <td className="py-3.5 px-3 font-heading font-bold text-amber-300">
                        {tx.gameTitle || 'Lobby'}
                      </td>

                      {/* Tx Type */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                          {tx.type || 'DEPOSIT'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 text-right font-heading font-black text-emerald-400 text-sm">
                        +${Number(tx.amountSC || tx.amount || 0).toFixed(2)}
                      </td>

                      {/* Gateway Details */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white text-[11px]">
                            {tx.methodName || tx.method || 'Direct'}
                          </span>
                          {tx.senderTag && (
                            <div className="text-[10px] text-amber-300 font-mono">
                              Sender: {tx.senderTag}
                            </div>
                          )}
                          {tx.nameOnTag && (
                            <div className="text-[10px] text-slate-400">
                              Name: <strong className="text-slate-200">{tx.nameOnTag}</strong>
                            </div>
                          )}
                          {tx.referenceNumber && (
                            <div className="text-[10px] text-amber-300 font-mono">
                              Ref: #{tx.referenceNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                            isPending
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 animate-pulse'
                              : isSuccess
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                              : 'bg-rose-950/80 text-rose-300 border-rose-600/50'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      {/* Proof Button */}
                      <td className="py-3.5 px-3 text-center">
                        {hasProof ? (
                          <button
                            onClick={() => onInspectProof?.(tx)}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 hover:text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Proof</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[10px] italic">No image</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onApproveDeposit(tx.id || tx._id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm cursor-pointer"
                              title="Approve and Credit Player Wallet"
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => onRejectDeposit(tx.id || tx._id)}
                              className="px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 hover:bg-rose-900 text-rose-300 text-[10px] font-bold cursor-pointer"
                              title="Reject Deposit"
                            >
                              <XCircle size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onReApproveTransaction?.(tx)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Re-open / Override"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredDeposits.length === 0 && (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-slate-500">
                      No deposit records match current criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. WITHDRAWAL REQUESTS SECTION                                  */}
      {/* ============================================================== */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b border-amber-600/20 pb-2.5">
          <h3 className="font-heading font-black text-xs md:text-sm text-[var(--neon-purple)] tracking-wider flex items-center gap-2">
            <ArrowUpRight size={18} />
            WITHDRAWAL / REDEMPTION REQUESTS ({filteredWithdrawals.length} Records)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Player cashout payouts</span>
        </div>

        <div className="rounded-2xl border border-amber-600/20 bg-[var(--bg-deep)] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/90 bg-[#060814] text-slate-400 text-[10px] font-heading font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4">User Email &amp; Gamer</th>
                  <th className="py-3 px-3">Game Title</th>
                  <th className="py-3 px-3">Tx Type</th>
                  <th className="py-3 px-3 text-right">Payout Amount</th>
                  <th className="py-3 px-4">Payout Method &amp; Handle</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredWithdrawals.map((tx, idx) => {
                  const isPending = tx.status === 'PENDING';
                  const isSuccess = tx.status === 'APPROVED' || tx.status === 'COMPLETED';

                  return (
                    <tr
                      key={tx.id || tx._id}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        isPending ? 'bg-amber-950/15' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{tx.email || tx.userEmail || '—'}</div>
                        {(tx.gameUsername || tx.username) && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-mono mt-0.5 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/30">
                            <Gamepad2 size={11} />
                            <span>@{tx.gameUsername || tx.username}</span>
                          </div>
                        )}
                      </td>

                      {/* Game Title */}
                      <td className="py-3.5 px-3 font-heading font-bold text-amber-300">
                        {tx.gameTitle || 'Lobby'}
                      </td>

                      {/* Tx Type */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-950 border border-amber-600/40 text-amber-300">
                          {tx.type || 'WITHDRAW'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 text-right font-heading font-black text-[var(--neon-purple)] text-sm">
                        -${Number(tx.amountSC || tx.amount || 0).toFixed(2)}
                      </td>

                      {/* Payout Details */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white text-[11px]">
                            {tx.methodName || tx.method || 'Chime / Cash App'}
                          </span>
                          <div className="text-[10px] text-amber-300 font-mono">
                            To: {tx.payoutAddress || tx.cashtag || 'Direct Transfer'}
                          </div>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                            isPending
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 animate-pulse'
                              : isSuccess
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                              : 'bg-rose-950/80 text-rose-300 border-rose-600/50'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <button
                            onClick={() => handleOpenPayout(tx)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-white font-heading font-black text-[10px] shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                          >
                            Process Payout
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-mono">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredWithdrawals.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-500">
                      No withdrawal records match current criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. PROCESS PAYOUT MODAL (Full vs Partial + Receipt Upload)      */}
      {/* ============================================================== */}
      {payoutModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#0a0d1f] border border-amber-600/40 rounded-3xl p-6 shadow-[0_0_60px_rgba(245,158,11,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[var(--neon-purple)] flex items-center justify-center font-bold">
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-white text-sm">PROCESS REDEMPTION PAYOUT</h3>
                  <p className="text-[11px] text-slate-400">Player: @{payoutModal.tx?.email || payoutModal.tx?.userEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setPayoutModal({ ...payoutModal, isOpen: false })}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submitPayout} className="space-y-4">
              {/* Payout Type Radio */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Payout Type Selection
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePayoutTypeChange('full')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      payoutModal.payoutType === 'full'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Full Payout ($
                    {Number(payoutModal.tx?.amountSC || payoutModal.tx?.amount || 0).toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayoutTypeChange('partial')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      payoutModal.payoutType === 'partial'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Partial Payout + Hold
                  </button>
                </div>
              </div>

              {/* Amounts breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Sent Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payoutModal.sentAmount}
                    onChange={(e) => handleSentAmountChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Amount Kept On Hold ($)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={payoutModal.holdAmount}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Payout Gateway */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Payout Gateway Used
                </label>
                <input
                  type="text"
                  required
                  value={payoutModal.gateway}
                  onChange={(e) => setPayoutModal({ ...payoutModal, gateway: e.target.value })}
                  placeholder="e.g. Chime, Cash App, Bitcoin"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Custom Note */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Note Sent to Player
                </label>
                <input
                  type="text"
                  required
                  value={payoutModal.customNote}
                  onChange={(e) => setPayoutModal({ ...payoutModal, customNote: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Receipt screenshot URL */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Payout Receipt Screenshot URL / Confirmation
                </label>
                <input
                  type="text"
                  value={payoutModal.payoutProof}
                  onChange={(e) => setPayoutModal({ ...payoutModal, payoutProof: e.target.value })}
                  placeholder="https://... receipt image"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModal({ ...payoutModal, isOpen: false })}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-white font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  <Check size={14} />
                  <span>CONFIRM &amp; DISPATCH PAYOUT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
