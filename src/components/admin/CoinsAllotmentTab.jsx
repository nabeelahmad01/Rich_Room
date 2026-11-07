'use client';

import React, { useState } from 'react';
import {
  Coins,
  Search,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Check,
  Eye,
  Clock,
  Gamepad2,
  RefreshCw,
  Plus,
  Sliders,
  X
} from 'lucide-react';

export default function CoinsAllotmentTab({
  tasks = [],
  onUpdateTaskStatus,
  onInspectProof,
  onManualAllotmentClick,
}) {
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'HOLD' | 'COMPLETED' | 'CANCELLED'
  const [searchTerm, setSearchTerm] = useState('');

  // Hold Note Modal State
  const [holdModal, setHoldModal] = useState({
    isOpen: false,
    task: null,
    noteText: '',
  });

  const holdPresets = [
    'Please select another game, this game is temporarily under maintenance.',
    'Invalid game account username. Please provide correct login details.',
    'Game server currently loading/slow. Please hold.',
    'Player low balance or transaction issue.',
  ];

  const filteredTasks = tasks.filter((t) => {
    // Status Filter
    if (statusTab === 'PENDING' && t.status !== 'PENDING' && t.status !== 'CLAIM_REQUESTED') return false;
    if (statusTab === 'HOLD' && t.status !== 'HOLD') return false;
    if (statusTab === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    if (statusTab === 'CANCELLED' && t.status !== 'CANCELLED' && t.status !== 'FAILED') return false;

    // Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchEmail = (t.userEmail || '').toLowerCase().includes(q);
      const matchUsername = (t.gameUsername || '').toLowerCase().includes(q);
      const matchGame = (t.gameTitle || '').toLowerCase().includes(q);
      const matchNote = (t.holdNote || '').toLowerCase().includes(q);
      if (!matchEmail && !matchUsername && !matchGame && !matchNote) return false;
    }

    return true;
  });

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'PENDING' || t.status === 'CLAIM_REQUESTED').length,
    hold: tasks.filter((t) => t.status === 'HOLD').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    cancelled: tasks.filter((t) => t.status === 'CANCELLED' || t.status === 'FAILED').length,
  };

  const handleOpenHold = (task) => {
    setHoldModal({
      isOpen: true,
      task,
      noteText: task.holdNote || '',
    });
  };

  const submitHoldNote = async () => {
    if (!holdModal.task) return;
    const taskId = holdModal.task.id || holdModal.task._id;
    const note = holdModal.noteText.trim();
    setHoldModal({ isOpen: false, task: null, noteText: '' });
    await onUpdateTaskStatus(taskId, 'HOLD', note);
  };

  const resumeFromHold = async (task) => {
    const taskId = task.id || task._id;
    await onUpdateTaskStatus(taskId, 'PENDING', '');
  };

  const markCompleted = async (task) => {
    const taskId = task.id || task._id;
    await onUpdateTaskStatus(taskId, 'COMPLETED', '');
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[var(--neon-cyan)] font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <Coins size={22} />
          </div>
          <div>
            <h2 className="font-heading font-black text-sm md:text-base text-white tracking-wider flex items-center gap-2">
              GAME COIN ALLOTMENT TASKS
              {statusCounts.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-black shadow-[0_0_10px_rgba(255,215,0,0.6)] animate-pulse">
                  {statusCounts.pending} NEW
                </span>
              )}
              {statusCounts.hold > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                  {statusCounts.hold} ON HOLD
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active queue stays pinned on top · Quick hold with notes · Loading coins into games
            </p>
          </div>
        </div>

        <button
          onClick={onManualAllotmentClick}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-white font-heading font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
        >
          <Sliders size={14} />
          <span>DIRECT BALANCE ADJUSTER</span>
        </button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'ALL', label: 'ALL TASKS', count: statusCounts.all, color: 'text-white' },
            { key: 'PENDING', label: 'PENDING / CLAIM', count: statusCounts.pending, color: 'text-[var(--neon-cyan)]', highlight: statusCounts.pending > 0 },
            { key: 'HOLD', label: 'ON HOLD', count: statusCounts.hold, color: 'text-amber-400', highlight: statusCounts.hold > 0 },
            { key: 'COMPLETED', label: 'COMPLETED', count: statusCounts.completed, color: 'text-emerald-400' },
            { key: 'CANCELLED', label: 'CANCELLED', count: statusCounts.cancelled, color: 'text-rose-400' },
          ].map((tab) => {
            const isActive = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-black font-black shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-slate-950 text-amber-300'
                      : tab.highlight
                      ? 'text-amber-950 text-[var(--neon-cyan)] border border-amber-500/50'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by player email, game username, game title, or hold notes..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none"
          />
        </div>
      </div>

      {/* Coin Allotment Tasks Master Table */}
      <div className="rounded-2xl border border-amber-500/20 bg-[var(--bg-deep)] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/90 bg-[#060814] text-slate-400 text-[10px] font-heading font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-4">Player Account</th>
                <th className="py-3 px-4">Target Game</th>
                <th className="py-3 px-3 text-right">Deposit Cash</th>
                <th className="py-3 px-3 text-right">Bonus</th>
                <th className="py-3 px-4 text-right">Allotment Target</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions / Hold Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTasks.map((t, idx) => {
                const isPending = t.status === 'PENDING' || t.status === 'CLAIM_REQUESTED';
                const isHold = t.status === 'HOLD';
                const isCompleted = t.status === 'COMPLETED';

                return (
                  <tr
                    key={t.id || t._id}
                    className={`hover:bg-slate-900/40 transition-colors ${
                      isHold
                        ? 'bg-amber-950/20 border-l-2 border-amber-500'
                        : isPending
                        ? 'bg-amber-950/15 border-l-2 border-amber-400'
                        : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Player Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{t.userEmail}</div>
                      {t.gameUsername && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-[var(--neon-cyan)] font-mono mt-0.5 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                          <Gamepad2 size={11} />
                          <span>@{t.gameUsername}</span>
                        </div>
                      )}
                    </td>

                    {/* Target Game */}
                    <td className="py-3.5 px-4">
                      <span className="font-heading font-bold text-amber-300">
                        {t.gameTitle}
                      </span>
                    </td>

                    {/* Deposit Cash */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                      ${Number(t.depositCash || 0).toFixed(2)}
                    </td>

                    {/* Bonus */}
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-400">
                      {t.bonus > 0 ? `+$${Number(t.bonus).toFixed(2)}` : '—'}
                    </td>

                    {/* Allotment Target */}
                    <td className="py-3.5 px-4 text-right font-heading font-black text-[var(--neon-cyan)] text-sm">
                      ${Number(t.allotmentTarget || t.depositCash || 0).toFixed(2)} SC
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                            isPending
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 animate-pulse'
                              : isHold
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                              : isCompleted
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                              : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                          }`}
                        >
                          {t.status}
                        </span>
                        {isHold && t.holdNote && (
                          <span className="text-[10px] text-amber-300 italic max-w-[140px] truncate" title={t.holdNote}>
                            &quot;{t.holdNote}&quot;
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.proofImage && (
                          <button
                            onClick={() => onInspectProof?.(t)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300"
                            title="View Proof"
                          >
                            <Eye size={13} />
                          </button>
                        )}

                        {isPending && (
                          <>
                            <button
                              onClick={() => markCompleted(t)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm cursor-pointer"
                              title="Confirm Coins Loaded Into Game"
                            >
                              <Check size={12} />
                              <span>Done</span>
                            </button>
                            <button
                              onClick={() => handleOpenHold(t)}
                              className="px-2 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 hover:bg-amber-900 text-amber-300 text-[10px] font-bold cursor-pointer"
                              title="Put On Hold"
                            >
                              <Pause size={12} />
                            </button>
                          </>
                        )}

                        {isHold && (
                          <button
                            onClick={() => resumeFromHold(t)}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                            title="Resume Task"
                          >
                            <Play size={12} />
                            <span>Resume</span>
                          </button>
                        )}

                        {isCompleted && (
                          <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Allotted
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    <Coins size={28} className="mx-auto opacity-30 text-[var(--neon-cyan)] mb-2" />
                    <p className="font-heading text-sm">No coin allotment tasks match criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hold Note Modal */}
      {holdModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0a0d1f] border border-amber-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Pause size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-white text-sm">PUT ALLOTMENT ON HOLD</h3>
                  <p className="text-[11px] text-slate-400">Player: @{holdModal.task?.userEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setHoldModal({ isOpen: false, task: null, noteText: '' })}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Hold Note Presets
              </label>
              <div className="flex flex-col gap-1.5">
                {holdPresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setHoldModal({ ...holdModal, noteText: p })}
                    className="text-left text-[11px] p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                Custom Reason Note (Visible to Player)
              </label>
              <textarea
                rows={2}
                value={holdModal.noteText}
                onChange={(e) => setHoldModal({ ...holdModal, noteText: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 text-white rounded-xl p-2.5 text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setHoldModal({ isOpen: false, task: null, noteText: '' })}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitHoldNote}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-xs flex items-center justify-center gap-1 shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer"
              >
                <Pause size={13} />
                <span>CONFIRM HOLD</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
