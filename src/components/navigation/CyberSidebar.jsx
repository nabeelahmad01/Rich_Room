'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Gamepad2,
  Trophy,
  KeyRound,
  Wallet,
  Receipt,
  Download,
  MessageSquare,
  ShieldCheck,
  HelpCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Crown,
  Users,
  Headphones
} from 'lucide-react';

export default function CyberSidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  user,
  onOpenWallet,
  onOpenGameRequest,
  onOpenChat,
  onOpenDailyBonus,
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: 'Game Lobby', path: '/', icon: Gamepad2, badge: 'HOT' },
    { label: 'All Games', path: '/games', icon: Trophy },
    { label: 'My Game IDs', path: '/my-game-ids', icon: KeyRound, highlight: true },
    { label: 'Deposit Funds', path: '/deposit', icon: Wallet },
    { label: 'Redeem Cashout', path: '/withdraw', icon: Receipt },
    { label: 'Refer & Earn', path: '/referral', icon: Users, badge: 'REWARDS', glow: true },
    {
      label: '24/7 Live Support',
      path: '/chat',
      icon: Headphones,
      badge: 'ONLINE',
      glow: true,
      action: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-live-chat'));
          if (typeof window.openLiveChat === 'function') window.openLiveChat();
        }
        if (onOpenChat) onOpenChat();
      },
    },
    { label: 'Promotions & VIP', path: '/promotions', icon: Crown },
    { label: 'How To Play', path: '/how-to-play', icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r border-[var(--chrome-border)] bg-[var(--bg-deep)]/95 backdrop-blur-xl ${
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        }}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--chrome-border)]/60">
          <div
            onClick={() => {
              router.push('/');
              setMobileOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            <div
              className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden border-2 border-[var(--neon-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.5)]"
              style={{ position: 'relative', width: '44px', height: '44px', minWidth: '44px', flexShrink: 0 }}
            >
              <Image
                src="/logo.png"
                alt="Rich Room"
                fill
                className="object-cover"
                priority
              />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col">
                <span className="font-heading font-black text-sm tracking-wider leading-tight text-white">
                  RICH<span className="text-[var(--neon-cyan)]">ROOM</span>
                </span>
                <span className="text-[10px] tracking-widest text-slate-400 font-sub font-semibold">
                  VIP GAMING LOUNGE
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-400 hover:text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)] transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Online Status Pill */}
        {(!collapsed || mobileOpen) && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-slate-300 font-mono text-[11px]">1,842 PLAYERS</span>
              </div>
              <span className="text-[10px] font-bold text-[var(--neon-cyan)]">ONLINE</span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.path ? pathname === item.path : false;

            const content = (
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--neon-cyan)]/20 to-[var(--neon-purple)]/20 text-white border border-[var(--neon-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                    : item.highlight
                    ? 'bg-[var(--neon-purple)]/15 text-[var(--neon-purple-light)] border border-[var(--neon-purple)]/40 hover:bg-[var(--neon-purple)]/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[var(--neon-cyan)] text-black'
                      : item.highlight
                      ? 'bg-[var(--neon-purple)]/30 text-[var(--neon-purple-light)]'
                      : 'bg-slate-900/80 text-slate-400 group-hover:text-[var(--neon-cyan)]'
                  }`}
                >
                  <Icon size={18} />
                </div>

                {(!collapsed || mobileOpen) && (
                  <div className="flex items-center justify-between flex-1 overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/40">
                        {item.badge}
                      </span>
                    )}
                    {item.glow && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        FREE
                      </span>
                    )}
                  </div>
                )}
              </div>
            );

            if (item.action) {
              return (
                <div
                  key={idx}
                  onClick={() => {
                    item.action();
                    setMobileOpen(false);
                  }}
                >
                  {content}
                </div>
              );
            }

            return (
              <div
                key={idx}
                onClick={() => {
                  router.push(item.path);
                  setMobileOpen(false);
                }}
              >
                {content}
              </div>
            );
          })}
        </div>

        {/* Footer Quick Action */}
        {(!collapsed || mobileOpen) ? (
          <div className="p-3 border-t border-[var(--chrome-border)]/60 bg-slate-950/40 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  router.push('/deposit');
                  setMobileOpen(false);
                }}
                className="cyber-btn-cyan text-[11px] py-2 font-bold flex items-center justify-center gap-1"
              >
                <Wallet size={13} />
                <span>DEPOSIT</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push('/withdraw');
                  setMobileOpen(false);
                }}
                className="rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-[11px] py-2 font-bold flex items-center justify-center gap-1 transition-all"
              >
                <span>REDEEM</span>
              </button>
            </div>
            <div className="text-[10px] text-center text-slate-500 font-mono">
              RICH ROOM VIP LOUNGE • 2026
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-[var(--chrome-border)]/60 flex justify-center">
            <button
              onClick={() => router.push('/deposit')}
              className="w-10 h-10 rounded-xl text-black flex items-center justify-center hover:scale-105 transition-transform"
              style={{
                background: 'var(--primary-gradient)',
                boxShadow: '0 0 15px var(--neon-cyan-glow)',
              }}
              title="Deposit Credits"
            >
              <Wallet size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
