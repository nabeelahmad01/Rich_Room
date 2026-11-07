'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Sparkles,
  Gamepad2,
  Clock,
  User,
  ShieldAlert,
  Gift,
  Plus,
  Trash2,
  Edit,
  ExternalLink
} from 'lucide-react';

export default function RequestsTab({
  requests = [],
  usersList = [],
  gamesList = [],
  onApproveClick,
  onRejectClick,
  onAddAccountClick,
  onDeleteGameAccount,
}) {
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'READY' | 'REJECTED'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filteredRequests = requests.filter((req) => {
    // Status Filter
    if (statusFilter === 'PENDING' && req.status !== 'PENDING') return false;
    if (statusFilter === 'READY' && req.status !== 'READY' && req.status !== 'APPROVED') return false;
    if (statusFilter === 'REJECTED' && req.status !== 'REJECTED') return false;

    // Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchEmail = (req.userEmail || '').toLowerCase().includes(q);
      const matchName = (req.userName || '').toLowerCase().includes(q);
      const matchGame = (req.gameTitle || '').toLowerCase().includes(q);
      const matchAccount = (req.gameAccountUsername || '').toLowerCase().includes(q);
      if (!matchEmail && !matchName && !matchGame && !matchAccount) return false;
    }

    return true;
  });

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const readyCount = requests.filter((r) => r.status === 'READY' || r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-sm md:text-base text-white tracking-wider flex items-center gap-2">
            <KeyRound size={20} className="text-[var(--neon-cyan)]" />
            GAME ACCOUNT REQUESTS &amp; CREATED ACCOUNTS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pending requests stay pinned on top · Automated and manual game platform provisioning
          </p>
        </div>

        <button
          onClick={onAddAccountClick}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-heading font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.35)] transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>ADD ACCOUNT MANUALLY</span>
        </button>
      </div>

      {/* Search & Status Filter Controls */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:w-auto">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search requests by email, player name, or game platform..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-amber-400 text-amber-300 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">ALL (Pending on top - {requests.length})</option>
            <option value="PENDING">PENDING (Requires Action - {pendingCount})</option>
            <option value="READY">READY / APPROVED ({readyCount})</option>
            <option value="REJECTED">REJECTED ({rejectedCount})</option>
          </select>
        </div>
      </div>

      {/* Requests Master Table */}
      <div className="rounded-2xl border border-amber-500/20 bg-[var(--bg-deep)] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/90 bg-[#060814] text-slate-400 text-[10px] font-heading font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-4">Player Name</th>
                <th className="py-3 px-4">Player Email</th>
                <th className="py-3 px-4">Requested Game</th>
                <th className="py-3 px-4">Game Account</th>
                <th className="py-3 px-4">Request Timestamp</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRequests.map((req, idx) => {
                const isPending = req.status === 'PENDING';
                const isReady = req.status === 'READY' || req.status === 'APPROVED';
                const isRejected = req.status === 'REJECTED';

                return (
                  <tr
                    key={req.id || req._id}
                    className={`hover:bg-slate-900/40 transition-colors ${
                      isPending ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Player Name */}
                    <td className="py-3.5 px-4 font-heading font-bold text-white">
                      {req.userName || req.userEmail?.split('@')[0] || '—'}
                    </td>

                    {/* Player Email */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--neon-cyan)]">
                      {req.userEmail || '—'}
                    </td>

                    {/* Requested Game */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-[10px]">
                          {req.gameTitle}
                        </span>
                        {req.freeplayPending && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-950 border border-emerald-500/40 text-emerald-300 tracking-wider">
                            <Gift size={10} />
                            <span>FREEPLAY ATTACHED (${Number(req.freeplayAmount || 3).toFixed(2)})</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Game Account Credentials */}
                    <td className="py-3.5 px-4 font-mono">
                      {req.gameAccountUsername ? (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                          <span className="text-amber-300 font-bold">{req.gameAccountUsername}</span>
                          <button
                            onClick={() =>
                              handleCopy(
                                `${req.gameAccountUsername} | ${req.gameAccountPassword}`,
                                req.id || req._id
                              )
                            }
                            className="text-slate-400 hover:text-white"
                            title="Copy credentials"
                          >
                            {copiedId === (req.id || req._id) ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      ) : req.existingAccounts && req.existingAccounts.length > 0 ? (
                        <div className="space-y-1">
                          {req.existingAccounts.slice(0, 2).map((acc, aIdx) => (
                            <div key={aIdx} className="text-[10px] text-slate-400">
                              <span className="text-slate-500">{acc.gameTitle}:</span>{' '}
                              <strong className="text-amber-300">{acc.username}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">No account yet</span>
                      )}
                    </td>

                    {/* Request Timestamp */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          isPending
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 animate-pulse'
                            : isReady
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                            : 'bg-rose-950/80 text-rose-300 border-rose-600/50'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onApproveClick(req)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 size={12} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => onRejectClick(req)}
                            className="px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 hover:bg-rose-900 text-rose-300 text-[10px] font-bold cursor-pointer"
                          >
                            <XCircle size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onApproveClick(req)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                            title="Edit credentials"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() =>
                              onDeleteGameAccount?.(req.userEmail, req.gameTitle)
                            }
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                            title="Delete game credentials"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <KeyRound size={28} className="mx-auto opacity-30 text-[var(--neon-cyan)] mb-2" />
                    <p className="font-heading text-sm">No game account requests match criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
