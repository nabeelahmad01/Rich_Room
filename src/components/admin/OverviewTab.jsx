'use client';

import React from 'react';
import {
  TrendingUp,
  Users,
  Wallet,
  KeyRound,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Coins,
  ChevronRight,
  Clock,
  Sparkles,
  CreditCard
} from 'lucide-react';

export default function OverviewTab({
  stats,
  requests = [],
  deposits = [],
  withdrawals = [],
  onNavigateTab,
  onInspectProof,
  onApproveRequestClick,
}) {
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const pendingDeposits = deposits.filter((d) => d.status === 'PENDING');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING');

  const totalDepositVolume = deposits
    .filter((d) => d.status === 'APPROVED')
    .reduce((acc, curr) => acc + (Number(curr.amountSC) || 0), 0);

  const totalWithdrawalVolume = withdrawals
    .filter((w) => w.status === 'APPROVED')
    .reduce((acc, curr) => acc + (Number(curr.amountSC) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Alert Banner for Pending Action Items */}
      {(pendingRequests.length > 0 || pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-[0_0_25px_rgba(244,63,94,0.15)] animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="font-heading font-black text-xs md:text-sm text-white uppercase tracking-wider">
                Action Items Awaiting Verification
              </h4>
              <p className="text-xs text-rose-300">
                You have {pendingRequests.length} pending game requests, {pendingDeposits.length} deposits, and {pendingWithdrawals.length} redemption requests.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingRequests.length > 0 && (
              <button
                onClick={() => onNavigateTab('requests')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wider cursor-pointer"
              >
                View Requests ({pendingRequests.length})
              </button>
            )}
            {(pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
              <button
                onClick={() => onNavigateTab('ledger')}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs tracking-wider cursor-pointer"
              >
                View Ledger ({pendingDeposits.length + pendingWithdrawals.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Players */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Players</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[var(--neon-cyan)] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-heading font-black text-white">
              {stats?.totalUsers || 0}
            </div>
            <div className="text-[11px] text-[var(--neon-cyan)] mt-1 flex items-center gap-1">
              <ShieldCheck size={12} /> Active Accounts
            </div>
          </div>
        </div>

        {/* Card 2: Deposits Volume */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-emerald-500/20 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deposits Settled</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-heading font-black text-emerald-400">
              ${totalDepositVolume.toFixed(2)} <span className="text-xs font-sans text-slate-400">SC</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {deposits.filter((d) => d.status === 'APPROVED').length} Approved Transactions
            </div>
          </div>
        </div>

        {/* Card 3: Redemptions Paid */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-600/20 backdrop-blur-xl relative overflow-hidden group hover:border-amber-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Redemptions Settled</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-600/30 text-[var(--neon-purple)] flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-heading font-black text-[var(--neon-purple)]">
              ${totalWithdrawalVolume.toFixed(2)} <span className="text-xs font-sans text-slate-400">SC</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {withdrawals.filter((w) => w.status === 'APPROVED').length} Approved Payouts
            </div>
          </div>
        </div>

        {/* Card 4: Net Retention Vault */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-rose-500/20 backdrop-blur-xl relative overflow-hidden group hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Cash Vault</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-heading font-black text-rose-300">
              ${(totalDepositVolume - totalWithdrawalVolume).toFixed(2)} <span className="text-xs font-sans text-slate-400">SC</span>
            </div>
            <div className="text-[11px] text-rose-400 mt-1">
              Net House Revenue
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Station */}
      <div className="p-5 rounded-2xl bg-[#0a0e24]/90 border border-amber-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-black text-xs md:text-sm text-white tracking-wider flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--neon-cyan)]" /> RAPID COMMAND ACTIONS
          </h3>
          <span className="text-[11px] text-slate-400">Instant Navigation</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onNavigateTab('requests')}
            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-400 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-[var(--neon-cyan)] mb-1">
              <KeyRound size={16} />
              <span className="text-[10px] font-bold text-amber-950 px-1.5 py-0.5 rounded text-amber-300">
                {pendingRequests.length}
              </span>
            </div>
            <div className="text-xs font-bold text-white group-hover:text-amber-300">Game Requests</div>
            <div className="text-[10px] text-slate-400">Assign Platform Accounts</div>
          </button>

          <button
            onClick={() => onNavigateTab('ledger')}
            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-400 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <Wallet size={16} />
              <span className="text-[10px] font-bold bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300">
                {pendingDeposits.length + pendingWithdrawals.length}
              </span>
            </div>
            <div className="text-xs font-bold text-white group-hover:text-emerald-300">Financial Ledger</div>
            <div className="text-[10px] text-slate-400">Review Proof & Payouts</div>
          </button>

          <button
            onClick={() => onNavigateTab('coins')}
            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-[var(--neon-purple)] mb-1">
              <Coins size={16} />
              <ChevronRight size={14} />
            </div>
            <div className="text-xs font-bold text-white group-hover:text-amber-300">Balance Adjuster</div>
            <div className="text-[10px] text-slate-400">Direct Player Credit/Debit</div>
          </button>

          <button
            onClick={() => onNavigateTab('support')}
            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-400 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <CreditCard size={16} />
              <ChevronRight size={14} />
            </div>
            <div className="text-xs font-bold text-white group-hover:text-rose-300">Live Support Chat</div>
            <div className="text-[10px] text-slate-400">Reply to Player Inquiries</div>
          </button>
        </div>
      </div>

      {/* Two-Column Feeds: Recent Requests & Recent Deposits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Game Requests */}
        <div className="p-5 rounded-2xl bg-[#0a0e24]/90 border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="font-heading font-black text-xs md:text-sm text-white tracking-wider flex items-center gap-2">
              <KeyRound size={16} className="text-[var(--neon-cyan)]" /> LATEST GAME REQUESTS
            </h3>
            <button
              onClick={() => onNavigateTab('requests')}
              className="text-xs text-[var(--neon-cyan)] hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              View All <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5">
            {requests.slice(0, 5).map((req) => (
              <div
                key={req.id || req._id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    @{req.playerUsername || 'Player'}
                  </div>
                  <div className="text-[11px] text-[var(--neon-cyan)] font-mono">
                    {req.gameTitle || req.gamePlatform}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      req.status === 'PENDING'
                        ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                        : req.status === 'READY' || req.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                        : 'bg-rose-950 text-rose-300 border border-rose-600/40'
                    }`}
                  >
                    {req.status}
                  </span>
                  {req.status === 'PENDING' && (
                    <button
                      onClick={() => onApproveRequestClick(req)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] tracking-wider cursor-pointer"
                    >
                      APPROVE
                    </button>
                  )}
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs">
                No game requests on file.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Deposits */}
        <div className="p-5 rounded-2xl bg-[#0a0e24]/90 border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="font-heading font-black text-xs md:text-sm text-white tracking-wider flex items-center gap-2">
              <Wallet size={16} className="text-emerald-400" /> LATEST TRANSACTIONS
            </h3>
            <button
              onClick={() => onNavigateTab('ledger')}
              className="text-xs text-[var(--neon-cyan)] hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              View All <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5">
            {deposits.slice(0, 5).map((dep) => (
              <div
                key={dep.id || dep._id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    @{dep.username || dep.playerUsername}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {dep.methodName || dep.method} • <span className="text-amber-300">{dep.senderTag || 'No Tag'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="font-heading font-bold text-emerald-400">
                      +${Number(dep.amountSC || dep.amount || 0).toFixed(2)}
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        dep.status === 'PENDING'
                          ? 'bg-amber-950 text-amber-300'
                          : dep.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      {dep.status}
                    </span>
                  </div>
                  {dep.proofImage && (
                    <button
                      onClick={() => onInspectProof(dep)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold cursor-pointer"
                    >
                      PROOF
                    </button>
                  )}
                </div>
              </div>
            ))}
            {deposits.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs">
                No recent transactions recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
