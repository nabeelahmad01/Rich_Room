'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export default function BonusAlertToast({ onAllowed }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('vegas_bonus_toast_dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('vegas_bonus_toast_dismissed', 'true');
  };

  const handleAllow = async () => {
    setVisible(false);
    localStorage.setItem('vegas_bonus_toast_dismissed', 'true');
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('Rich Room Bonus Alerts Activated!', {
            body: 'You are now set up to receive VIP coin drop notifications and redemption updates.',
            icon: '/icons/icon-192.png',
          });
        }
      } catch {}
    }
    if (onAllowed) onAllowed();
  };

  if (!visible) return null;

  return (
    <div className="bonus-alert-toast">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-xl bg-amber-950/50 border border-amber-500/40 flex items-center justify-center text-[var(--neon-cyan)] shrink-0">
          <Bell size={18} />
        </div>
        <div>
          <h4 className="text-xs font-black text-white">Turn on bonus alerts?</h4>
          <p className="text-[11px] text-gray-300 leading-snug">
            We&apos;ll ping you when a bonus drops or your redemption clears — that&apos;s it.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleAllow}
          className="btn-gold py-1.5 px-3.5 text-xs font-black"
        >
          Allow
        </button>
        <button
          onClick={handleDismiss}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10"
        >
          Not now
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded text-gray-500 hover:text-white"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
