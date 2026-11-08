'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, X, ExternalLink, Sparkles, ShieldCheck, MessageSquare } from 'lucide-react';
import { playTune, unlockAudioContext, updateFaviconBadge } from '@/lib/soundAlerts';
import { formatPlayerFacingCopy } from '@/lib/cashoutPolicy';
import {
  refreshPlayerNotifications,
  isPlayerSoundEnabled,
  tuneForNotification,
} from '@/lib/notificationsClient';

export default function PushNotificationManager() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeToast, setActiveToast] = useState(null);
  const [toastProgress, setToastProgress] = useState(100);
  const seenNotifIdsRef = useRef(new Set());
  const isInitialRef = useRef(true);
  const toastTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Helper to trigger native Chrome desktop & Android notification shade
  const triggerChromeDesktopNotification = async (item) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const title = item.title || '🎰 VIP Flash Coin Drop Activated!';
      const body =
        item.message ||
        '5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!';
      const url = item.url || '/';

      try {
        // Method 1: Use registered Service Worker (Mandatory for Android Chrome notification bar)
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
              await reg.showNotification(title, {
                body,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'pp-alert-' + (item.id || Date.now()),
                renotify: true,
                requireInteraction: true,
                vibrate: [300, 100, 300],
                data: { url, date: Date.now() },
                actions: [
                  { action: 'open', title: 'Claim / View' },
                  { action: 'dismiss', title: 'Dismiss' },
                ],
              });
              return;
            }
          } catch (swErr) {
            console.warn('SW showNotification notice:', swErr);
          }

          // Method 2: Send message to active service worker controller
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title,
              body,
              url,
            });
            return;
          }
        }

        // Method 3: Desktop browser standard Notification API fallback
        new Notification(title, {
          body,
          icon: '/logo.png',
          tag: 'pp-alert-' + (item.id || Date.now()),
        });
      } catch (err) {
        console.warn('Chrome notification dispatch error:', err);
      }
    }
  };

  // Helper to show In-App Pop-Up Toast
  const showInAppToast = (item) => {
    if (isPlayerSoundEnabled()) {
      try {
        unlockAudioContext();
        playTune(tuneForNotification(item?.type), 0.65);
      } catch {}
    }

    setActiveToast(item);
    setToastProgress(100);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const totalDuration = 7000;
    const intervalStep = 100;
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += intervalStep;
      const remainingPct = Math.max(0, 100 - (elapsed / totalDuration) * 100);
      setToastProgress(remainingPct);
      if (elapsed >= totalDuration) {
        clearInterval(progressIntervalRef.current);
      }
    }, intervalStep);

    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
    }, totalDuration);
  };

  // Combined dispatch for incoming notification
  const dispatchAlert = (item) => {
    triggerChromeDesktopNotification(item);
    showInAppToast(item);
  };

  // 1. Web-native notification handler (Pure Web App)
  useEffect(() => {
    // Pure web app mode - native capacitor disabled
  }, [router]);

  // 2. Browser Service Worker & Chrome Permission Setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    // Auto-request Chrome permission if not decided
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const askPermission = () => {
          Notification.requestPermission()
            .then((perm) => {
              if (perm === 'granted') {
                triggerChromeDesktopNotification({
                  title: '🔔 Notifications Enabled!',
                  message: 'You will now receive instant alerts for deposits, cashouts, and bonuses.',
                });
              }
            })
            .catch(() => {});
        };

        const timer = setTimeout(askPermission, 3000);
        window.addEventListener('click', askPermission, { once: true });
        return () => {
          clearTimeout(timer);
          window.removeEventListener('click', askPermission);
        };
      }
    }
  }, []);

  // 3. Real-time notification hub (deduped API + instant cross-tab sync)
  useEffect(() => {
    let isCancelled = false;
    if (pathname && pathname.startsWith('/admin')) return undefined;

    const processPayload = (payload) => {
      if (isCancelled || !payload?.notifications) return;
      const notifs = payload.notifications;
      const unreadCount = payload.unreadCount ?? notifs.filter((n) => !n.read).length;
      updateFaviconBadge(unreadCount);

      if (isInitialRef.current) {
        notifs.forEach((n) => {
          if (n?.id) seenNotifIdsRef.current.add(n.id);
        });
        isInitialRef.current = false;
        return;
      }

      const freshUnread = notifs.filter(
        (n) => n?.id && !n.read && !seenNotifIdsRef.current.has(n.id)
      );
      if (freshUnread.length === 0) return;

      freshUnread.forEach((n) => seenNotifIdsRef.current.add(n.id));
      dispatchAlert(freshUnread[0]);
    };

    const pull = async (force = false) => {
      if (document.hidden) return;
      const payload = await refreshPlayerNotifications({ force });
      processPayload(payload);
    };

    pull(true);

    const interval = setInterval(() => pull(false), 4500);

    const onSync = (e) => processPayload(e.detail);
    window.addEventListener('paradise-notifications-sync', onSync);

    let notifChan = null;
    try {
      notifChan = new BroadcastChannel('paradise_notifications_sync');
      notifChan.onmessage = (ev) => processPayload(ev.data);
    } catch {}

    const onUserOrBalance = () => pull(true);
    window.addEventListener('paradise-user-sync', onUserOrBalance);
    window.addEventListener('balanceUpdate', onUserOrBalance);
    const onFocus = () => pull(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) pull(true);
    });

    // Event listener for manual test or in-app triggers
    const handleCustomTrigger = (e) => {
      if (pathname && pathname.startsWith('/admin')) return;
      if (e.detail) dispatchAlert(e.detail);
    };

    window.addEventListener('paradise-show-notification', handleCustomTrigger);

    // Global developer / test shortcut
    if (typeof window !== 'undefined') {
      window.triggerTestPush = (customTitle, customMessage) => {
        dispatchAlert({
          title: customTitle || '🎰 VIP Flash Coin Drop Activated!',
          message:
            customMessage ||
            '5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!',
          url: '/deposit',
        });
      };
    }

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener('paradise-show-notification', handleCustomTrigger);
      window.removeEventListener('paradise-notifications-sync', onSync);
      window.removeEventListener('paradise-user-sync', onUserOrBalance);
      window.removeEventListener('balanceUpdate', onUserOrBalance);
      window.removeEventListener('focus', onFocus);
      if (notifChan) notifChan.close();
    };
  }, [pathname]);

  // 4. Auto-bind FCM push token to user account whenever user logs in or switches
  useEffect(() => {
    const handleUserSync = (e) => {
      const liveUser = e.detail;
      if (liveUser && (liveUser.userId || liveUser.email)) {
        try {
          const storedToken = typeof window !== 'undefined' ? localStorage.getItem('pp_fcm_device_token') : null;
          const storedDevId = typeof window !== 'undefined' ? localStorage.getItem('pp_device_fingerprint') : null;
          fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              userId: liveUser.userId || liveUser._id || liveUser.id,
              email: liveUser.email,
              username: liveUser.username,
              token: storedToken,
              fcmToken: storedToken,
              deviceId: storedDevId,
              role: liveUser.role || 'player',
            }),
          }).catch(() => {});
        } catch {}
      }
    };

    window.addEventListener('paradise-user-sync', handleUserSync);
    return () => window.removeEventListener('paradise-user-sync', handleUserSync);
  }, []);

  if (!activeToast || (pathname && pathname.startsWith('/admin'))) return null;

  const handleOpenAction = () => {
    setActiveToast(null);
    if (activeToast?.type === 'chat_message') {
      if (typeof window !== 'undefined' && window.openLiveChat) {
        window.openLiveChat();
        return;
      }
      router.push(activeToast.url || '/chat');
      return;
    }
    if (activeToast?.url && activeToast.url !== '/') {
      router.push(activeToast.url);
    } else {
      window.dispatchEvent(new CustomEvent('paradise-open-notifications'));
    }
  };

  return (
    <div
      role="alert"
      className="fixed top-4 right-4 z-[9999] max-w-sm w-full mx-auto p-4 rounded-2xl bg-[#090d1a]/95 backdrop-blur-2xl border border-cyan-400/50 shadow-[0_12px_40px_rgba(0,240,255,0.35)] animate-in slide-in-from-top duration-300 overflow-hidden"
      style={{
        boxShadow: '0 0 25px rgba(0, 240, 255, 0.25), inset 0 0 15px rgba(0, 240, 255, 0.1)',
      }}
    >
      {/* Top Banner Content */}
      <div className="flex items-start gap-3">
        {/* Glowing Icon */}
        <div className="relative shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]">
          {activeToast.type === 'chat_message' ? (
            <MessageSquare size={18} className="animate-bounce text-emerald-400" />
          ) : (
            <Bell size={18} className="animate-bounce" />
          )}
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400" />
        </div>

        {/* Message Text */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30">
              ALERT
            </span>
            <span className="text-[10px] text-slate-400">Just now</span>
          </div>

          <h4 className="text-xs font-heading font-black text-white truncate tracking-wide">
            {activeToast.title || '🎰 VIP Flash Coin Drop Activated!'}
          </h4>

          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
            {formatPlayerFacingCopy(activeToast.message)}
          </p>

          {/* Quick Action Button */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={handleOpenAction}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 text-black text-[11px] font-heading font-black hover:scale-102 active:scale-98 transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(0,240,255,0.4)]"
            >
              <span>{activeToast.type === 'chat_message' ? 'OPEN CHAT' : 'CLAIM / VIEW'}</span>
              <ExternalLink size={11} strokeWidth={3} />
            </button>

            <button
              onClick={() => setActiveToast(null)}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setActiveToast(null)}
          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Close alert"
        >
          <X size={15} />
        </button>
      </div>

      {/* Auto-Dismiss Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(0,240,255,0.7)]"
          style={{ width: `${toastProgress}%` }}
        />
      </div>
    </div>
  );
}
