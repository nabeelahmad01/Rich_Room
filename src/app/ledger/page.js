'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Zap,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
  Lock,
  Users,
} from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import DailySpinWheelModal from '@/components/common/DailySpinWheelModal';

export default function LedgerPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);

  // Filters & Search
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
      const meData = await meRes.json();
      if (meData.authenticated && meData.user) {
        setUser(meData.user);
        const isStaff = meData.user.role && meData.user.role !== 'player';
        if (!isStaff) {
          router.replace('/wallet');
          return;
        } else {
          router.replace('/admin?tab=ledger');
          return;
        }
      } else if (!isSilent) {
        router.replace('/login');
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      if (!document.hidden) loadData(true);
    }, 5000);

    const handleUserSync = (e) => {
      if (e.detail) setUser(e.detail);
    };

    const handleFocus = () => loadData(true);

    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Granular Classification Helpers
  const isDeposit = (r) => {
    const t = (r.type || r.rawType || '').toLowerCase();
    return t === 'deposit' || t === 'deposit_pending' || (t.includes('deposit') && !t.includes('bonus'));
  };
  const isCashout = (r) => {
    const t = (r.type || r.rawType || '').toLowerCase();
    return t.includes('withdraw') || t.includes('redemption');
  };
  const isDailySpin = (r) => {
    const t = (r.type || r.rawType || '').toLowerCase();
    const notes = (r.notes || '').toLowerCase();
    return t.includes('spin') || notes.includes('wheel') || notes.includes('daily lucky spin') || notes.includes('daily spin');
  };
  const isReferral = (r) => {
    const t = (r.type || r.rawType || '').toLowerCase();
    const notes = (r.notes || '').toLowerCase();
    return t.includes('referral') || notes.includes('referral');
  };
  const isBonus = (r) => {
    const t = (r.type || r.rawType || '').toLowerCase();
    const notes = (r.notes || '').toLowerCase();
    return (
      (t.includes('bonus') || t.includes('welcome') || t.includes('promo') || t.includes('freeplay') || notes.includes('bonus')) &&
      !isDailySpin(r) &&
      !isReferral(r)
    );
  };
  const isTransfer = (r) => {
    const t = (r.type || r.rawType || '').toLowerCase();
    return t.includes('transfer') || t.includes('load') || t.includes('freeze') || t.includes('allotment');
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const notesStr = (r.notes || '').toLowerCase();
      const typeStr = (r.type || r.rawType || '').toLowerCase();
      const search = searchQuery.toLowerCase().trim();

      // Type filter
      if (filterType === 'deposits' && !isDeposit(r)) return false;
      if (filterType === 'bonuses' && !isBonus(r)) return false;
      if (filterType === 'withdrawals' && !isCashout(r)) return false;
      if (filterType === 'referrals' && !isReferral(r)) return false;
      if (filterType === 'spins' && !isDailySpin(r)) return false;
      if (filterType === 'transfers' && !isTransfer(r)) return false;

      // Text search
      if (search) {
        const matchesNote = notesStr.includes(search);
        const matchesType = typeStr.includes(search) || (r.displayType || '').toLowerCase().includes(search);
        const matchesId = (r.id || r.referenceId || '').toLowerCase().includes(search);
        if (!matchesNote && !matchesType && !matchesId) return false;
      }

      return true;
    });
  }, [records, filterType, searchQuery]);

  // Aggregate KPI metrics
  const stats = useMemo(() => {
    let depositsTotal = 0;
    let withdrawalsTotal = 0;
    let bonusesTotal = 0;
    let rewardsTotal = 0;

    for (const r of records) {
      const amt = Math.abs(Number(r.amount ?? r.amountSC ?? 0));
      if (isNaN(amt)) continue;

      if (isDeposit(r)) {
        depositsTotal += amt;
      } else if (isCashout(r)) {
        withdrawalsTotal += amt;
      } else if (isBonus(r)) {
        bonusesTotal += amt;
      } else if (isReferral(r) || isDailySpin(r)) {
        rewardsTotal += amt;
      }
    }

    return {
      depositsTotal,
      withdrawalsTotal,
      bonusesTotal,
      rewardsTotal,
      totalCount: records.length,
    };
  }, [records]);

  const filterTabs = [
    { id: 'all', label: 'All Activity', count: records.length },
    { id: 'deposits', label: 'Deposits', count: records.filter(isDeposit).length },
    { id: 'bonuses', label: 'Deposit & Welcome Bonuses', count: records.filter(isBonus).length },
    { id: 'withdrawals', label: 'Cashouts', count: records.filter(isCashout).length },
    { id: 'referrals', label: 'Referral Rewards', count: records.filter(isReferral).length },
    { id: 'spins', label: 'Daily Spins', count: records.filter(isDailySpin).length },
    { id: 'transfers', label: 'Game Transfers', count: records.filter(isTransfer).length },
  ];

  const getRecordBadge = (r) => {
    if (isDailySpin(r)) {
      return {
        label: 'DAILY SPIN',
        color: 'text-amber-400 bg-amber-500/15 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
        icon: Sparkles,
      };
    }
    if (isReferral(r)) {
      return {
        label: 'REFERRAL BONUS',
        color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
        icon: Users,
      };
    }
    if (isBonus(r)) {
      const isWelcome = (r.type || '').toLowerCase().includes('welcome') || (r.notes || '').toLowerCase().includes('welcome');
      return {
        label: isWelcome ? 'WELCOME BONUS' : 'DEPOSIT BONUS',
        color: isWelcome
          ? 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.2)]'
          : 'text-purple-400 bg-purple-500/15 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
        icon: Gift,
      };
    }
    if (isCashout(r)) {
      return {
        label: 'CASHOUT',
        color: 'text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
        icon: ArrowUpRight,
      };
    }
    if (isDeposit(r)) {
      return {
        label: 'DEPOSIT',
        color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
        icon: ArrowDownLeft,
      };
    }
    if (isTransfer(r)) {
      return {
        label: 'GAME LOAD',
        color: 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/15 border-[var(--neon-cyan)]/30',
        icon: Coins,
      };
    }
    return {
      label: (r.displayType || r.type || 'ACTIVITY').toUpperCase(),
      color: 'text-slate-300 bg-slate-800 border-slate-700',
      icon: Receipt,
    };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col font-sans selection:bg-[var(--neon-cyan)] selection:text-black">
      {/* Collapsible Sidebar */}
      <CyberSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        onOpenWallet={(tab) => {
          if (tab === 'withdraw') router.push('/withdraw');
          else router.push('/deposit');
        }}
        onOpenGameRequest={() => router.push('/games')}
        onOpenChat={() => {}}
        onOpenDailyBonus={() => setSpinWheelOpen(true)}
        onOpenSpinWheel={() => setSpinWheelOpen(true)}
      />

      {/* Main Content Layout with proper lg:pl-64 offset */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
          onOpenAuth={(mode) => router.push(`/${mode}`)}
          onOpenWallet={(tab) => {
            if (tab === 'withdraw') router.push('/withdraw');
            else router.push('/deposit');
          }}
          onOpenSpinWheel={() => setSpinWheelOpen(true)}
          onLogout={() => {
            fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            router.push('/login');
          }}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 lg:pb-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--neon-cyan)]/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-[#0c102b] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-xs font-bold uppercase tracking-wider mb-2">
                  <Receipt size={14} />
                  <span>Immutable Financial Ledger</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
                  TRANSACTION <span className="text-[var(--neon-cyan)]">AUDIT LEDGER</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  Cryptographically verified transaction trail of all deposits, cashout redemptions, daily spin wheel bonuses, and game coin allocations.
                </p>
              </div>

              {/* Refresh & Live Balance */}
              <div className="flex items-center gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-right min-w-[150px]">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">CURRENT WALLET</span>
                  <span className="font-mono font-black text-xl sm:text-2xl text-emerald-400">
                    ${Number(user?.balance ?? user?.balanceSC ?? 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Refresh Ledger"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin text-[var(--neon-cyan)]' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Deposited */}
            <div className="p-4 rounded-2xl bg-[#0d102b] border border-emerald-500/30 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px]">Total Loaded</span>
                <ArrowDownLeft size={16} className="text-emerald-400" />
              </div>
              <div className="font-mono font-black text-xl sm:text-2xl text-emerald-400">
                ${stats.depositsTotal.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Verified cash additions</span>
            </div>

            {/* Card 2: Total Redeemed */}
            <div className="p-4 rounded-2xl bg-[#0d102b] border border-[var(--neon-cyan)]/30 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px]">Total Cashout</span>
                <ArrowUpRight size={16} className="text-[var(--neon-cyan)]" />
              </div>
              <div className="font-mono font-black text-xl sm:text-2xl text-[var(--neon-cyan)]">
                ${stats.withdrawalsTotal.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Dispatched to wallet</span>
            </div>

            {/* Card 3: Deposit & Welcome Bonuses */}
            <div className="p-4 rounded-2xl bg-[#0d102b] border border-fuchsia-500/30 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px]">Bonuses Earned</span>
                <Gift size={16} className="text-fuchsia-400" />
              </div>
              <div className="font-mono font-black text-xl sm:text-2xl text-fuchsia-400">
                ${stats.bonusesTotal.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Welcome & deposit reload</span>
            </div>

            {/* Card 4: Daily Spin & Referral Rewards */}
            <div className="p-4 rounded-2xl bg-[#0d102b] border border-amber-500/30 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px]">Spins & Referrals</span>
                <Sparkles size={16} className="text-amber-400" />
              </div>
              <div className="font-mono font-black text-xl sm:text-2xl text-amber-400">
                ${stats.rewardsTotal.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Daily lucky wheel & invites</span>
            </div>
          </div>

          {/* Controls Bar: Filter Tabs & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {filterTabs.map((tab) => {
                const isSelected = filterType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--neon-cyan)] text-black shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                        isSelected ? 'bg-black/25 text-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search notes, IDs, types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--neon-cyan)] transition-colors font-sans"
              />
            </div>
          </div>

          {/* Ledger Table Container */}
          <div className="rounded-3xl border border-slate-800 bg-[#0d102b] overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw size={24} className="animate-spin text-[var(--neon-cyan)] mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider font-mono">Synchronizing Verified Ledger...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <AlertCircle size={28} className="text-slate-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">No Matching Transactions Found</p>
                <p className="text-xs text-slate-500">
                  {searchQuery ? 'Try clearing your search query or filter.' : 'Your ledger activity will appear here once you play or deposit.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#070919] border-b border-slate-800 font-sans font-bold text-[10px] uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Date / Time</th>
                      <th className="py-3.5 px-4">Transaction Type</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Balance After</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Verification Details & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredRecords.map((r, i) => {
                      const badge = getRecordBadge(r);
                      const BadgeIcon = badge.icon;

                      // Fix: Clean numeric parsing to completely prevent NaN
                      const rawAmt = Number(r.amount ?? r.amountSC ?? 0);
                      const isNegative = rawAmt < 0 || (r.type || '').toLowerCase().includes('withdraw') || (r.type || '').toLowerCase().includes('debit');
                      const absAmt = Math.abs(isNaN(rawAmt) ? 0 : rawAmt);

                      const formattedDate = r.createdAt
                        ? new Date(r.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recent';

                      return (
                        <tr key={r.id || i} className="hover:bg-slate-900/50 transition-colors">
                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-slate-500 flex-shrink-0" />
                              <span>{formattedDate}</span>
                            </div>
                          </td>

                          {/* Transaction Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10.5px] font-heading font-black tracking-wide ${badge.color}`}
                            >
                              <BadgeIcon size={12} />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          {/* Clean Amount (Never NaN) */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-sm">
                            <span className={isNegative ? 'text-rose-400' : 'text-emerald-400'}>
                              {isNegative ? '-' : '+'}${absAmt.toFixed(2)}
                            </span>
                          </td>

                          {/* Balance After */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-bold text-xs">
                            {r.balanceAfter !== null && r.balanceAfter !== undefined && !isNaN(Number(r.balanceAfter)) ? (
                              <span>${Number(r.balanceAfter).toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-black uppercase tracking-wider ${
                                (r.status || '').toLowerCase() === 'pending'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : (r.status || '').toLowerCase() === 'rejected'
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              <CheckCircle2 size={10} />
                              <span>{r.status || 'APPROVED'}</span>
                            </span>
                          </td>

                          {/* Details / Notes */}
                          <td className="py-3.5 px-4 text-slate-300 text-xs font-sans max-w-xs sm:max-w-md truncate">
                            <span title={r.notes || 'System transaction'}>
                              {r.notes || 'System transaction verified'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Cyber Footer */}
        <CyberFooter />
      </div>

      {/* Daily Spin Wheel Modal */}
      <DailySpinWheelModal
        isOpen={spinWheelOpen}
        onClose={() => setSpinWheelOpen(false)}
        user={user}
        onBalanceUpdated={loadData}
      />

      {/* Mobile Bottom Nav */}
      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(mode) => router.push(`/${mode}`)}
        onOpenWallet={(tab) => {
          if (tab === 'withdraw') router.push('/withdraw');
          else router.push('/deposit');
        }}
        onOpenSpinWheel={() => setSpinWheelOpen(true)}
      />
    </div>
  );
}
