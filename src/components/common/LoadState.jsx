'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

export function LoadingInline({ label = 'Loading data…', className = '' }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 py-8 text-slate-400 text-xs font-bold uppercase tracking-wide ${className}`}
    >
      <RefreshCw size={16} className="animate-spin text-[var(--neon-cyan)]" />
      <span>{label}</span>
    </div>
  );
}

export function CardSkeletonGrid({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`skel-card-${i}`}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3 animate-pulse min-h-[100px]"
        >
          <div className="h-4 bg-slate-700/60 rounded w-2/3" />
          <div className="h-3 bg-slate-800/80 rounded w-1/2" />
          <div className="h-10 bg-slate-800/60 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeletonRow({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`skel-stat-${i}`} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 animate-pulse space-y-2">
          <div className="h-2 w-20 bg-slate-700 rounded" />
          <div className="h-7 w-16 bg-slate-600 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="rounded-2xl border border-slate-800 overflow-hidden animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`skel-row-${i}`} className="h-12 border-b border-slate-800/80 bg-slate-900/40 flex items-center px-4 gap-4">
          <div className="h-3 flex-1 bg-slate-700/50 rounded" />
          <div className="h-3 w-20 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}

export function PanelBootState({ loading, hasData, loadingLabel, children, skeleton }) {
  if (loading && !hasData) {
    return skeleton || <LoadingInline label={loadingLabel} />;
  }
  return children;
}
