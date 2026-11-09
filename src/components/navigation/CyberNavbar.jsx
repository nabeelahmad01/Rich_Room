'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Wallet,
  Gift,
  Bell,
  Volume2,
  VolumeX,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  KeyRound,
  ArrowUpRight,
  Plus,
  Headphones
} from 'lucide-react';
import NotificationsModal from '@/components/modals/NotificationsModal';
import { areEqual } from '@/lib/fastDiff';
import { fetchCurrentUser, getCachedUser } from '@/lib/authClient';
import { refreshPlayerNotifications } from '@/lib/notificationsClient';
import { updateFaviconBadge } from '@/lib/soundAlerts';

export default function CyberNavbar({
  onToggleSidebar,
  user,
  onOpenAuth,
  onOpenWallet,
  onOpenDailyBonus,
  onOpenSpinWheel,
  onOpenNotifications,
  onLogout,
  unreadNotifsCount = 0,
  onSelectTab,
}) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [jackpot, setJackpot] = useState(184920.45);
  const [liveUser, setLiveUser] = useState(user || null);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadNotifsCount);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [balancePulse, setBalancePulse] = useState(false);
  const lastBalanceRef = useRef(user ? (user.balance ?? user.balanceSC ?? 0) : null);
  const lastSyncedUserRef = useRef(user || null);
  const profileRef = useRef(null);
  const notificationsOpenRef = useRef(false);

  const handleAuthClick = (mode = 'login') => {
    if (typeof onOpenAuth === 'function') {
      onOpenAuth(mode);
    } else {
      router.push(`/${mode}`);
    }
  };

  const handleWalletClick = (tab = 'deposit') => {
    const isRedeem = tab === 'withdraw' || tab === 'redeem' || tab === 'cashout';
    const tabId = isRedeem ? 'withdraw' : 'deposit';
    const targetPath = isRedeem ? '/withdraw' : '/deposit';

    if (typeof onSelectTab === 'function') {
      onSelectTab(tabId, targetPath);
      return;
    }
    if (typeof onOpenWallet === 'function') {
      onOpenWallet(tabId);
      return;
    }
    router.push(targetPath);
  };

  useEffect(() => {
    notificationsOpenRef.current = notificationsOpen;
  }, [notificationsOpen]);

  useEffect(() => {
    try {
      setSoundEnabled(localStorage.getItem('pp_sound_enabled') !== 'false');
    } catch {}
    const onSound = (e) => {
      if (typeof e.detail === 'boolean') setSoundEnabled(e.detail);
    };
    window.addEventListener('paradise-sound-toggle', onSound);
    return () => window.removeEventListener('paradise-sound-toggle', onSound);
  }, []);

  useEffect(() => {
    const onNotifSync = (e) => {
      const unread = e.detail?.unreadCount ?? 0;
      if (!notificationsOpenRef.current) {
        setLiveUnreadCount(unread);
      }
      updateFaviconBadge(unread);
    };
    window.addEventListener('paradise-notifications-sync', onNotifSync);
    return () => window.removeEventListener('paradise-notifications-sync', onNotifSync);
  }, []);

  useEffect(() => {
    const onChatUnread = (e) => setChatUnreadCount(e.detail?.count ?? 0);
    window.addEventListener('paradise-chat-unread', onChatUnread);
    return () => window.removeEventListener('paradise-chat-unread', onChatUnread);
  }, []);

  const handleAllRead = useCallback(() => {
    setLiveUnreadCount(0);
  }, []);

  // Handle opening notifications modal & immediately clearing badge
  const handleOpenNotifications = () => {
    setNotificationsOpen(true);
    setLiveUnreadCount(0);
    const active = liveUser || user;
    if (active?.email || active?.userId) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAll: true,
          email: active?.email || '',
          userId: active?.userId || active?._id || '',
        }),
      }).catch(() => {});
    }
    if (onOpenNotifications) {
      onOpenNotifications();
    }
  };

  // Global event listener to open notifications from any component
  useEffect(() => {
    const handleOpenNotifsEvent = () => {
      setNotificationsOpen(true);
      setLiveUnreadCount(0);
    };
    window.addEventListener('paradise-open-notifications', handleOpenNotifsEvent);
    return () => window.removeEventListener('paradise-open-notifications', handleOpenNotifsEvent);
  }, []);

  // Keep liveUser aligned when prop changes or hydrate from cache on mount
  useEffect(() => {
    if (user) {
      setLiveUser(user);
      lastBalanceRef.current = Number(user.balance ?? user.balanceSC ?? 0);
    } else {
      const cached = getCachedUser();
      if (cached) {
        setLiveUser(cached);
        lastBalanceRef.current = Number(cached.balance ?? cached.balanceSC ?? 0);
      } else {
        setLiveUser(null);
        lastBalanceRef.current = null;
      }
    }
  }, [user]);

  // Listen to global paradise-user-sync event from anywhere in the app
  useEffect(() => {
    const handleSync = (e) => {
      setLiveUser(e.detail || null);
      if (!e.detail) {
        setLiveUnreadCount(0);
      }
    };
    window.addEventListener('paradise-user-sync', handleSync);
    return () => window.removeEventListener('paradise-user-sync', handleSync);
  }, []);

  // Progressive jackpot ticker simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setJackpot((prev) => prev + (Math.random() * 0.45 + 0.05));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Real-time auto-sync for user balance and notifications (Zero Page Refresh)
  useEffect(() => {
    let isCancelled = false;

    const syncUserData = async () => {
      if (document.hidden) return; // Save VPS CPU when tab is hidden
      try {
        const data = await fetchCurrentUser();
        if (isCancelled) return;

        if (data?.authenticated && data?.user) {
          const currentBal = Number(data.user.balance ?? data.user.balanceSC ?? 0);
          if (lastBalanceRef.current !== null && Math.abs(lastBalanceRef.current - currentBal) > 0.001) {
            setBalancePulse(true);
            setTimeout(() => setBalancePulse(false), 2200);
          }
          lastBalanceRef.current = currentBal;

          if (!areEqual(lastSyncedUserRef.current, data.user)) {
            lastSyncedUserRef.current = data.user;
            setLiveUser(data.user);
            if (typeof window !== 'undefined') {
              if (data.user.email) {
                localStorage.setItem('pp_user_email', data.user.email);
              }
              // Defer event via queueMicrotask so it runs after render finishes (prevents "Cannot update a component while rendering a different component")
              queueMicrotask(() => {
                window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: data.user }));
              });
            }
          }

          if (data.user.email) {
            refreshPlayerNotifications().catch(() => {});
          }
        } else {
          setLiveUser(null);
          setLiveUnreadCount(0);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pp_user_email');
          }
        }
      } catch {
        // silent fail
      }
    };

    // Initial silent check
    syncUserData();

    // 10-second polling loop with instant event triggers
    const syncInterval = setInterval(syncUserData, 10000);

    // Event-based triggers: tab focus, visibility change, and custom in-app balance events
    const handleFocus = () => syncUserData();
    const handleVisibility = () => {
      if (!document.hidden) syncUserData();
    };
    const handleCustomEvent = () => syncUserData();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('balanceUpdate', handleCustomEvent);
    let balanceChan = null;
    try {
      balanceChan = new BroadcastChannel('paradise_balance_sync');
      balanceChan.onmessage = () => syncUserData();
    } catch {}
    window.addEventListener('storage', (e) => {
      if (e.key === 'paradise_user_balance_sync') syncUserData();
    });
    window.addEventListener('refreshUser', handleCustomEvent);

    return () => {
      isCancelled = true;
      clearInterval(syncInterval);
      if (balanceChan) balanceChan.close();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('balanceUpdate', handleCustomEvent);
      window.removeEventListener('refreshUser', handleCustomEvent);
    };
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeUser = liveUser || user;

  return (
    <>
      <header
      className="sticky top-0 z-30 w-full border-b border-[var(--chrome-border)]/60 bg-[var(--bg-deep)]/90 backdrop-blur-xl px-4 flex items-center justify-between gap-3"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        minHeight: 'calc(4rem + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* Left side: Hamburger toggle & brand emblem on mobile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)] transition-colors lg:hidden shrink-0"
        >
          <Menu size={20} />
        </button>

        <div
          onClick={() => {
            if (typeof onSelectTab === 'function') {
              onSelectTab('lobby', '/');
            } else {
              router.push('/');
            }
          }}
          className="flex items-center gap-2 cursor-pointer lg:hidden shrink-0"
        >
          <div
            className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--neon-cyan)] shrink-0"
            style={{ position: 'relative', width: '32px', height: '32px', minWidth: '32px', flexShrink: 0 }}
          >
            <Image src="/logo.png" alt="Logo" fill className="object-cover" />
          </div>
          <span className="font-heading font-black text-xs tracking-wider text-white hidden sm:inline">
            RICH<span className="text-[var(--neon-cyan)]">ROOM</span>
          </span>
        </div>

        {/* Global Progressive Cyber Jackpot (Wide Desktop Only) */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
          <span className="text-[10px] font-heading font-bold text-amber-400 tracking-wider">
            JACKPOT:
          </span>
          <span className="font-mono font-bold text-xs text-white tracking-wider">
            ${jackpot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Right side: Balances & User Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {activeUser ? (
          <>
            {/* Live Single Wallet Balance Chip */}
            <Link
              href="/deposit"
              onClick={(e) => {
                if (typeof onSelectTab === 'function' || typeof onOpenWallet === 'function') {
                  e.preventDefault();
                  handleWalletClick('deposit');
                }
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 border transition-all duration-300 shrink-0 ${
                balancePulse
                  ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_18px_rgba(16,185,129,0.5)] scale-105'
                  : 'border-emerald-500/40 hover:border-emerald-400 shadow-inner group'
              }`}
              title="Player Wallet Balance (Click to Deposit)"
            >
              <span className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors ${
                balancePulse ? 'bg-emerald-300 text-black' : 'bg-emerald-500 text-black'
              }`}>
                BAL
              </span>
              <span className={`font-mono font-bold text-xs sm:text-sm transition-colors ${
                balancePulse ? 'text-white' : 'text-emerald-400 group-hover:text-emerald-300'
              }`}>
                ${Number(activeUser.balance ?? activeUser.balanceSC ?? 0).toFixed(2)}
              </span>
            </Link>

            {/* Deposit Direct Action */}
            <Link
              href="/deposit"
              onClick={(e) => {
                if (typeof onSelectTab === 'function' || typeof onOpenWallet === 'function') {
                  e.preventDefault();
                  handleWalletClick('deposit');
                }
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black text-xs font-heading font-black shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:scale-102 active:scale-98 transition-all shrink-0"
              title="Deposit Funds"
            >
              <Plus size={14} strokeWidth={3} />
              <span className="hidden sm:inline">DEPOSIT</span>
            </Link>

            {/* Redeem Cashout Direct Action (Wide screen only, also in sidebar & profile) */}
            <Link
              href="/withdraw"
              onClick={(e) => {
                if (typeof onSelectTab === 'function' || typeof onOpenWallet === 'function') {
                  e.preventDefault();
                  handleWalletClick('withdraw');
                }
              }}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors shrink-0"
              title="Redeem Winnings"
            >
              <ArrowUpRight size={14} className="text-[var(--neon-cyan)]" />
              <span>Redeem</span>
            </Link>

            {/* Daily Lucky Spin Wheel Button */}
            {(onOpenSpinWheel || onSelectTab) && (
              <button
                type="button"
                onClick={() => {
                  if (typeof onSelectTab === 'function') {
                    onSelectTab('spin-wheel', '/spin-wheel');
                  } else if (typeof onOpenSpinWheel === 'function') {
                    onOpenSpinWheel();
                  }
                }}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0"
                title="Daily Free Spin Wheel (Win up to $50)"
              >
                <Gift size={14} className="text-amber-400 animate-bounce" />
                <span className="hidden 2xl:inline">Daily Spin</span>
              </button>
            )}
          </>
        ) : (
          /* Guest Actions */
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => handleAuthClick('login')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-all shrink-0 cursor-pointer"
            >
              LOG IN
            </button>
            <button
              onClick={() => handleAuthClick('register')}
              className="cyber-btn-cyan text-xs py-1.5 px-3 sm:px-3.5 font-bold shrink-0 cursor-pointer"
            >
              <Sparkles size={13} />
              <span>PLAY NOW</span>
            </button>
          </div>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          onClick={handleOpenNotifications}
          className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/80 border border-slate-700/70 text-slate-300 hover:text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)] hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
          title="Notifications"
        >
          <Bell size={16} />
          {liveUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse">
              {liveUnreadCount}
            </span>
          )}
        </button>

        {/* 24/7 Live Support Concierge Header Button */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-live-chat'));
              if (typeof window.openLiveChat === 'function') window.openLiveChat();
            }
          }}
          className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 via-purple-600/20 to-pink-500/20 border border-cyan-400/40 text-cyan-300 hover:text-white hover:border-cyan-300 hover:scale-105 transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0 cursor-pointer"
          title="24/7 Live Support Concierge"
        >
          <Headphones size={16} />
          {chatUnreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center border border-[var(--bg-deep)]">
              {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
            </span>
          ) : (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        {/* Sound toggle (Desktop) */}
        <button
          type="button"
          onClick={() => {
            setSoundEnabled((prev) => {
              const next = !prev;
              try {
                localStorage.setItem('pp_sound_enabled', next ? 'true' : 'false');
              } catch {}
              window.dispatchEvent(new CustomEvent('paradise-sound-toggle', { detail: next }));
              return next;
            });
          }}
          className="hidden xl:flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/80 border border-slate-700/70 text-slate-400 hover:text-white transition-colors shrink-0"
          title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* User Profile Menu */}
        {activeUser && (
          <div className="relative shrink-0" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-[var(--neon-cyan)] transition-all shrink-0"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] flex items-center justify-center text-black font-bold text-xs uppercase shadow-sm">
                {activeUser.username ? activeUser.username.charAt(0) : 'P'}
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--bg-deep)] border border-[var(--chrome-border)] shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="font-heading font-bold text-sm text-white truncate">
                    {activeUser.username}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{activeUser.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30">
                      {activeUser.vipTier || 'Bronze Panda'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      KYC: {activeUser.kycStatus?.toUpperCase() || 'UNVERIFIED'}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <div
                    onClick={() => {
                      handleWalletClick('deposit');
                      setProfileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80 rounded-xl cursor-pointer"
                  >
                    <Wallet size={15} className="text-emerald-400" />
                    <span>Wallet & Cashier</span>
                  </div>

                  <div
                    onClick={() => {
                      if (typeof onSelectTab === 'function') {
                        onSelectTab('promotions', '/promotions');
                      } else {
                        router.push('/promotions');
                      }
                      setProfileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80 rounded-xl cursor-pointer"
                  >
                    <Sparkles size={15} className="text-amber-400" />
                    <span>VIP & Rewards</span>
                  </div>

                  <div
                    onClick={() => {
                      setProfileOpen(false);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('open-live-chat'));
                        if (typeof window.openLiveChat === 'function') window.openLiveChat();
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-950/40 rounded-xl cursor-pointer font-bold"
                  >
                    <Headphones size={15} className="text-cyan-400" />
                    <span>24/7 Live Support</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-800">
                  <div
                    onClick={async () => {
                      setProfileOpen(false);
                      setLiveUser(null);
                      lastSyncedUserRef.current = null;
                      try {
                        const { broadcastPlayerLogout } = await import('@/lib/playerSessionCache');
                        broadcastPlayerLogout();
                      } catch {}
                      try {
                        await fetch('/api/auth/logout', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({}),
                        });
                        if (typeof onLogout === 'function') {
                          await onLogout();
                        }
                      } catch (err) {
                        console.error('Logout error:', err);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/30 rounded-xl cursor-pointer font-semibold"
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>

    {/* Global Player Notifications Modal */}
    <NotificationsModal
      isOpen={notificationsOpen}
      onClose={() => setNotificationsOpen(false)}
      user={activeUser}
      onAllRead={handleAllRead}
    />
  </>
  );
}
