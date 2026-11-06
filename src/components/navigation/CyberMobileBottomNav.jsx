'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Gamepad2,
  Trophy,
  KeyRound,
  Wallet,
  User,
  Sparkles
} from 'lucide-react';

export default function CyberMobileBottomNav({
  user,
  onOpenAuth,
  onOpenWallet,
  onOpenGameRequest,
}) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    {
      id: 'lobby',
      label: 'Lobby',
      icon: Gamepad2,
      action: () => router.push('/'),
      isActive: pathname === '/',
    },
    {
      id: 'games',
      label: 'Games',
      icon: Trophy,
      action: () => router.push('/games'),
      isActive: pathname === '/games',
    },
    {
      id: 'ids',
      label: 'Game IDs',
      icon: KeyRound,
      action: () => router.push('/my-game-ids'),
      highlight: true,
      isActive: pathname === '/my-game-ids',
    },
    {
      id: 'deposit',
      label: 'Deposit',
      icon: Wallet,
      action: () => router.push('/deposit'),
      isActive: pathname === '/deposit',
    },
    {
      id: 'promos',
      label: 'Promos',
      icon: Sparkles,
      action: () => router.push('/promotions'),
      isActive: pathname === '/promotions',
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[var(--bg-deep)]/95 backdrop-blur-xl border-t border-[var(--chrome-border)]/60 px-2 pt-1.5 flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.6)]"
      style={{ paddingBottom: 'max(14px, calc(env(safe-area-inset-bottom, 0px) + 8px))' }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive;

        if (tab.highlight) {
          return (
            <button
              key={tab.id}
              onClick={tab.action}
              className="relative -top-1 flex flex-col items-center justify-center min-w-0 max-w-[22%]"
            >
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl p-[2px] shrink-0"
                style={{
                  background: 'var(--primary-gradient)',
                  boxShadow: '0 0 16px var(--neon-cyan-glow)',
                }}
              >
                <div className="w-full h-full bg-[var(--bg-surface)] rounded-[13px] flex items-center justify-center text-[var(--neon-cyan)]">
                  <Icon size={20} className="shrink-0" />
                </div>
              </div>
              <span className="text-[9px] font-heading font-bold text-[var(--neon-cyan)] mt-0.5 truncate max-w-full px-0.5">
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={tab.action}
            className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all relative min-w-0 max-w-[18%] ${
              active
                ? 'text-[var(--neon-cyan)] font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon size={20} />
              {active && (
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)]"
                  style={{ boxShadow: '0 0 8px var(--neon-cyan)' }}
                ></span>
              )}
            </div>
            <span className="text-[9px] mt-1 tracking-tight font-sub font-semibold truncate max-w-full">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
