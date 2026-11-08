'use client';

import React from 'react';
import Image from 'next/image';
import { defaultGameDescription } from '@/lib/gameDescriptions';
import {
  Play,
  KeyRound,
  Sparkles,
  Flame,
  Star,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function GameCard({
  game,
  onPlay,
  onRequestAccount,
  hasAccount = false,
  isPending = false,
  onViewCredentials = null,
}) {
  const description =
    (game.description && String(game.description).trim()) || defaultGameDescription(game);

  const imgSrc =
    game.thumbnail ||
    game.image ||
    game.imageUrl ||
    game.cover ||
    game.fallbackImage ||
    '/images/vegas-777.svg';

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/80 hover:border-[var(--neon-cyan)]/70 hover:shadow-[0_10px_30px_var(--neon-cyan-glow)] transition-all duration-300 flex flex-col">
      {/* Thumbnail Aspect Box */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950"
        style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={game.title}
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== '/images/vegas-777.svg') {
              e.currentTarget.src = '/images/vegas-777.svg';
            }
          }}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Gradient dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {game.badge ? (
            <span
              className="text-[10px] font-heading font-black px-2 py-0.5 rounded-md text-black"
              style={{ background: 'var(--primary-gradient)', boxShadow: '0 0 10px var(--neon-cyan-glow)' }}
            >
              {game.badge}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-slate-700 text-[10px] font-bold text-amber-400">
            <Star size={11} fill="currentColor" />
            <span>{game.rating || 4.9}</span>
          </div>
        </div>

        {/* In-House or Platform indicator */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="text-[10px] font-sub font-bold px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-slate-300 uppercase tracking-wider">
            {game.isInternal ? '⚡ IN-HOUSE PLAYABLE' : game.platform || 'EXTERNAL PLATFORM'}
          </span>
        </div>
      </div>

      {/* Card Info Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-slate-950/60">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-sm text-white group-hover:text-[var(--neon-cyan)] transition-colors truncate">
              {game.title}
            </h3>
            {game.rtp && (
              <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                {game.rtp}% RTP
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed min-h-[2.5rem]">
            {description}
          </p>
        </div>

        {/* Dual Actions */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/80">
          <button
            onClick={() => onPlay(game)}
            className="flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl text-black font-heading font-bold text-[10.5px] sm:text-xs hover:scale-102 transition-all cursor-pointer"
            style={{
              background: 'var(--primary-gradient)',
              boxShadow: '0 0 12px var(--neon-cyan-glow)',
            }}
          >
            <Play size={12} fill="currentColor" className="shrink-0" />
            <span className="truncate">PLAY NOW</span>
          </button>

          {hasAccount ? (
            <button
              onClick={() => (onViewCredentials ? onViewCredentials(game) : onPlay(game))}
              title="Credentials already created. Click to view credentials."
              className="flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/60 hover:border-emerald-400 text-emerald-300 font-heading font-bold text-[10.5px] sm:text-xs transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)]"
            >
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">ID READY</span>
            </button>
          ) : isPending ? (
            <button
              disabled
              title="ID request submitted to admin desk. Waiting for approval."
              className="flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300/90 font-heading font-bold text-[10.5px] sm:text-xs cursor-not-allowed opacity-85"
            >
              <Clock size={12} className="text-amber-400 animate-spin shrink-0" />
              <span className="truncate">PENDING</span>
            </button>
          ) : (
            <button
              onClick={() => onRequestAccount(game)}
              className="flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-heading font-bold text-[10.5px] sm:text-xs transition-colors"
            >
              <KeyRound size={12} className="text-amber-400 shrink-0" />
              <span className="truncate">GET ID</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
