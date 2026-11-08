'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Gamepad2,
  Trophy,
  KeyRound,
  Wallet,
  Receipt,
  Gift,
  Download,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Crown,
  Users,
  Headphones,
  Loader2
} from 'lucide-react';

export default function CyberSidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  user,
  activeTab,
  onSelectTab,
  onOpenWallet,
  onOpenGameRequest,
  onOpenChat,
  onOpenDailyBonus,
  onOpenSpinWheel,
  onOpenAuth,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navigatingPath, setNavigatingPath] = useState(null);

  // Clear navigating state whenever the route changes
  useEffect(() => {
    setNavigatingPath(null);
  }, [pathname, activeTab]);

  const navItems = [
    { id: 'lobby', label: 'Game Lobby', path: '/', icon: Gamepad2, badge: 'HOT' },
    { id: 'games', label: 'All Games', path: '/games', icon: Trophy },
    { id: 'my-game-ids', label: 'My Game IDs', path: '/my-game-ids', icon: KeyRound },
    { id: 'deposit', label: 'Deposit Funds', path: '/deposit', icon: Wallet },
    { id: 'withdraw', label: 'Redeem Cashout', path: '/withdraw', icon: Receipt },
    { id: 'spin-wheel', label: 'Daily Spin', path: '/spin-wheel', icon: Gift, glow: true },
    { id: 'referral', label: 'Refer & Earn', path: '/referral', icon: Users, badge: 'REWARDS', glow: true },
    { id: 'chat', label: '24/7 Live Support', path: '/chat', icon: Headphones, badge: 'ONLINE', glow: true, isChatModal: true },
    { id: 'promotions', label: 'Promotions & VIP', path: '/promotions', icon: Crown },
    { id: 'download-app', label: 'Download App', path: '/download-app', icon: Download, badge: 'APK / iOS' },
    { id: 'how-to-play', label: 'How To Play', path: '/how-to-play', icon: HelpCircle },
  ];

  const handleItemClick = (e, item) => {
    // Safely close mobile drawer
    if (typeof setMobileOpen === 'function') {
      try {
        setMobileOpen(false);
      } catch {}
    }

    // 1. Live Support: Just open the Live Chat modal directly without navigating away
    if (item.path === '/chat' || item.isChatModal) {
      e?.preventDefault?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-live-chat'));
        if (typeof window.openLiveChat === 'function') {
          try { window.openLiveChat(); } catch {}
        }
      }
      if (typeof onOpenChat === 'function') {
        try { onOpenChat(); } catch {}
      }
      return;
    }

    // 2. Instant 0ms SPA tab switching if onSelectTab is provided
    if (typeof onSelectTab === 'function') {
      e?.preventDefault?.();
      const tabId = item.id || (item.path === '/' ? 'lobby' : item.path.replace(/^\//, ''));
      onSelectTab(tabId, item.path);
      return;
    }

    // 3. If clicking current page, smoothly scroll to top
    if (item.path && pathname === item.path) {
      e?.preventDefault?.();
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // 4. Instant optimistic navigation feedback
    if (item.path) {
      setNavigatingPath(item.path);
      // Ensure router navigates even if Link click event was intercepted
      router.push(item.path);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => {
            if (typeof setMobileOpen === 'function') setMobileOpen(false);
          }}
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
        {/* Top glowing cyber progress line during navigation */}
        {navigatingPath && (
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[var(--neon-cyan)] via-[var(--neon-purple)] to-[var(--neon-cyan)] animate-pulse z-50 shadow-[0_0_12px_var(--neon-cyan)]" />
        )}

        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--chrome-border)]/60">
          <Link
            href="/"
            prefetch={true}
            onClick={(e) => handleItemClick(e, { path: '/' })}
            className="flex items-center gap-3 cursor-pointer overflow-hidden no-underline text-inherit group"
          >
            <div
              className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden border-2 border-[var(--neon-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.5)] group-hover:scale-105 transition-transform"
              style={{ position: 'relative', width: '44px', height: '44px', minWidth: '44px', flexShrink: 0 }}
            >
              <Image
                src="/logo.png"
                alt="Players Paradise Hub"
                fill
                className="object-cover"
                priority
              />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col">
                <span className="font-heading font-black text-sm tracking-wider leading-tight text-white group-hover:text-[var(--neon-cyan)] transition-colors">
                  PLAYERS<span className="text-[var(--neon-cyan)]">PARADISE</span>
                </span>
                <span className="text-[10px] tracking-widest text-slate-400 font-sub font-semibold">
                  CYBER GAMING HUB
                </span>
              </div>
            )}
          </Link>

          {/* Desktop collapse button */}
          <button
            onClick={() => {
              if (typeof setCollapsed === 'function') setCollapsed(!collapsed);
            }}
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
            const currentTab = activeTab || (pathname === '/' ? 'lobby' : pathname.replace(/^\//, ''));
            const isActive = !item.isChatModal && (
              activeTab
                ? (item.id === currentTab || item.path === `/${currentTab}` || (item.id === 'lobby' && (currentTab === 'lobby' || currentTab === '')))
                : (navigatingPath ? navigatingPath === item.path : pathname === item.path)
            );
            const isNavigating = navigatingPath === item.path;

            const content = (
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative cursor-pointer select-none active:scale-[0.98] ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--neon-cyan)]/25 to-[var(--neon-purple)]/25 text-white border border-[var(--neon-cyan)] shadow-[0_0_18px_rgba(0,240,255,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/70'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    isActive
                      ? 'bg-[var(--neon-cyan)] text-black shadow-[0_0_10px_rgba(0,240,255,0.5)]'
                      : 'bg-slate-900/80 text-slate-400 group-hover:text-[var(--neon-cyan)] group-hover:bg-slate-800'
                  }`}
                >
                  {isNavigating ? (
                    <Loader2 size={18} className="animate-spin text-black" />
                  ) : (
                    <Icon size={18} />
                  )}
                </div>

                {(!collapsed || mobileOpen) && (
                  <div className="flex items-center justify-between flex-1 overflow-hidden">
                    <span className={`truncate ${isActive ? 'font-bold text-white' : ''}`}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-[var(--neon-cyan)] text-black'
                          : 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/40'
                      }`}>
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

            return (
              <Link
                key={idx}
                href={item.path}
                prefetch={false}
                onClick={(e) => handleItemClick(e, item)}
                className="block no-underline text-inherit focus:outline-none"
              >
                {content}
              </Link>
            );
          })}
        </div>

        {/* Footer Quick Action */}
        {(!collapsed || mobileOpen) ? (
          <div className="p-3 border-t border-[var(--chrome-border)]/60 bg-slate-950/40 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/deposit"
                prefetch={false}
                onClick={(e) => handleItemClick(e, { id: 'deposit', path: '/deposit' })}
                className="cyber-btn-cyan text-[11px] py-2 font-bold flex items-center justify-center gap-1 no-underline text-center active:scale-95 transition-transform"
              >
                <Wallet size={13} />
                <span>DEPOSIT</span>
              </Link>
              <Link
                href="/withdraw"
                prefetch={false}
                onClick={(e) => handleItemClick(e, { id: 'withdraw', path: '/withdraw' })}
                className="rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-[11px] py-2 font-bold flex items-center justify-center gap-1 transition-all no-underline text-center active:scale-95"
              >
                <span>REDEEM</span>
              </Link>
            </div>
            <div className="text-[10px] text-center text-slate-500 font-mono">
              PLAYERS PARADISE v1.0 • 2026
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-[var(--chrome-border)]/60 flex justify-center">
            <Link
              href="/deposit"
              prefetch={false}
              onClick={(e) => handleItemClick(e, { id: 'deposit', path: '/deposit' })}
              className="w-10 h-10 rounded-xl bg-[var(--neon-cyan)] text-black flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:scale-105 transition-transform no-underline"
              title="Deposit Credits"
            >
              <Wallet size={18} />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
