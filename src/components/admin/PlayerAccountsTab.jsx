'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Coins,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Unlock,
  Sparkles,
  DollarSign,
  Clock,
  UserCheck
} from 'lucide-react';

export default function PlayerAccountsTab({
  usersList = [],
  onOpenAllotment,
  onResetPassword,
  onToggleBan,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'BANNED'

  const filteredUsers = usersList.filter((u) => {
    if (statusFilter === 'ACTIVE' && u.isBanned) return false;
    if (statusFilter === 'BANNED' && !u.isBanned) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchPhone = (u.phone || '').toLowerCase().includes(q);
      if (!matchUsername && !matchEmail && !matchPhone) return false;
    }

    return true;
  });

  const totalSC = usersList.reduce((acc, u) => acc + (Number(u.balanceSC) || 0), 0);
  const totalGC = usersList.reduce((acc, u) => acc + (Number(u.balanceGC) || 0), 0);
  const bannedCount = usersList.filter((u) => u.isBanned).length;

  return (
    <div className="space-y-5">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Player Accounts</div>
          <div className="text-xl font-heading font-black text-white mt-1">
            {usersList.length} <span className="text-xs text-[var(--neon-cyan)] font-sans">({bannedCount} Banned)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-emerald-500/20 backdrop-blur-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Player SC Balances</div>
          <div className="text-xl font-heading font-black text-emerald-400 mt-1">
            ${totalSC.toFixed(2)} SC
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-600/20 backdrop-blur-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Player GC Balances</div>
          <div className="text-xl font-heading font-black text-[var(--neon-purple)] mt-1">
            {totalGC.toLocaleString()} GC
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'BANNED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-amber-500 text-black font-black shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username, email, phone..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none"
          />
        </div>
      </div>

      {/* Players Directory List */}
      <div className="space-y-3">
        {filteredUsers.map((u) => (
          <div
            key={u.id || u._id}
            className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            {/* Player Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 shrink-0">
                <div className="w-full h-full bg-[var(--bg-deep)] rounded-2xl flex items-center justify-center font-heading font-black text-[var(--neon-cyan)] text-sm">
                  {u.username?.slice(0, 2).toUpperCase() || 'PL'}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-bold text-sm text-white">
                    @{u.username}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {u.email}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-950 border border-amber-600/40 text-amber-300 uppercase">
                    {u.vipTier || 'Bronze Panda'}
                  </span>
                  {u.isBanned && (
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-rose-950 border border-rose-500/40 text-rose-300 uppercase animate-pulse">
                      BANNED
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>KYC: <strong className={u.kycStatus === 'approved' ? 'text-emerald-400' : 'text-amber-400'}>{u.kycStatus || 'unverified'}</strong></span>
                  <span>•</span>
                  <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Balances */}
            <div className="flex items-center gap-4 self-end md:self-center">
              <div className="text-right">
                <div className="text-sm font-heading font-black text-[var(--neon-cyan)]">
                  ${Number(u.balanceSC || 0).toFixed(2)} <span className="text-xs font-sans text-slate-400">SC</span>
                </div>
                <div className="text-[11px] text-[var(--neon-purple)] font-mono">
                  {Number(u.balanceGC || 0).toLocaleString()} GC
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenAllotment(u)}
                  className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Adjust Balance"
                >
                  <Coins size={13} />
                  <span>Adjust</span>
                </button>

                <button
                  onClick={() => onResetPassword?.(u)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Reset Player Password"
                >
                  <ShieldCheck size={13} />
                  <span>Pass</span>
                </button>

                <button
                  onClick={() => onToggleBan(u.id || u._id, u.isBanned)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    u.isBanned
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/60'
                  }`}
                  title={u.isBanned ? 'Unban Account' : 'Ban Account'}
                >
                  {u.isBanned ? <Unlock size={14} /> : <Ban size={14} />}
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 p-6 rounded-2xl bg-[var(--bg-surface)]/50 border border-slate-800 text-slate-500 space-y-2">
            <Users size={28} className="mx-auto opacity-40 text-[var(--neon-cyan)]" />
            <p className="font-heading text-sm">No player accounts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
