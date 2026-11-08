'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Bell,
  CheckCheck,
  Clock,
  Sparkles,
  MessageSquare,
  Wallet,
  Gamepad2,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { diffSet } from '@/lib/fastDiff';
import { formatPlayerFacingCopy } from '@/lib/cashoutPolicy';

export default function NotificationsModal({ isOpen, onClose, user, onAllRead }) {
  const router = useRouter();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const onAllReadRef = useRef(onAllRead);
  onAllReadRef.current = onAllRead;

  // Fetch notifications for the current player
  const fetchNotifs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const email = user?.email ? encodeURIComponent(user.email) : '';
      const url = email ? `/api/notifications?email=${email}` : '/api/notifications';
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        diffSet(setNotifs, data.notifications);
      } else if (!isSilent) {
        diffSet(setNotifs, []);
      }
    } catch {
      // silent fail
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [user?.email, user?.userId, user?._id]);

  // Mark all notifications as read in DB and sync state
  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          markAll: true,
          email: user?.email || '',
          userId: user?.userId || user?._id || '',
        }),
      });
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      if (onAllReadRef.current) onAllReadRef.current();
    } catch {
      // silent fail
    }
  }, [user?.email, user?.userId, user?._id]);

  // Mark individual notification as read
  const markSingleRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notificationId,
          email: user?.email || '',
          userId: user?.userId || user?._id || '',
        }),
      });
      setNotifs((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch {
      // silent fail
    }
  };

  // When modal is opened: fetch list; mark-all-read runs once (badge also cleared from navbar)
  useEffect(() => {
    if (!isOpen) return;

    fetchNotifs(false);
    markAllRead();

    const interval = setInterval(() => {
      if (!document.hidden) fetchNotifs(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, fetchNotifs, markAllRead]);

  if (!isOpen) return null;

  const handleNotificationClick = (item) => {
    if (!item.read) {
      markSingleRead(item.id);
    }
    if (item.url && item.url !== '/') {
      onClose();
      router.push(item.url);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'chat_message':
        return <MessageSquare size={16} className="text-cyan-400" />;
      case 'deposit':
      case 'withdraw':
        return <Wallet size={16} className="text-emerald-400" />;
      case 'game':
        return <Gamepad2 size={16} className="text-purple-400" />;
      default:
        return <Sparkles size={16} className="text-amber-400" />;
    }
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="cyber-modal-overlay">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[var(--chrome-border)] bg-[var(--bg-deep)] p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.9)] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ backdropFilter: 'blur(16px)' }}
      >
        {/* Top Glow Ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center transition-all z-20"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="font-heading font-black text-base sm:text-lg text-white tracking-wide">
                NOTIFICATIONS
              </h2>
              <p className="text-[11px] text-slate-400">
                Live player alerts, chat updates &amp; promos
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <CheckCheck size={13} />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification List Container */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar z-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading alerts...</p>
            </div>
          ) : notifs.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500">
                <Bell size={26} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-300">No notifications</p>
                <p className="text-xs text-slate-500 mt-1">
                  You are all caught up! Important account and bonus updates will appear here.
                </p>
              </div>
            </div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`group relative p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all cursor-pointer ${
                  !n.read
                    ? 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.08)]'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0">
                      {getNotifIcon(n.type)}
                    </div>
                    <span
                      className={`font-heading font-bold text-xs truncate max-w-[200px] sm:max-w-[260px] ${
                        !n.read ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {n.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock size={11} />
                      {n.createdAt
                        ? new Date(n.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)] shrink-0" />
                    )}
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed text-[11px] pl-8">
                  {formatPlayerFacingCopy(n.message)}
                </p>

                {n.url && n.url !== '/' && (
                  <div className="pl-8 pt-1 flex items-center gap-1 text-[10px] font-bold text-cyan-400 group-hover:underline">
                    <span>View Details</span>
                    <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between text-[10px] text-slate-500 z-10">
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-400" />
            Official Rich Room Hub
          </span>
          <span>{notifs.length} total messages</span>
        </div>
      </div>
    </div>
  );
}
