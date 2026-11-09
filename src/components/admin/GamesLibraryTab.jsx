'use client';

import React, { useState } from 'react';
import {
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Power,
  Check,
  X,
  ExternalLink,
  Flame,
  Sparkles,
  RefreshCw,
  Search
} from 'lucide-react';

export default function GamesLibraryTab({
  games = [],
  onAddGame,
  onUpdateGame,
  onDeleteGame,
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSavingGame, setIsSavingGame] = useState(false);

  // New Game Form State
  const [newGame, setNewGame] = useState({
    title: '',
    provider: 'Rich Room Studio',
    thumbnail: '/images/vegas-777.svg',
    badge: 'HOT',
    url: '',
    isActive: true,
  });

  // Edit Game Modal State
  const [editingGame, setEditingGame] = useState(null);

  // Client-side image resize helper (max 500px webp so payload is lightweight and instant)
  const handleGameImageFile = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.85);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newGame.title.trim()) return alert('Game title is required.');
    setIsSavingGame(true);
    try {
      await onAddGame?.(newGame);
      setNewGame({
        title: '',
        provider: 'Rich Room Studio',
        thumbnail: '/images/vegas-777.svg',
        badge: 'HOT',
        url: '',
        isActive: true,
      });
    } finally {
      setIsSavingGame(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingGame || !editingGame.title.trim()) return alert('Game title is required.');
    setIsSavingGame(true);
    try {
      await onUpdateGame?.(editingGame);
      setEditingGame(null);
    } finally {
      setIsSavingGame(false);
    }
  };

  const filteredGames = games.filter((g) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (g.title || '').toLowerCase().includes(q) ||
      (g.provider || '').toLowerCase().includes(q) ||
      (g.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-black text-sm md:text-base text-white tracking-wider flex items-center gap-2">
            <Gamepad2 size={20} className="text-[var(--neon-cyan)]" />
            GAMES CATALOG &amp; SWEEPSTAKES PORTAL CONTROL
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage sweepstakes portals, upload covers, control ON/OFF visibility, and assign badges.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            {games.filter((g) => g.isActive !== false && g.active !== false).length} Active Online
          </span>
          <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
            {games.filter((g) => g.isActive === false || g.active === false).length} Inactive (OFF)
          </span>
        </div>
      </div>

      {/* Add New Game Form Card */}
      <div className="p-5 rounded-2xl bg-[#0a0e27]/90 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-xs md:text-sm font-heading font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Plus size={16} /> Add New Game / Sweepstakes Portal
          </h3>
          <span className="text-[11px] text-slate-400">Turn OFF anytime to instantly hide from players</span>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Game Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Ultra Panda 777"
                value={newGame.title}
                onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                required
                className="w-full bg-[#060817] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Provider / Studio
              </label>
              <input
                type="text"
                placeholder="e.g. Ultra Panda, Fire Kirin, Orion Stars"
                value={newGame.provider}
                onChange={(e) => setNewGame({ ...newGame, provider: e.target.value })}
                className="w-full bg-[#060817] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Badge System
              </label>
              <select
                value={newGame.badge}
                onChange={(e) => setNewGame({ ...newGame, badge: e.target.value })}
                className="w-full bg-[#060817] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400 transition font-bold"
              >
                <option value="HOT">🔥 HOT</option>
                <option value="NEW">✨ NEW</option>
                <option value="POPULAR">⭐ POPULAR</option>
                <option value="EXCLUSIVE">💎 EXCLUSIVE</option>
                <option value="">No Badge</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            {/* Image Upload */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Cover Image (Choose File)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#121638] border border-white/15 hover:border-amber-400 rounded-xl cursor-pointer text-xs font-bold text-amber-300 hover:text-white transition shadow-inner">
                  <Upload size={14} />
                  <span>Choose Cover Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGameImageFile(file, (dataUrl) => setNewGame({ ...newGame, thumbnail: dataUrl }));
                    }}
                    className="hidden"
                  />
                </label>
                {newGame.thumbnail && (
                  <div className="relative w-11 h-9 rounded-lg overflow-hidden border border-amber-400/40 bg-black/40 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newGame.thumbnail} alt="Cover Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Launch URL */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Launch URL (External Sweepstakes Link)
              </label>
              <input
                type="text"
                placeholder="https://... (Optional)"
                value={newGame.url}
                onChange={(e) => setNewGame({ ...newGame, url: e.target.value })}
                className="w-full bg-[#060817] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Status & Submit */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNewGame({ ...newGame, isActive: !newGame.isActive })}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                  newGame.isActive
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                }`}
              >
                <Power size={13} />
                <span>Status: {newGame.isActive ? 'ON (Active)' : 'OFF (Hidden)'}</span>
              </button>

              <button
                type="submit"
                disabled={isSavingGame}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg hover:brightness-110 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>{isSavingGame ? 'Saving...' : 'Add Game'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Catalog Table Card */}
      <div className="rounded-2xl bg-[var(--bg-surface)]/90 border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 bg-[#060817] border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-heading font-black text-white uppercase tracking-wider">All Catalog Games</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-slate-300">
              {filteredGames.length} games
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter games by title..."
              className="w-full bg-[var(--bg-surface)] border border-white/10 focus:border-amber-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060817] text-slate-400 uppercase border-b border-white/5 font-bold">
              <tr>
                <th className="p-3 w-16">Cover</th>
                <th className="p-3">Title &amp; Provider</th>
                <th className="p-3">Badge</th>
                <th className="p-3">Game Status</th>
                <th className="p-3">Launch Link</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredGames.map((g) => {
                const gameId = g.id || g._id;
                const isOnline = g.isActive !== false && g.active !== false;
                const badgeUpper = (g.badge || '').toUpperCase();

                return (
                  <tr key={gameId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-3">
                      <div className="relative w-12 h-9 rounded-lg overflow-hidden border border-white/10 bg-black/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={g.thumbnail || g.image || '/images/vegas-777.svg'}
                          alt={g.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white text-sm">{g.title}</div>
                      <div className="text-[11px] text-slate-400">{g.provider || 'Rich Room Studio'}</div>
                    </td>
                    <td className="p-3">
                      {badgeUpper === 'HOT' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          🔥 HOT
                        </span>
                      )}
                      {badgeUpper === 'NEW' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          ✨ NEW
                        </span>
                      )}
                      {badgeUpper === 'POPULAR' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          ⭐ POPULAR
                        </span>
                      )}
                      {badgeUpper === 'EXCLUSIVE' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-[var(--neon-cyan)] border border-amber-500/40">
                          💎 EXCLUSIVE
                        </span>
                      )}
                      {!['HOT', 'NEW', 'POPULAR', 'EXCLUSIVE'].includes(badgeUpper) && (
                        <span className="text-slate-500 text-xs font-semibold">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const nextStatus = !isOnline;
                          await onUpdateGame?.({ id: gameId, isActive: nextStatus });
                        }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-black flex items-center gap-2 border transition cursor-pointer ${
                          isOnline
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                        title="Click to toggle game ON / OFF"
                      >
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                        <span>{isOnline ? 'ON (Active)' : 'OFF (Hidden)'}</span>
                      </button>
                    </td>
                    <td className="p-3 text-slate-300 font-mono text-[11px]">
                      {g.playUrl || g.url ? (
                        <a
                          href={g.playUrl || g.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--neon-cyan)] hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[150px]">{g.playUrl || g.url}</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-slate-500">In-house</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingGame({
                              id: gameId,
                              title: g.title || '',
                              provider: g.provider || 'Rich Room Studio',
                              thumbnail: g.thumbnail || g.image || '/images/vegas-777.svg',
                              badge: g.badge || 'HOT',
                              url: g.playUrl || g.url || '',
                              isActive: isOnline,
                            })
                          }
                          className="p-2 rounded-lg bg-amber-500/10 text-[var(--neon-cyan)] hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
                          title="Edit Game"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${g.title} from catalog?`)) {
                              onDeleteGame?.(gameId);
                            }
                          }}
                          className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
                          title="Delete Game"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Game Modal */}
      {editingGame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f24] border border-amber-500/30 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-[var(--neon-cyan)]" />
                <h3 className="text-base font-black text-white">Edit Game: {editingGame.title}</h3>
              </div>
              <button
                onClick={() => setEditingGame(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Game Title *
                </label>
                <input
                  type="text"
                  value={editingGame.title}
                  onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                  required
                  className="w-full bg-[#060817] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Provider / Studio
                  </label>
                  <input
                    type="text"
                    value={editingGame.provider}
                    onChange={(e) => setEditingGame({ ...editingGame, provider: e.target.value })}
                    className="w-full bg-[#060817] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Badge
                  </label>
                  <select
                    value={editingGame.badge || ''}
                    onChange={(e) => setEditingGame({ ...editingGame, badge: e.target.value })}
                    className="w-full bg-[#060817] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400 transition font-bold"
                  >
                    <option value="HOT">🔥 HOT</option>
                    <option value="NEW">✨ NEW</option>
                    <option value="POPULAR">⭐ POPULAR</option>
                    <option value="EXCLUSIVE">💎 EXCLUSIVE</option>
                    <option value="">No Badge</option>
                  </select>
                </div>
              </div>

              {/* Image Choose / Upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Cover Image
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-11 rounded-lg overflow-hidden border border-amber-400/40 bg-black/40 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editingGame.thumbnail || '/images/vegas-777.svg'}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#121638] border border-white/15 hover:border-amber-400 rounded-xl cursor-pointer text-xs font-bold text-amber-300 hover:text-white transition">
                    <Upload size={14} />
                    <span>Upload New Cover Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGameImageFile(file, (dataUrl) => setEditingGame({ ...editingGame, thumbnail: dataUrl }));
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Launch URL */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Launch URL (Optional)
                </label>
                <input
                  type="text"
                  value={editingGame.url || ''}
                  onChange={(e) => setEditingGame({ ...editingGame, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-[#060817] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Status Toggle in Modal */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#060817] border border-white/10">
                <div>
                  <div className="text-xs font-bold text-white">Game Availability (ON / OFF)</div>
                  <div className="text-[11px] text-slate-400">When OFF, game is hidden completely from players</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGame({ ...editingGame, isActive: !editingGame.isActive })}
                  className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 border transition cursor-pointer ${
                    editingGame.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${editingGame.isActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span>{editingGame.isActive ? 'ON (Active)' : 'OFF (Hidden)'}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingGame(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGame}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:brightness-110 transition cursor-pointer"
                >
                  <Check size={14} />
                  <span>{isSavingGame ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
