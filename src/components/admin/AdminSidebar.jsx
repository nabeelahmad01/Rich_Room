'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  KeyRound,
  Wallet,
  Users,
  Coins,
  CreditCard,
  Gamepad2,
  ShieldCheck,
  MessageSquare,
  Settings,
  LogOut,
  ExternalLink,
  Smartphone,
  X,
  ShieldAlert
} from 'lucide-react';

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  pendingCounts = {},
  adminUser,
  onLogout,
}) {
  const hasAccess = (tabId, role) => {
    const roles = String(role || '').toLowerCase().split(',').map((r) => r.trim());
    if (roles.includes('super_admin') || roles.includes('admin')) return true;
    if (tabId === 'overview') return true;

    if (roles.includes('operation_admin')) {
      return !['staff', 'settings'].includes(tabId);
    }
    if (roles.includes('financial_manager') || roles.includes('financial_admin')) {
      return ['overview', 'ledger', 'gateways'].includes(tabId);
    }
    if (roles.includes('coin_manager') || roles.includes('coins_admin')) {
      return ['overview', 'requests', 'coins'].includes(tabId);
    }
    if (roles.includes('chat_support') || roles.includes('support_admin')) {
      return ['overview', 'support'].includes(tabId);
    }
    return false;
  };

  const allMenuItems = [
    { id: 'overview', label: 'Overview Analytics', icon: LayoutDashboard },
    {
      id: 'requests',
      label: 'Game Requests',
      icon: KeyRound,
      badge: pendingCounts.requests || 0,
    },
    {
      id: 'ledger',
      label: 'Financial Ledger',
      icon: Wallet,
      badge: pendingCounts.ledger || 0,
    },
    {
      id: 'coins',
      label: 'Coins Allotment Queue',
      icon: Coins,
      badge: pendingCounts.coins || 0,
    },
    { id: 'users', label: 'Player Accounts', icon: Users },
    { id: 'gateways', label: 'Payment Gateways', icon: CreditCard },
    { id: 'games', label: 'Games Library', icon: Gamepad2 },
    { id: 'staff', label: 'Staff Management', icon: ShieldCheck },
    {
      id: 'support',
      label: 'Live Support Chat',
      icon: MessageSquare,
      badge: pendingCounts.chats || 0,
    },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const menuItems = allMenuItems.filter((item) => hasAccess(item.id, adminUser?.role));

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[270px] min-w-[270px] bg-[var(--bg-deep)]/95 border-r border-[var(--chrome-border)]/60 backdrop-blur-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out font-sub ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-[var(--chrome-border)]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-[var(--neon-cyan)] shadow-[0_0_12px_var(--neon-cyan-glow)] bg-black shrink-0">
              <Image
                src="/logo.png"
                alt="Rich Room Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="font-heading font-black text-xs tracking-wider text-white flex items-center gap-1">
                RICH <span className="text-[var(--neon-cyan)]">ROOM</span>
              </div>
              <div className="text-[9px] text-amber-400 font-mono tracking-widest uppercase">
                VIP CONSOLE
              </div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
          <div className="text-[10px] font-sub font-bold text-amber-400/80 uppercase tracking-widest px-3 mb-2">
            Operations & Queues
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-sub font-semibold transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-400/50 text-white shadow-[0_0_18px_rgba(255,215,0,0.15)] font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(255,215,0,0.5)]'
                        : 'bg-slate-900/80 text-slate-400 group-hover:text-amber-400 group-hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile Card & App Download Footer */}
        <div className="p-3 border-t border-[var(--chrome-border)]/40 space-y-2 shrink-0 bg-[var(--bg-surface)]/90">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                <ShieldAlert size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {adminUser?.username || 'Super Admin'}
                </div>
                <div className="text-[9px] text-amber-400 uppercase font-mono truncate">
                  {adminUser?.role?.replace('_', ' ') || 'Super Admin'}
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/download-app"
            target="_blank"
            className="w-full py-2 px-3 rounded-xl bg-amber-950/30 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Smartphone size={13} />
            <span>Portal APK Shell</span>
            <ExternalLink size={10} className="opacity-60" />
          </Link>

          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/60 text-rose-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
