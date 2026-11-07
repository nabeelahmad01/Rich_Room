'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  Sparkles,
  CreditCard,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Coins
} from 'lucide-react';
import { cleanGameTitle } from '@/lib/fastDiff';

// 1. Approve Game Account Request Modal
export function ApproveRequestModal({ isOpen, onClose, request, onConfirm }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !request) return null;

  const handleAutoGenerate = () => {
    const cleanPlayer = (request.playerUsername || request.playerEmail?.split('@')[0] || 'player')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randPass = '';
    for (let i = 0; i < 8; i++) {
      randPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUsername(`${cleanPlayer}_${randNum}`);
    setPassword(`${randPass}!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Both Game Username and Password are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(request.id || request._id, username.trim(), password.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to approve request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0a0d1f] border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(255,215,0,0.2)] space-y-5 max-h-[92vh] overflow-y-auto modal-scrollable">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-[var(--neon-cyan)]">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="font-heading font-black text-white text-base">APPROVE GAME ACCOUNT</h3>
              <p className="text-xs text-slate-400">
                Platform: <strong className="text-amber-300">{request.gameTitle || request.gamePlatform}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Request Details */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Player:</span>
            <span className="font-bold text-white">@{request.playerUsername || 'Player'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Email:</span>
            <span className="font-mono text-slate-300">{request.playerEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Game Platform:</span>
            <span className="font-bold text-[var(--neon-cyan)]">{request.gameTitle || request.gamePlatform}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Assign Platform Credentials</span>
            <button
              type="button"
              onClick={handleAutoGenerate}
              className="text-[11px] font-bold text-[var(--neon-cyan)] hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles size={13} /> Auto-Generate
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
              Game Account Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. panda_player77"
              className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
              Game Account Password
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. Pass@9921"
              className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.4)] disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>CONFIRM & DISPATCH</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Reject Request Modal
export function RejectRequestModal({ isOpen, onClose, request, onConfirm }) {
  const [reason, setReason] = useState('Duplicate request or platform maintenance.');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !request) return null;

  const presets = [
    'Duplicate request already provisioned.',
    'Platform under maintenance. Please request again later.',
    'Verification required before assigning new account.',
    'System limit reached for this game platform.'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(request.id || request._id, reason);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0a0d1f] border border-rose-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(244,63,94,0.2)] space-y-5 max-h-[92vh] overflow-y-auto modal-scrollable">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-heading font-black text-white text-base">REJECT REQUEST</h3>
              <p className="text-xs text-slate-400">Provide rejection reason</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setReason(p)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-600 text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
              Rejection Reason (Sent to Player)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-700 focus:border-rose-400 text-white rounded-xl p-3 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
              <span>REJECT REQUEST</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. Inspect Deposit Receipt / Proof Modal
export function InspectProofModal({ isOpen, onClose, transaction, onApprove, onReject }) {
  if (!isOpen || !transaction) return null;

  const proofUrl = transaction.proofImage || transaction.proofUrl || transaction.receiptUrl;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0a0d1f] border border-amber-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(255,215,0,0.25)] space-y-4 max-h-[90vh] flex flex-col cursor-default"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-heading font-black text-white text-base">TRANSACTION PROOF INSPECTOR</h3>
            <p className="text-xs text-slate-400 font-mono">
              ID: {transaction.id || transaction._id} • {transaction.methodName || transaction.method}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Transaction Meta Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">PLAYER</div>
            <div className="font-bold text-white truncate">@{transaction.username || transaction.playerUsername}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">AMOUNT</div>
            <div className="font-bold text-[var(--neon-cyan)]">${Number(transaction.amountSC || transaction.amount || 0).toFixed(2)} SC</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">SENDER TAG</div>
            <div className="font-bold text-amber-300 truncate">{transaction.senderTag || transaction.cashtag || 'N/A'}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">STATUS</div>
            <div className={`font-bold ${transaction.status === 'PENDING' ? 'text-amber-400' : transaction.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {transaction.status}
            </div>
          </div>
        </div>

        {/* Proof Image Box */}
        <div className="flex-1 min-h-[260px] max-h-[460px] bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-auto p-2 relative">
          {proofUrl ? (
            <img
              src={proofUrl}
              alt="Deposit Proof"
              className="max-w-full max-h-[440px] object-contain rounded-xl shadow-lg"
            />
          ) : (
            <div className="text-center text-slate-500 space-y-2">
              <CreditCard size={32} className="mx-auto opacity-40" />
              <p className="text-xs">No screenshot proof attached for this transaction.</p>
              <p className="text-[11px] text-slate-600 font-mono">Reference: {transaction.reference || transaction.txHash || 'Manual Transfer'}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {transaction.status === 'PENDING' && (
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => { onReject(transaction.id || transaction._id); onClose(); }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-950/60 border border-rose-500/50 hover:bg-rose-900/80 text-rose-200 font-heading font-bold text-xs transition-all"
            >
              REJECT DEPOSIT
            </button>
            <button
              onClick={() => { onApprove(transaction.id || transaction._id); onClose(); }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-heading font-black text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
            >
              APPROVE & CREDIT WALLET
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. Quick Allotment Modal (Direct Player Balance Adjuster)
export function QuickAllotmentModal({ isOpen, onClose, targetUser, onComplete }) {
  const [amountSC, setAmountSC] = useState('');
  const [amountGC, setAmountGC] = useState('');
  const [actionType, setActionType] = useState('CREDIT');
  const [notes, setNotes] = useState('Admin VIP Reward Adjustment');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !targetUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountSC && !amountGC) {
      setError('Please specify either SC or GC amount.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/coins/allotment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUser: targetUser.username || targetUser.email,
          amountSC: amountSC || '0',
          amountGC: amountGC || '0',
          actionType,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Adjustment failed.');
      onComplete?.(data.message);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0a0d1f] border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(255,215,0,0.2)] space-y-4 max-h-[92vh] overflow-y-auto modal-scrollable">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-[var(--neon-cyan)]">
              <Coins size={20} />
            </div>
            <div>
              <h3 className="font-heading font-black text-white text-base">BALANCE ADJUSTER</h3>
              <p className="text-xs text-slate-400">Player: <strong className="text-amber-300">@{targetUser.username}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Current Balances */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30">
            <div className="text-[10px] text-slate-400">CURRENT SC</div>
            <div className="text-sm font-heading font-bold text-[var(--neon-cyan)]">${Number(targetUser.balanceSC || 0).toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-600/30">
            <div className="text-[10px] text-slate-400">CURRENT GC</div>
            <div className="text-sm font-heading font-bold text-[var(--neon-purple)]">{Number(targetUser.balanceGC || 0).toLocaleString()}</div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Action Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('CREDIT')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  actionType === 'CREDIT'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                + CREDIT (ADD)
              </button>
              <button
                type="button"
                onClick={() => setActionType('DEBIT')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  actionType === 'DEBIT'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                - DEBIT (DEDUCT)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Sweepstakes Coins (SC)</label>
              <input
                type="number"
                step="0.01"
                value={amountSC}
                onChange={(e) => setAmountSC(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Game Coins (GC)</label>
              <input
                type="number"
                step="1"
                value={amountGC}
                onChange={(e) => setAmountGC(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Reason / Reference</label>
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.4)] disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>EXECUTE ADJUSTMENT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 5. Add Gateway Modal
export function AddGatewayModal({ isOpen, onClose, onComplete }) {
  const [form, setForm] = useState({
    name: '',
    category: 'CRYPTO',
    identifierTag: '',
    instructions: '',
    minDeposit: '10',
    maxDeposit: '5000',
    feePercentage: '0',
    qrCodeUrl: '',
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/payments/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          minDeposit: Number(form.minDeposit) || 10,
          maxDeposit: Number(form.maxDeposit) || 5000,
          feePercentage: Number(form.feePercentage) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create gateway.');
      onComplete?.(data.message);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0a0d1f] border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(255,215,0,0.2)] space-y-4 max-h-[92vh] overflow-y-auto modal-scrollable">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-[var(--neon-cyan)]">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="font-heading font-black text-white text-base">ADD PAYMENT GATEWAY</h3>
              <p className="text-xs text-slate-400">Configure new deposit/redemption channel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Gateway Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Cash App VIP, Zelle Fast, Bitcoin"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="CRYPTO">Crypto (BTC/ETH/USDT)</option>
                <option value="CARD">Credit/Debit Card</option>
                <option value="BANK">Bank Transfer / Zelle</option>
                <option value="EWALLET">E-Wallet (CashApp/Venmo)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Cashtag / Handle</label>
              <input
                type="text"
                required
                value={form.identifierTag}
                onChange={(e) => setForm({ ...form, identifierTag: e.target.value })}
                placeholder="$PlayerParadisePay"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Min Deposit ($)</label>
              <input
                type="number"
                value={form.minDeposit}
                onChange={(e) => setForm({ ...form, minDeposit: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Max Deposit ($)</label>
              <input
                type="number"
                value={form.maxDeposit}
                onChange={(e) => setForm({ ...form, maxDeposit: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Player Instructions</label>
            <input
              type="text"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Put your username in transfer note"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.4)] disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>SAVE GATEWAY</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 6. Add Staff Member Modal
export function AddStaffModal({ isOpen, onClose, onComplete }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'operation_admin',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create staff.');
      onComplete?.(data.message);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0a0d1f] border border-amber-600/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] space-y-4 max-h-[92vh] overflow-y-auto modal-scrollable">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-600/40 flex items-center justify-center text-[var(--neon-purple)]">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="font-heading font-black text-white text-base">ADD STAFF MEMBER</h3>
              <p className="text-xs text-slate-400">Provision sub-admin or support agent</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Username</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. staff_alex"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alex@playersparadisehub.com"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Assigned Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="operation_admin">Operational Manager (Full Operational Access)</option>
              <option value="financial_manager">Financial Manager (Ledger & Gateways)</option>
              <option value="coin_manager">Coins Manager (Requests & Balance Adjuster)</option>
              <option value="chat_support">Live Chat Support Agent</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-white font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
              <span>CREATE STAFF ACCOUNT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 7. Manual Add Game Account Modal (Proactively create credentials for a player)
export function ManualAddAccountModal({ isOpen, onClose, usersList = [], gamesList = [], onComplete }) {
  const activeGames = gamesList.map((g) => {
    const title = typeof g === 'string' ? g : (g.title || '');
    return cleanGameTitle(title);
  }).filter(Boolean);

  const [playerEmail, setPlayerEmail] = useState('');
  const [selectedGame, setSelectedGame] = useState(activeGames[0] || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (activeGames.length > 0 && (!selectedGame || !activeGames.includes(selectedGame))) {
      setSelectedGame(activeGames[0]);
    }
  }, [gamesList]);

  if (!isOpen) return null;

  const handleAutoGenerate = () => {
    const cleanPlayer = (playerEmail.split('@')[0] || 'player').toLowerCase().replace(/[^a-z0-9]/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randPass = '';
    for (let i = 0; i < 8; i++) {
      randPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUsername(`${cleanPlayer}_${randNum}`);
    setPassword(`${randPass}!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerEmail.trim()) {
      setError('Player email is required.');
      return;
    }
    if (!username.trim() || !password.trim()) {
      setError('Game username and password are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/game-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: playerEmail.trim(),
          gameTitle: selectedGame,
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create game credentials.');
      onComplete?.(data.message || 'Game account created successfully!');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0a0d1f] border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(255,215,0,0.2)] space-y-4 max-h-[92vh] overflow-y-auto modal-scrollable">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-[var(--neon-cyan)]">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="font-heading font-black text-white text-base">ADD GAME ACCOUNT</h3>
              <p className="text-xs text-slate-400">Manually provision platform credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Target Player Email / Account</label>
            <input
              type="email"
              required
              value={playerEmail}
              onChange={(e) => setPlayerEmail(e.target.value)}
              placeholder="player@demo.com"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
            {usersList.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[10px] text-slate-500 font-bold">Quick Pick:</span>
                {usersList.slice(0, 4).map((u) => (
                  <button
                    key={u.id || u._id}
                    type="button"
                    onClick={() => setPlayerEmail(u.email)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-[var(--neon-cyan)]"
                  >
                    @{u.username}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Casino Platform</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              {activeGames.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-300">Credentials</span>
            <button
              type="button"
              onClick={handleAutoGenerate}
              className="text-[11px] font-bold text-[var(--neon-cyan)] hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles size={12} /> Auto-Generate
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Assigned Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. panda_vip99"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Assigned Password</label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Pass@8821"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>SAVE &amp; ASSIGN ACCOUNT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 8. Reset Player Password Modal
export function ResetPasswordModal({ isOpen, onClose, user, onConfirm }) {
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleGenerate = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let p = 'Paradise';
    for (let i = 0; i < 4; i++) {
      p += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(p);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(user.id || user._id, newPassword);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0a0d1f] border border-amber-500/40 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in max-h-[92vh] overflow-y-auto modal-scrollable">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-heading font-black text-sm md:text-base text-white">Reset Player Password</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target: <strong className="text-[var(--neon-cyan)]">@{user.username}</strong> ({user.email})
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                New Player Password *
              </label>
              <button
                type="button"
                onClick={handleGenerate}
                className="text-[10px] text-[var(--neon-cyan)] font-bold hover:underline"
              >
                Auto-Generate
              </button>
            </div>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="e.g. Paradise2026!"
              required
              className="w-full bg-[#060817] border border-white/10 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-[11px] text-amber-300">
            💡 The player can immediately log in with this new password. Make sure to share it via Live Chat or SMS.
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 text-slate-950 font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>CONFIRM &amp; RESET</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


