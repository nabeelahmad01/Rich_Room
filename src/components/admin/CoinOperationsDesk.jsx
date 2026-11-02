'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  Gamepad2,
  FileText,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  DollarSign,
  Maximize2
} from 'lucide-react';
import { diffSet } from '@/lib/fastDiff';

export default function CoinOperationsDesk({ sessionUser }) {
  const [activeSection, setActiveSection] = useState('loads'); // 'loads' | 'cashouts'
  const [loading, setLoading] = useState(false);

  // Load Requests State (from /api/account-requests)
  const [loadRequests, setLoadRequests] = useState([]);
  const [loadSearch, setLoadSearch] = useState('');
  const [loadFilter, setLoadFilter] = useState('all');

  // Cashout Requests State (from /api/payments/withdraw)
  const [cashoutRequests, setCashoutRequests] = useState([]);
  const [cashoutSearch, setCashoutSearch] = useState('');
  const [cashoutFilter, setCashoutFilter] = useState('all');

  // Modals State
  const [approveLoadModal, setApproveLoadModal] = useState({ open: false, item: null, username: '', password: '', transferAmount: 0 });
  const [rejectLoadModal, setRejectLoadModal] = useState({ open: false, item: null, reason: '' });
  const [rejectCashoutModal, setRejectCashoutModal] = useState({ open: false, item: null, reason: '' });
  const [screenshotModal, setScreenshotModal] = useState({ open: false, src: null, title: '' });

  // Status Alerts
  const [alert, setAlert] = useState(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Fetch all data
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [loadsRes, cashoutsRes] = await Promise.all([
        fetch('/api/account-requests?type=COIN_LOAD&status=all'),
        fetch('/api/payments/withdraw?status=all'),
      ]);

      const loadsData = await loadsRes.json();
      const cashoutsData = await cashoutsRes.json();

      if (loadsData.success) {
        diffSet(setLoadRequests, loadsData.accountRequests || []);
      }
      if (cashoutsData.success) {
        diffSet(setCashoutRequests, cashoutsData.redemptions || []);
      }
    } catch (err) {
      console.error('Error fetching coin desk data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    // Silent background polling (1500ms) for real-time live desk operations
    const interval = setInterval(() => {
      if (!document.hidden) fetchData(true);
    }, 1500);

    // Cross-tab broadcast listener for instant (0ms) cashout detection
    let channel = null;
    try {
      channel = new BroadcastChannel('paradise_staff_alerts');
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_COIN_CASHOUT' || event.data?.type === 'NEW_COIN_LOAD') {
          fetchData(true);
        }
      };
    } catch {}

    const handleStorage = (e) => {
      if (e.key === 'paradise_staff_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.type === 'NEW_COIN_CASHOUT' || parsed.type === 'NEW_COIN_LOAD') {
            fetchData(true);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Filtered Load Requests (Strictly COIN_LOAD requests only)
  const pendingLoads = useMemo(() => {
    return loadRequests.filter(
      (r) =>
        r.status === 'PENDING' &&
        (r.requestType === 'COIN_LOAD' || Number(r.transferAmount || 0) > 0) &&
        (loadSearch === '' ||
          r.userEmail?.toLowerCase().includes(loadSearch.toLowerCase()) ||
          r.userName?.toLowerCase().includes(loadSearch.toLowerCase()) ||
          r.gameTitle?.toLowerCase().includes(loadSearch.toLowerCase()))
    );
  }, [loadRequests, loadSearch]);

  const historyLoads = useMemo(() => {
    return loadRequests.filter((r) => {
      if (r.status === 'PENDING') return false;
      if (r.requestType !== 'COIN_LOAD' && (!r.transferAmount || Number(r.transferAmount) <= 0)) return false;
      if (loadFilter !== 'all') {
        if (loadFilter === 'approved' && r.status !== 'READY') return false;
        if (loadFilter === 'rejected' && r.status !== 'REJECTED' && r.status !== 'CANCELLED') return false;
      }
      if (loadSearch) {
        return (
          r.userEmail?.toLowerCase().includes(loadSearch.toLowerCase()) ||
          r.userName?.toLowerCase().includes(loadSearch.toLowerCase()) ||
          r.gameTitle?.toLowerCase().includes(loadSearch.toLowerCase())
        );
      }
      return true;
    });
  }, [loadRequests, loadFilter, loadSearch]);

  // Filtered Cashouts for Coin Desk (Pending Coin Verification)
  const pendingCashouts = useMemo(() => {
    return cashoutRequests.filter(
      (c) =>
        (c.status === 'pending_coin' || c.stage === 'coin_verification') &&
        (cashoutSearch === '' ||
          c.username?.toLowerCase().includes(cashoutSearch.toLowerCase()) ||
          c.gameTitle?.toLowerCase().includes(cashoutSearch.toLowerCase()) ||
          c.destinationAddress?.toLowerCase().includes(cashoutSearch.toLowerCase()))
    );
  }, [cashoutRequests, cashoutSearch]);

  const historyCashouts = useMemo(() => {
    return cashoutRequests.filter((c) => {
      if (c.status === 'pending_coin' || c.stage === 'coin_verification') return false;
      if (cashoutFilter !== 'all') {
        if (cashoutFilter === 'verified' && !c.coinApprovedBy && c.status !== 'pending' && c.status !== 'approved') return false;
        if (cashoutFilter === 'rejected' && c.status !== 'rejected_by_coin') return false;
      }
      if (cashoutSearch) {
        return (
          c.username?.toLowerCase().includes(cashoutSearch.toLowerCase()) ||
          c.gameTitle?.toLowerCase().includes(cashoutSearch.toLowerCase()) ||
          c.destinationAddress?.toLowerCase().includes(cashoutSearch.toLowerCase())
        );
      }
      return true;
    });
  }, [cashoutRequests, cashoutFilter, cashoutSearch]);

  // Handle Approve Game Load
  const handleApproveLoadSubmit = async (e) => {
    e.preventDefault();
    if (!approveLoadModal.item) return;

    const targetItem = approveLoadModal.item;
    const u = approveLoadModal.username.trim() || targetItem.userName;
    const p = approveLoadModal.password.trim() || 'VegasWin777!';
    const amt = Number(approveLoadModal.transferAmount);

    // 1. Optimistic state update (0ms)
    setLoadRequests((prev) =>
      prev.map((r) => (r.id === targetItem.id ? { ...r, status: 'READY', gameAccountUsername: u } : r))
    );
    // 2. Dismiss modal immediately (0ms)
    setApproveLoadModal({ open: false, item: null, username: '', password: '', transferAmount: 0 });
    showAlert('success', 'Game load approved!');

    try {
      const res = await fetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetItem.id,
          action: 'approve',
          username: u,
          password: p,
          transferAmount: amt,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showAlert('error', data.message || 'Failed to approve load.');
        fetchData();
      }
    } catch {
      showAlert('error', 'Network error approving game load.');
      fetchData();
    }
  };

  // Handle Reject Game Load with Note
  const handleRejectLoadSubmit = async (e) => {
    e.preventDefault();
    if (!rejectLoadModal.item) return;
    if (!rejectLoadModal.reason.trim()) {
      showAlert('error', 'Please write a note explaining why this request was rejected.');
      return;
    }

    const targetItem = rejectLoadModal.item;
    const reason = rejectLoadModal.reason.trim();

    // 1. Optimistic state update (0ms)
    setLoadRequests((prev) =>
      prev.map((r) => (r.id === targetItem.id ? { ...r, status: 'REJECTED', rejectionReason: reason } : r))
    );
    // 2. Dismiss modal immediately (0ms)
    setRejectLoadModal({ open: false, item: null, reason: '' });
    showAlert('success', 'Game load request rejected.');

    try {
      const res = await fetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetItem.id,
          action: 'reject',
          rejectionReason: reason,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showAlert('error', data.message || 'Failed to reject request.');
        fetchData();
      }
    } catch {
      showAlert('error', 'Network error rejecting request.');
      fetchData();
    }
  };

  // Handle Cashout Coin Approval (Pass to Finance)
  const handleApproveCashout = async (redemptionId) => {
    const targetItem = cashoutRequests.find((c) => c.id === redemptionId);

    // 1. Optimistic state update (0ms)
    setCashoutRequests((prev) =>
      prev.map((c) => (c.id === redemptionId ? { ...c, stage: 'finance_payout', coinApprovedBy: 'Coin Desk' } : c))
    );
    showAlert('success', '🏆 Game screenshot verified! Request forwarded to Finance Ledger for payout.');

    try {
      const res = await fetch('/api/payments/withdraw', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemptionId,
          action: 'coin_approve',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showAlert('error', data.error || 'Failed to verify cashout.');
        fetchData();
      } else {
        // Broadcast instant notification to Finance / Cashier desk (0ms sound + Chrome desktop notification)
        try {
          const staffChannel = new BroadcastChannel('paradise_staff_alerts');
          staffChannel.postMessage({
            type: 'NEW_FINANCE_REDEMPTION',
            redemptionId,
            amount: targetItem?.amount || 0,
            username: targetItem?.username || '',
            gameTitle: targetItem?.gameTitle || '',
          });
          staffChannel.close();
        } catch {}

        localStorage.setItem(
          'paradise_staff_event',
          JSON.stringify({
            type: 'NEW_FINANCE_REDEMPTION',
            redemptionId,
            amount: targetItem?.amount || 0,
            username: targetItem?.username || '',
            gameTitle: targetItem?.gameTitle || '',
            time: Date.now(),
          })
        );
      }
    } catch {
      showAlert('error', 'Network error verifying cashout.');
      fetchData();
    }
  };

  // Handle Reject Cashout with Note
  const handleRejectCashoutSubmit = async (e) => {
    e.preventDefault();
    if (!rejectCashoutModal.item) return;
    if (!rejectCashoutModal.reason.trim()) {
      showAlert('error', 'Please write a note explaining why this cashout was rejected.');
      return;
    }

    const targetItem = rejectCashoutModal.item;
    const reason = rejectCashoutModal.reason.trim();

    // 1. Optimistic state update (0ms)
    setCashoutRequests((prev) =>
      prev.map((c) =>
        c.id === targetItem.id
          ? { ...c, status: 'rejected_by_coin', stage: 'rejected_coin', rejectReason: reason }
          : c
      )
    );
    // 2. Dismiss modal immediately (0ms)
    setRejectCashoutModal({ open: false, item: null, reason: '' });
    showAlert('success', 'Cashout rejected. Note sent to user.');

    try {
      const res = await fetch('/api/payments/withdraw', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemptionId: targetItem.id,
          action: 'coin_reject',
          rejectReason: reason,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showAlert('error', data.message || 'Failed to reject cashout.');
        fetchData();
      } else {
        // Unfreeze balance in player window in real time without refresh
        try {
          const syncChan = new BroadcastChannel('paradise_balance_sync');
          syncChan.postMessage({ type: 'BALANCE_UPDATED', time: Date.now() });
          syncChan.close();
        } catch {}
        localStorage.setItem('paradise_user_balance_sync', String(Date.now()));
      }
    } catch {
      showAlert('error', 'Network error rejecting cashout.');
      fetchData();
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
      {/* 1. Header Toolbar */}
      <div
        className="p-6 sm:p-7 sm:py-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6"
        style={{
          backgroundColor: '#0E0A24',
          background: 'linear-gradient(135deg, #0E0A24 0%, #140E33 100%)',
          border: '1px solid rgba(0, 240, 255, 0.28)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 240, 255, 0.12)',
        }}
      >
        <div className="flex items-center gap-5 sm:gap-6">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(224, 38, 216, 0.2) 100%)',
              border: '1.5px solid rgba(0, 240, 255, 0.5)',
              boxShadow: '0 0 25px rgba(0, 240, 255, 0.35)',
              color: '#00F0FF',
            }}
          >
            <Coins size={28} className="sm:hidden" />
            <Coins size={32} className="hidden sm:block" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight" style={{ fontFamily: 'Lexend, sans-serif' }}>
                Coins Allotment &amp; Operations Desk
              </h2>
              <span
                className="text-[10.5px] px-3 py-1 rounded-full font-black tracking-wider whitespace-nowrap shadow-sm"
                style={{
                  backgroundColor: 'rgba(255, 215, 0, 0.14)',
                  color: '#FFD700',
                  border: '1px solid rgba(255, 215, 0, 0.45)',
                  boxShadow: '0 0 12px rgba(255, 215, 0, 0.25)',
                }}
              >
                1 COIN = 1 SC ($)
              </span>
              <span
                className="text-[11px] px-3 py-1 rounded-full font-bold flex items-center gap-1.5 font-mono shadow-sm"
                style={{
                  backgroundColor: 'rgba(0, 240, 255, 0.12)',
                  color: '#00F0FF',
                  border: '1px solid rgba(0, 240, 255, 0.35)',
                }}
              >
                <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_#00F0FF]" />
                <span>Active Queue: {pendingLoads.length + pendingCashouts.length}</span>
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-[#9A91A8] mt-1.5 leading-relaxed m-0" style={{ fontFamily: 'Lexend, sans-serif' }}>
              Approve game balance recharges and verify player winning screenshots before finance dispatch
            </p>
          </div>
        </div>

        {/* Live Refresh & Operator */}
        <div className="flex items-center self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #00F0FF 0%, #00d0e8 40%, #E026D8 100%)',
              color: '#070514',
              boxShadow: '0 0 25px rgba(0, 240, 255, 0.45)',
              border: 'none',
              fontFamily: 'Lexend, sans-serif',
            }}
          >
            <RefreshCw size={14} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
            <span>Sync Desk</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs sm:text-sm font-bold shadow-lg"
          style={
            alert.type === 'success'
              ? {
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'rgba(16, 185, 129, 0.45)',
                  color: '#6ee7b7',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
                  fontFamily: 'Lexend, sans-serif',
                }
              : {
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  borderColor: 'rgba(244, 63, 94, 0.45)',
                  color: '#fca5a5',
                  boxShadow: '0 0 15px rgba(244, 63, 94, 0.2)',
                  fontFamily: 'Lexend, sans-serif',
                }
          }
        >
          {alert.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> : <AlertCircle size={18} className="text-rose-400 shrink-0" />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* 2. Top Navigation Tabs: (1) Game Load Requests vs (2) Cashout Screenshot Verification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <button
          type="button"
          onClick={() => setActiveSection('loads')}
          className="w-full p-5 sm:p-6 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-4 text-left border hover:scale-[1.01]"
          style={
            activeSection === 'loads'
              ? {
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.18) 0%, rgba(14, 10, 36, 0.98) 100%)',
                  border: '1.5px solid #00F0FF',
                  boxShadow: '0 0 30px rgba(0, 240, 255, 0.28), inset 0 0 20px rgba(0, 240, 255, 0.1)',
                  color: '#00F0FF',
                  fontFamily: 'Lexend, sans-serif',
                }
              : {
                  backgroundColor: '#0E0A24',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9A91A8',
                  fontFamily: 'Lexend, sans-serif',
                }
          }
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={
                activeSection === 'loads'
                  ? {
                      backgroundColor: 'rgba(0, 240, 255, 0.22)',
                      border: '1px solid rgba(0, 240, 255, 0.5)',
                      color: '#00F0FF',
                      boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
                    }
                  : {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#9A91A8',
                    }
              }
            >
              <Gamepad2 size={24} />
            </div>
            <div className="truncate">
              <span className="block text-sm sm:text-base font-black truncate text-white">Game Load &amp; Recharge Requests</span>
              <span className="block text-xs opacity-75 truncate mt-0.5">Player balance allocations</span>
            </div>
          </div>
          <span
            className="px-3.5 py-1.5 rounded-full text-xs font-black shrink-0 font-mono"
            style={
              pendingLoads.length > 0
                ? {
                    backgroundColor: '#00F0FF',
                    color: '#070514',
                    boxShadow: '0 0 15px #00F0FF',
                  }
                : {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#9A91A8',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }
            }
          >
            {pendingLoads.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('cashouts')}
          className="w-full p-5 sm:p-6 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-4 text-left border hover:scale-[1.01]"
          style={
            activeSection === 'cashouts'
              ? {
                  background: 'linear-gradient(135deg, rgba(224, 38, 216, 0.18) 0%, rgba(14, 10, 36, 0.98) 100%)',
                  border: '1.5px solid #E026D8',
                  boxShadow: '0 0 30px rgba(224, 38, 216, 0.28), inset 0 0 20px rgba(224, 38, 216, 0.1)',
                  color: '#E026D8',
                  fontFamily: 'Lexend, sans-serif',
                }
              : {
                  backgroundColor: '#0E0A24',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9A91A8',
                  fontFamily: 'Lexend, sans-serif',
                }
          }
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={
                activeSection === 'cashouts'
                  ? {
                      backgroundColor: 'rgba(224, 38, 216, 0.22)',
                      border: '1px solid rgba(224, 38, 216, 0.5)',
                      color: '#E026D8',
                      boxShadow: '0 0 15px rgba(224, 38, 216, 0.3)',
                    }
                  : {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#9A91A8',
                    }
              }
            >
              <ShieldCheck size={24} />
            </div>
            <div className="truncate">
              <span className="block text-sm sm:text-base font-black truncate text-white">Cashout Proof Verifications</span>
              <span className="block text-xs opacity-75 truncate mt-0.5">Stage 1 screenshot audit</span>
            </div>
          </div>
          <span
            className="px-3.5 py-1.5 rounded-full text-xs font-black shrink-0 font-mono"
            style={
              pendingCashouts.length > 0
                ? {
                    backgroundColor: '#E026D8',
                    color: '#FFFFFF',
                    boxShadow: '0 0 15px #E026D8',
                  }
                : {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#9A91A8',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }
            }
          >
            {pendingCashouts.length}
          </span>
        </button>
      </div>

      {/* =========================================================================
          SECTION 1: GAME LOAD & RECHARGE REQUESTS
          ========================================================================= */}
      {activeSection === 'loads' && (
        <div className="flex flex-col gap-6 sm:gap-8">
          {/* A. Pending Game Load Requests (TOP) */}
          <div
            className="rounded-2xl p-6 sm:p-8 shadow-2xl"
            style={{
              backgroundColor: '#0E0A24',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 240, 255, 0.1)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-7">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />
                <h3 className="text-sm sm:text-base font-black text-white m-0 tracking-wide" style={{ fontFamily: 'Lexend, sans-serif' }}>
                  Pending Game Load Requests
                </h3>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono"
                  style={{
                    backgroundColor: 'rgba(0, 240, 255, 0.12)',
                    color: '#00F0FF',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                  }}
                >
                  {pendingLoads.length} Pending
                </span>
              </div>

              {/* Search Filter */}
              <div
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 w-full sm:w-72 transition-all"
                style={{
                  backgroundColor: '#070514',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                }}
              >
                <Search size={14} className="text-cyan-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search player, email or game..."
                  value={loadSearch}
                  onChange={(e) => setLoadSearch(e.target.value)}
                  className="bg-transparent border-none text-white text-xs outline-none w-full placeholder-gray-500"
                  style={{ fontFamily: 'Lexend, sans-serif' }}
                />
              </div>
            </div>

            {/* Pending Table */}
            {pendingLoads.length === 0 ? (
              <div
                style={{
                  padding: '72px 28px',
                  textAlign: 'center',
                  background: 'radial-gradient(ellipse at center, rgba(0, 240, 255, 0.12) 0%, rgba(7, 5, 20, 0.95) 75%)',
                  borderRadius: '20px',
                  border: '1.5px dashed rgba(0, 240, 255, 0.35)',
                  boxShadow: 'inset 0 0 40px rgba(0, 240, 255, 0.06)',
                }}
              >
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(224, 38, 216, 0.18) 100%)',
                    border: '1.5px solid rgba(0, 240, 255, 0.5)',
                    boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px auto',
                  }}
                >
                  <CheckCircle2 size={34} color="#00F0FF" />
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(0, 240, 255, 0.15)',
                    border: '1px solid rgba(0, 240, 255, 0.35)',
                    color: '#00F0FF',
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                    fontFamily: 'Lexend, sans-serif',
                  }}
                >
                  All Clear · Zero Queue Backlog
                </div>
                <p style={{ margin: 0, fontFamily: 'Lexend, sans-serif', fontSize: '17px', fontWeight: 900, color: '#FFFFFF' }}>
                  No Pending Game Loads in Queue
                </p>
                <p style={{ margin: '8px auto 0 auto', maxWidth: '480px', fontSize: '13px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif', lineHeight: 1.6 }}>
                  When players request coin recharges for Orion Stars, Juwa, Vegas 777, etc., requests will arrive here immediately.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View (Visible on mobile screens) */}
                <div className="block sm:hidden space-y-3">
                  {pendingLoads.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl p-3.5 space-y-3 shadow-md"
                      style={{
                        backgroundColor: '#070514',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0"
                            style={{
                              backgroundColor: 'rgba(0, 240, 255, 0.15)',
                              color: '#00F0FF',
                              border: '1px solid rgba(0, 240, 255, 0.3)',
                            }}
                          >
                            {(item.userName || item.userEmail || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-black text-white m-0 truncate">{item.userName || item.userEmail?.split('@')[0]}</p>
                            <span className="text-[10px] text-gray-400 block truncate">{item.userEmail}</span>
                          </div>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-black shrink-0 font-mono"
                          style={{
                            backgroundColor: 'rgba(0, 240, 255, 0.15)',
                            color: '#00F0FF',
                            border: '1px solid rgba(0, 240, 255, 0.35)',
                          }}
                        >
                          ${Number(item.transferAmount || 0).toFixed(2)} SC
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#FFFFFF',
                            }}
                          >
                            <Gamepad2 size={12} className="text-[#00F0FF]" /> {item.gameTitle}
                          </span>
                          {item.gameAccountUsername && (
                            <span className="text-[10.5px] font-mono font-bold text-[#34D399] bg-emerald-950/70 border border-emerald-500/35 px-2 py-0.5 rounded-lg">
                              @{item.gameAccountUsername}
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-gray-400 font-mono">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setApproveLoadModal({
                              open: true,
                              item,
                              username: item.gameAccountUsername || item.userName || item.userEmail?.split('@')[0],
                              password: item.gameAccountPassword || 'VegasWin777!',
                              transferAmount: Number(item.transferAmount || 0),
                            })
                          }
                          className="py-2.5 px-3 rounded-xl text-[#070514] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                          style={{
                            background: 'linear-gradient(135deg, #00F0FF 0%, #00d0e8 40%, #E026D8 100%)',
                            boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
                          }}
                        >
                          <Check size={14} strokeWidth={3} />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectLoadModal({ open: true, item, reason: '' })}
                          className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                          style={{
                            backgroundColor: 'rgba(244, 63, 94, 0.15)',
                            border: '1px solid rgba(244, 63, 94, 0.35)',
                            color: '#fda4af',
                          }}
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (Hidden on mobile) */}
                <div
                  className="hidden sm:block overflow-x-auto rounded-xl"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px', backgroundColor: '#070514' }}>
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                    </colgroup>
                    <thead style={{ backgroundColor: '#04020a', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Player</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Game Platform</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Load Amount</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date &amp; Time</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Admin Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLoads.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(0, 240, 255, 0.02)' }}>
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(0, 240, 255, 0.15)',
                                  border: '1px solid rgba(0, 240, 255, 0.3)',
                                  color: '#00F0FF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                  fontSize: '12px',
                                }}
                              >
                                {(item.userName || item.userEmail || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{item.userName || item.userEmail?.split('@')[0]}</p>
                                <span style={{ fontSize: '11px', color: '#9A91A8' }}>{item.userEmail}</span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#FFFFFF',
                                fontFamily: 'Lexend, sans-serif',
                                fontSize: '12px',
                                fontWeight: 800,
                              }}
                            >
                              <Gamepad2 size={13} color="#00F0FF" />
                              <span>{item.gameTitle}</span>
                            </span>
                          </td>

                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(0, 240, 255, 0.15)',
                                border: '1px solid rgba(0, 240, 255, 0.35)',
                                color: '#00F0FF',
                                fontFamily: 'Lexend, sans-serif',
                                fontSize: '13px',
                                fontWeight: 900,
                              }}
                            >
                              ${Number(item.transferAmount || 0).toFixed(2)} SC
                            </span>
                          </td>

                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#CBD5E1', fontSize: '12px', fontWeight: 700 }}>
                              <Clock size={12} color="#9A91A8" />
                              <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#9A91A8' }}>
                              {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setApproveLoadModal({
                                    open: true,
                                    item,
                                    username: item.gameAccountUsername || item.userName || item.userEmail?.split('@')[0],
                                    password: item.gameAccountPassword || 'VegasWin777!',
                                    transferAmount: Number(item.transferAmount || 0),
                                  })
                                }
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, #00F0FF 0%, #00d0e8 40%, #E026D8 100%)',
                                  border: 'none',
                                  color: '#070514',
                                  fontSize: '12px',
                                  fontFamily: 'Lexend, sans-serif',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 14px rgba(0, 240, 255, 0.35)',
                                }}
                              >
                                <Check size={14} strokeWidth={3} />
                                <span>Approve &amp; Deduct</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setRejectLoadModal({ open: true, item, reason: '' })}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                  border: '1px solid rgba(244, 63, 94, 0.35)',
                                  color: '#fda4af',
                                  fontSize: '12px',
                                  fontFamily: 'Lexend, sans-serif',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <X size={14} />
                                <span>Reject with Note</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* B. Processed Game Load History (BOTTOM) */}
          <div
            className="rounded-2xl p-6 sm:p-8 shadow-2xl"
            style={{
              backgroundColor: '#0E0A24',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-7">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm sm:text-base font-black text-white m-0 tracking-wide" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    Previous Game Load History
                  </h3>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold font-mono"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#9A91A8',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    {historyLoads.length} Records
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-[#9A91A8] mt-1.5" style={{ fontFamily: 'Lexend, sans-serif' }}>
                  Audit log of past approved and rejected game account recharges
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { key: 'all', label: 'All Records', color: '#00F0FF' },
                  { key: 'approved', label: 'Approved Only', color: '#10B981' },
                  { key: 'rejected', label: 'Rejected Only', color: '#F43F5E' },
                ].map(({ key, label, color }) => {
                  const isActive = loadFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLoadFilter(key)}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
                      style={
                        isActive
                          ? {
                              backgroundColor: `${color}25`,
                              border: `1.5px solid ${color}`,
                              color: '#FFFFFF',
                              boxShadow: `0 0 15px ${color}40`,
                              fontFamily: 'Lexend, sans-serif',
                            }
                          : {
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#9A91A8',
                              fontFamily: 'Lexend, sans-serif',
                            }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {historyLoads.length === 0 ? (
              <div
                style={{
                  padding: '60px 24px',
                  textAlign: 'center',
                  backgroundColor: '#070514',
                  borderRadius: '18px',
                  border: '1px dashed rgba(255, 255, 255, 0.14)',
                  color: '#9A91A8',
                  fontSize: '13px',
                  fontFamily: 'Lexend, sans-serif',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto',
                  }}
                >
                  <Clock size={26} color="#9A91A8" style={{ opacity: 0.8 }} />
                </div>
                <p style={{ margin: 0, fontWeight: 900, color: '#FFFFFF', fontSize: '15px' }}>No processed game load records found.</p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748B' }}>Audit logs will populate automatically as recharges are approved or rejected.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards for History */}
                <div className="block sm:hidden space-y-2.5">
                  {historyLoads.map((item) => {
                    const isReady = item.status === 'READY';
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl p-3.5 text-xs space-y-2"
                        style={{
                          backgroundColor: '#070514',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{item.userName || item.userEmail?.split('@')[0]}</span>
                          <span className="font-mono font-black text-[#00F0FF] text-xs">${Number(item.transferAmount || 0).toFixed(2)} SC</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span className="inline-flex items-center gap-1"><Gamepad2 size={11} className="text-[#00F0FF]" /> {item.gameTitle}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div>
                          {isReady ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
                              style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: '#6ee7b7',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                              }}
                            >
                              <CheckCircle2 size={11} /> READY / APPROVED
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
                              style={{
                                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                color: '#fda4af',
                                border: '1px solid rgba(244, 63, 94, 0.4)',
                              }}
                            >
                              <XCircle size={11} /> REJECTED {item.rejectionReason ? `· "${item.rejectionReason}"` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table for History */}
                <div
                  className="hidden sm:block overflow-x-auto rounded-xl"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '720px', backgroundColor: '#070514' }}>
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead style={{ backgroundColor: '#04020a', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Player</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Game Platform</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status &amp; Reason Note</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Processed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLoads.map((item) => {
                        const isReady = item.status === 'READY';
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                              <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF' }}>{item.userName || item.userEmail?.split('@')[0]}</p>
                              <span style={{ fontSize: '11px', color: '#9A91A8' }}>{item.userEmail}</span>
                            </td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '12px', color: '#E2E8F0', fontWeight: 700 }}>
                              <span className="inline-flex items-center gap-1.5">
                                <Gamepad2 size={13} color="#00F0FF" />
                                <span>{item.gameTitle}</span>
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '12.5px', color: '#00F0FF', fontWeight: 800, fontFamily: 'monospace' }}>
                              ${Number(item.transferAmount || 0).toFixed(2)} SC
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {isReady ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    color: '#6ee7b7',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                  }}
                                >
                                  <CheckCircle2 size={12} />
                                  <span>READY / APPROVED</span>
                                </span>
                              ) : (
                                <div>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                      color: '#fda4af',
                                      border: '1px solid rgba(244, 63, 94, 0.4)',
                                      fontSize: '11px',
                                      fontWeight: 900,
                                    }}
                                  >
                                    <XCircle size={12} />
                                    <span>REJECTED</span>
                                  </span>
                                  {item.rejectionReason && (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#fca5a5', fontStyle: 'italic' }}>
                                      &quot;{item.rejectionReason}&quot;
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px', color: '#9A91A8', fontFamily: 'monospace' }}>
                              {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: CASHOUT PROOF VERIFICATIONS (STAGE 1)
          ========================================================================= */}
      {activeSection === 'cashouts' && (
        <div className="flex flex-col gap-6 sm:gap-8">
          {/* A. Pending Cashout Screenshot Verifications (TOP) */}
          <div
            className="rounded-2xl p-6 sm:p-8 shadow-2xl"
            style={{
              backgroundColor: '#0E0A24',
              border: '1px solid rgba(224, 38, 216, 0.25)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(224, 38, 216, 0.1)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-7">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E026D8] shadow-[0_0_10px_#E026D8]" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white m-0 tracking-wide" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      Game Winning Screenshot Verifications
                    </h3>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold font-mono"
                      style={{
                        backgroundColor: 'rgba(224, 38, 216, 0.15)',
                        color: '#F5D0FE',
                        border: '1px solid rgba(224, 38, 216, 0.35)',
                      }}
                    >
                      {pendingCashouts.length} In Review
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-[#9A91A8] mt-1.5" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    Inspect player winning screenshots to verify game panel score before passing to Finance Ledger
                  </p>
                </div>
              </div>

              {/* Search Filter */}
              <div
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 w-full sm:w-72 transition-all"
                style={{
                  backgroundColor: '#070514',
                  border: '1px solid rgba(224, 38, 216, 0.25)',
                }}
              >
                <Search size={14} className="text-pink-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search player, game, or cashtag..."
                  value={cashoutSearch}
                  onChange={(e) => setCashoutSearch(e.target.value)}
                  className="bg-transparent border-none text-white text-xs outline-none w-full placeholder-gray-500"
                  style={{ fontFamily: 'Lexend, sans-serif' }}
                />
              </div>
            </div>

            {/* Table */}
            {pendingCashouts.length === 0 ? (
              <div
                style={{
                  padding: '72px 28px',
                  textAlign: 'center',
                  background: 'radial-gradient(ellipse at center, rgba(224, 38, 216, 0.12) 0%, rgba(7, 5, 20, 0.95) 75%)',
                  borderRadius: '20px',
                  border: '1.5px dashed rgba(224, 38, 216, 0.35)',
                  boxShadow: 'inset 0 0 40px rgba(224, 38, 216, 0.06)',
                }}
              >
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(224, 38, 216, 0.25) 0%, rgba(0, 240, 255, 0.18) 100%)',
                    border: '1.5px solid rgba(224, 38, 216, 0.5)',
                    boxShadow: '0 0 30px rgba(224, 38, 216, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px auto',
                  }}
                >
                  <ShieldCheck size={28} color="#E026D8" />
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '3px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(224, 38, 216, 0.15)',
                    border: '1px solid rgba(224, 38, 216, 0.35)',
                    color: '#F5D0FE',
                    fontSize: '10.5px',
                    fontWeight: 900,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    fontFamily: 'Lexend, sans-serif',
                  }}
                >
                  All Clear · Audit Up to Date
                </div>
                <p style={{ margin: 0, fontFamily: 'Lexend, sans-serif', fontSize: '15px', fontWeight: 900, color: '#FFFFFF' }}>
                  All Game Cashout Screenshots Verified!
                </p>
                <p style={{ margin: '6px auto 0 auto', maxWidth: '440px', fontSize: '12px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif', lineHeight: 1.5 }}>
                  When players request cashouts with their game winning screenshots, tickets will arrive here for stage 1 balance verification.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View (Visible on small screens) */}
                <div className="block sm:hidden space-y-3">
                  {pendingCashouts.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl space-y-3 shadow-lg"
                      style={{
                        backgroundColor: '#070514',
                        border: '1px solid rgba(224, 38, 216, 0.3)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="m-0 text-sm font-black text-white">{item.username}</p>
                          <span className="text-[10px] text-gray-400 font-mono">ID: {item.userId?.slice(-6)}</span>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-lg font-black text-xs font-mono"
                          style={{
                            backgroundColor: 'rgba(224, 38, 216, 0.15)',
                            color: '#F5D0FE',
                            border: '1px solid rgba(224, 38, 216, 0.4)',
                          }}
                        >
                          ${Number(item.amount).toFixed(2)} SC
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className="px-2.5 py-1 rounded-lg text-white font-bold text-[11px]"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          {item.gameTitle || 'Platform'}
                        </span>
                        <div className="flex items-center gap-1 text-gray-400 text-[11px] font-mono">
                          <Clock size={11} />
                          <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div
                        className="p-3 rounded-xl space-y-1.5"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400 font-medium">Game Platform:</span>
                          <span className="text-[#00F0FF] font-bold">{item.gameTitle || 'Game Platform'}</span>
                        </div>
                        {item.gameAccountUsername && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-400 font-medium">Game User ID:</span>
                            <span className="text-[#34D399] font-mono font-bold">@{item.gameAccountUsername}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400 font-medium">Payout Method:</span>
                          <span className="text-white font-bold">{item.payoutMethod}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400 font-medium">Cashtag / Dest:</span>
                          <span className="text-amber-300 font-mono font-semibold">{item.destinationAddress}</span>
                        </div>
                      </div>

                      {item.gameScreenshot ? (
                        <button
                          type="button"
                          onClick={() => setScreenshotModal({ open: true, src: item.gameScreenshot, title: `${item.username} - ${item.gameTitle} Winning Proof` })}
                          className="w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                          style={{
                            backgroundColor: 'rgba(0, 240, 255, 0.12)',
                            border: '1px solid rgba(0, 240, 255, 0.4)',
                            color: '#00F0FF',
                          }}
                        >
                          <div className="w-5 h-5 rounded overflow-hidden bg-black shrink-0">
                            <img src={item.gameScreenshot} alt="Proof" className="w-full h-full object-cover" />
                          </div>
                          <span>View Game Proof Screenshot 👁️</span>
                        </button>
                      ) : (
                        <div className="text-center py-2 text-[11px] text-gray-400 italic">
                          No Screenshot Attached
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleApproveCashout(item.id)}
                          className="py-2.5 px-3 rounded-xl text-white font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            background: 'linear-gradient(135deg, #10B981 0%, #00F0FF 100%)',
                            color: '#070514',
                            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <Check size={14} strokeWidth={3} />
                          <span className="truncate">Verify &amp; Pass</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectCashoutModal({ open: true, item, reason: '' })}
                          className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                          style={{
                            backgroundColor: 'rgba(244, 63, 94, 0.15)',
                            border: '1px solid rgba(244, 63, 94, 0.35)',
                            color: '#fda4af',
                          }}
                        >
                          <X size={14} />
                          <span className="truncate">Reject Note</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (Hidden on mobile) */}
                <div
                  className="hidden sm:block overflow-x-auto rounded-xl"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px', backgroundColor: '#070514' }}>
                    <colgroup>
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead style={{ backgroundColor: '#04020a', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Player</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Game Platform</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cashout Amount</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Screenshot Proof</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Method &amp; Cashtag</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date &amp; Time</th>
                        <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingCashouts.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(224, 38, 216, 0.02)' }}>
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{item.username}</p>
                            <span style={{ fontSize: '10.5px', color: '#9A91A8', fontFamily: 'monospace' }}>ID: {item.userId?.slice(-6)}</span>
                          </td>

                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 800,
                              }}
                            >
                              {item.gameTitle || 'Platform'}
                            </span>
                            {item.gameAccountUsername && (
                              <div style={{ fontSize: '10.5px', color: '#34D399', fontFamily: 'monospace', marginTop: '3px' }}>
                                @{item.gameAccountUsername}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(224, 38, 216, 0.15)',
                                border: '1px solid rgba(224, 38, 216, 0.4)',
                                color: '#F5D0FE',
                                fontSize: '13px',
                                fontWeight: 900,
                                fontFamily: 'monospace',
                              }}
                            >
                              ${Number(item.amount).toFixed(2)} SC
                            </span>
                          </td>

                          {/* Game Screenshot Proof with Thumbnail & Zoom modal */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            {item.gameScreenshot ? (
                              <button
                                type="button"
                                onClick={() => setScreenshotModal({ open: true, src: item.gameScreenshot, title: `${item.username} - ${item.gameTitle} Winning Proof` })}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(0, 240, 255, 0.12)',
                                  border: '1px solid rgba(0, 240, 255, 0.4)',
                                  color: '#00F0FF',
                                  cursor: 'pointer',
                                  fontSize: '11.5px',
                                  fontFamily: 'Lexend, sans-serif',
                                  fontWeight: 800,
                                }}
                              >
                                <div
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    backgroundColor: '#000',
                                    position: 'relative',
                                    flexShrink: 0,
                                  }}
                                >
                                  <img
                                    src={item.gameScreenshot}
                                    alt="Proof"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </div>
                                <span>View Proof 👁️</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#9A91A8', fontStyle: 'italic' }}>
                                No Screenshot
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF' }}>{item.payoutMethod}</div>
                            <span style={{ fontSize: '11px', color: '#FDE68A', fontFamily: 'monospace' }}>{item.destinationAddress}</span>
                          </td>

                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#CBD5E1', fontSize: '12px', fontWeight: 700 }}>
                              <Clock size={12} color="#9A91A8" />
                              <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#9A91A8' }}>
                              {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleApproveCashout(item.id)}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, #10B981 0%, #00F0FF 100%)',
                                  border: 'none',
                                  color: '#070514',
                                  fontSize: '12px',
                                  fontFamily: 'Lexend, sans-serif',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                                }}
                              >
                                <Check size={14} strokeWidth={3} />
                                <span>Verify &amp; Pass</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setRejectCashoutModal({ open: true, item, reason: '' })}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                  border: '1px solid rgba(244, 63, 94, 0.35)',
                                  color: '#fda4af',
                                  fontSize: '12px',
                                  fontFamily: 'Lexend, sans-serif',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <X size={14} />
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* B. Processed Cashout History (BOTTOM) */}
          <div
            className="rounded-2xl p-6 sm:p-8 shadow-2xl"
            style={{
              backgroundColor: '#0E0A24',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-7">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm sm:text-base font-black text-white m-0 tracking-wide" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    Previous Cashout Verifications
                  </h3>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold font-mono"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#9A91A8',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    {historyCashouts.length} Records
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-[#9A91A8] mt-1.5" style={{ fontFamily: 'Lexend, sans-serif' }}>
                  History of verified proofs forwarded to finance desk or rejected with notes
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { key: 'all', label: 'All Records', color: '#E026D8' },
                  { key: 'verified', label: 'Verified Only', color: '#10B981' },
                  { key: 'rejected', label: 'Rejected Only', color: '#F43F5E' },
                ].map(({ key, label, color }) => {
                  const isActive = cashoutFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCashoutFilter(key)}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
                      style={
                        isActive
                          ? {
                              backgroundColor: `${color}25`,
                              border: `1.5px solid ${color}`,
                              color: '#FFFFFF',
                              boxShadow: `0 0 15px ${color}40`,
                              fontFamily: 'Lexend, sans-serif',
                            }
                          : {
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#9A91A8',
                              fontFamily: 'Lexend, sans-serif',
                            }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {historyCashouts.length === 0 ? (
              <div
                style={{
                  padding: '60px 24px',
                  textAlign: 'center',
                  backgroundColor: '#070514',
                  borderRadius: '18px',
                  border: '1px dashed rgba(255, 255, 255, 0.14)',
                  color: '#9A91A8',
                  fontSize: '13px',
                  fontFamily: 'Lexend, sans-serif',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto',
                  }}
                >
                  <Clock size={26} color="#9A91A8" style={{ opacity: 0.8 }} />
                </div>
                <p style={{ margin: 0, fontWeight: 900, color: '#FFFFFF', fontSize: '15px' }}>No processed cashout verifications found.</p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748B' }}>Logs of verified or rejected screenshot reviews will appear here.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View for History */}
                <div className="block sm:hidden space-y-2.5">
                  {historyCashouts.map((item) => {
                    const isRejected = item.status === 'rejected_by_coin' || item.status === 'rejected';
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl text-xs space-y-2"
                        style={{
                          backgroundColor: '#070514',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="m-0 font-bold text-white text-xs">{item.username}</p>
                            <span className="text-[10px] text-gray-400 font-mono">ID: {item.userId?.slice(-6)}</span>
                          </div>
                          <span
                            className="px-2.5 py-0.5 rounded-lg text-xs font-black font-mono"
                            style={{
                              backgroundColor: 'rgba(224, 38, 216, 0.15)',
                              color: '#F5D0FE',
                              border: '1px solid rgba(224, 38, 216, 0.35)',
                            }}
                          >
                            ${Number(item.amount).toFixed(2)} SC
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-300">
                          <span className="font-semibold text-white/90">{item.gameTitle}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          {isRejected ? (
                            <div>
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
                                style={{
                                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                  color: '#fda4af',
                                  border: '1px solid rgba(244, 63, 94, 0.4)',
                                }}
                              >
                                <XCircle size={11} />
                                <span>REJECTED BY COIN DESK</span>
                              </span>
                              {item.rejectReason && (
                                <p className="m-0 mt-1 text-[10px] text-rose-300/80 italic">
                                  &quot;{item.rejectReason}&quot;
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
                                style={{
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#6ee7b7',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                }}
                              >
                                <CheckCircle2 size={11} />
                                <span>{item.status === 'approved' ? 'PAID & DISPATCHED' : 'PASSED TO FINANCE'}</span>
                              </span>
                              {item.coinApprovedBy && (
                                <p className="m-0 mt-0.5 text-[9.5px] text-gray-400">
                                  Verified by {item.coinApprovedBy}
                                </p>
                              )}
                            </div>
                          )}

                          {item.gameScreenshot && (
                            <button
                              type="button"
                              onClick={() => setScreenshotModal({ open: true, src: item.gameScreenshot, title: `${item.username} - Proof` })}
                              className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold shrink-0 cursor-pointer"
                              style={{
                                backgroundColor: 'rgba(0, 240, 255, 0.12)',
                                border: '1px solid rgba(0, 240, 255, 0.35)',
                                color: '#00F0FF',
                              }}
                            >
                              Proof 👁️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div
                  className="hidden sm:block overflow-x-auto rounded-xl"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px', backgroundColor: '#070514' }}>
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead style={{ backgroundColor: '#04020a', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Player</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Game Platform</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proof</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status &amp; Reason Note</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#9A91A8', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Processed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyCashouts.map((item) => {
                        const isRejected = item.status === 'rejected_by_coin' || item.status === 'rejected';
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                              <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF' }}>{item.username}</p>
                              <span style={{ fontSize: '10.5px', color: '#9A91A8', fontFamily: 'monospace' }}>ID: {item.userId?.slice(-6)}</span>
                            </td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '12px', color: '#E2E8F0', fontWeight: 700 }}>
                              {item.gameTitle}
                            </td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '12.5px', color: '#E026D8', fontWeight: 800, fontFamily: 'monospace' }}>
                              ${Number(item.amount).toFixed(2)} SC
                            </td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                              {item.gameScreenshot ? (
                                <button
                                  type="button"
                                  onClick={() => setScreenshotModal({ open: true, src: item.gameScreenshot, title: `${item.username} - Proof` })}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(0, 240, 255, 0.12)',
                                    border: '1px solid rgba(0, 240, 255, 0.35)',
                                    color: '#00F0FF',
                                    fontSize: '11px',
                                    fontFamily: 'Lexend, sans-serif',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  View Proof 👁️
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#64748B' }}>None</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {isRejected ? (
                                <div>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                      color: '#fda4af',
                                      border: '1px solid rgba(244, 63, 94, 0.4)',
                                      fontSize: '11px',
                                      fontWeight: 900,
                                    }}
                                  >
                                    <XCircle size={12} />
                                    <span>REJECTED BY COIN DESK</span>
                                  </span>
                                  {item.rejectReason && (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#fca5a5', fontStyle: 'italic' }}>
                                      &quot;{item.rejectReason}&quot;
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                      color: '#6ee7b7',
                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                      fontSize: '11px',
                                      fontWeight: 900,
                                    }}
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>{item.status === 'approved' ? 'PAID & DISPATCHED' : 'PASSED TO FINANCE'}</span>
                                  </span>
                                  {item.coinApprovedBy && (
                                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#9A91A8' }}>
                                      Verified by {item.coinApprovedBy}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px', color: '#9A91A8', fontFamily: 'monospace' }}>
                              {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* 1. Approve Game Load Modal */}
      {approveLoadModal.open && (
        <div
          className="vegas-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(5, 3, 15, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setApproveLoadModal({ open: false, item: null, username: '', password: '' })}
        >
          <div
            className="vegas-modal-card w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-scrollable relative space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0E0A24',
              background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
              border: '1px solid rgba(0, 240, 255, 0.45)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.25)',
              borderRadius: '20px',
              fontFamily: 'Lexend, -apple-system, sans-serif',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#00F0FF]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(224, 38, 216, 0.15) 100%)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
                  }}
                >
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white m-0 tracking-wide">
                    Approve Game Load &amp; Deduct Balance
                  </h3>
                  <p className="text-[11px] text-gray-400 m-0">Confirm credentials and credit sweepstakes portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApproveLoadModal({ open: false, item: null, username: '', password: '' })}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="rounded-xl p-3.5 space-y-2 text-xs"
              style={{
                backgroundColor: 'rgba(0, 240, 255, 0.08)',
                border: '1px solid rgba(0, 240, 255, 0.25)',
              }}
            >
              <div className="flex justify-between">
                <span className="text-gray-400">Player:</span>
                <strong className="text-white">{approveLoadModal.item?.userName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Game Platform:</span>
                <strong className="text-[#00F0FF]">{approveLoadModal.item?.gameTitle}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10">
                <span className="text-gray-300 font-bold">Transfer Deduct Amount:</span>
                <strong className="text-[#00F0FF] text-sm font-mono">
                  ${Number(approveLoadModal.item?.transferAmount || 0).toFixed(2)} SC
                </strong>
              </div>
            </div>

            <form onSubmit={handleApproveLoadSubmit} className="space-y-4">
              {/* Editable Coin Amount Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[#FBBF24] uppercase tracking-wider">
                    Coins to Load / Deduct ($ SC) — Editable
                  </label>
                  <span className="text-[10.5px] text-gray-400">
                    Requested: <strong className="text-white">${Number(approveLoadModal.item?.transferAmount || 0).toFixed(2)} SC</strong>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[#00F0FF] font-black text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={approveLoadModal.transferAmount}
                    onChange={(e) => setApproveLoadModal({ ...approveLoadModal, transferAmount: e.target.value })}
                    required
                    className="w-full rounded-xl pl-8 pr-3.5 py-2.5 text-white font-mono font-black text-sm outline-none transition-all focus:border-[#00F0FF]"
                    style={{
                      backgroundColor: '#070514',
                      border: '1.5px solid rgba(0, 240, 255, 0.45)',
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  You can adjust this coin load amount. Exactly this amount will be deducted from player's balance.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">
                  Game Account Username / ID
                </label>
                <input
                  type="text"
                  value={approveLoadModal.username}
                  onChange={(e) => setApproveLoadModal({ ...approveLoadModal, username: e.target.value })}
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all"
                  style={{
                    backgroundColor: '#070514',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                  }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">
                  Game Account Password / PIN
                </label>
                <input
                  type="text"
                  value={approveLoadModal.password}
                  onChange={(e) => setApproveLoadModal({ ...approveLoadModal, password: e.target.value })}
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all"
                  style={{
                    backgroundColor: '#070514',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setApproveLoadModal({ open: false, item: null, username: '', password: '', transferAmount: 0 })}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #00F0FF 0%, #00d0e8 40%, #E026D8 100%)',
                    color: '#070514',
                    boxShadow: '0 0 25px rgba(0, 240, 255, 0.45)',
                    border: 'none',
                  }}
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Confirm &amp; Deduct</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Reject Game Load Modal (Mandatory Note) */}
      {rejectLoadModal.open && (
        <div
          className="vegas-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(5, 3, 15, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setRejectLoadModal({ open: false, item: null, reason: '' })}
        >
          <div
            className="vegas-modal-card w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-scrollable relative space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0E0A24',
              background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
              border: '1px solid rgba(244, 63, 94, 0.45)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(244, 63, 94, 0.25)',
              borderRadius: '20px',
              fontFamily: 'Lexend, -apple-system, sans-serif',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-400"
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    boxShadow: '0 0 15px rgba(244, 63, 94, 0.25)',
                  }}
                >
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white m-0 tracking-wide">
                    Reject Game Load Request
                  </h3>
                  <p className="text-[11px] text-gray-400 m-0">Provide explanatory note to player</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectLoadModal({ open: false, item: null, reason: '' })}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed m-0">
              Admin rejection requires a mandatory note explaining the reason to the player (e.g. game server maintenance, invalid player name, or insufficient deposit).
            </p>

            <form onSubmit={handleRejectLoadSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-rose-400 mb-1 uppercase tracking-wider">
                  Reason Note (Displayed to User) *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Game portal maintenance in progress. Please retry in 15 minutes."
                  value={rejectLoadModal.reason}
                  onChange={(e) => setRejectLoadModal({ ...rejectLoadModal, reason: e.target.value })}
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all resize-none"
                  style={{
                    backgroundColor: '#070514',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRejectLoadModal({ open: false, item: null, reason: '' })}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
                    border: 'none',
                  }}
                >
                  <X size={14} strokeWidth={3} />
                  <span>Reject &amp; Send Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Reject Cashout Modal (Mandatory Note) */}
      {rejectCashoutModal.open && (
        <div
          className="vegas-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(5, 3, 15, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setRejectCashoutModal({ open: false, item: null, reason: '' })}
        >
          <div
            className="vegas-modal-card w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-scrollable relative space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0E0A24',
              background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
              border: '1px solid rgba(244, 63, 94, 0.45)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(244, 63, 94, 0.25)',
              borderRadius: '20px',
              fontFamily: 'Lexend, -apple-system, sans-serif',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-400"
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    boxShadow: '0 0 15px rgba(244, 63, 94, 0.25)',
                  }}
                >
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white m-0 tracking-wide">
                    Reject Game Cashout Proof
                  </h3>
                  <p className="text-[11px] text-gray-400 m-0">Unfreeze funds and notify player</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectCashoutModal({ open: false, item: null, reason: '' })}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed m-0">
              Enter reason for rejecting this cashout (e.g. screenshot score does not match game panel, expired session, or unverified win). Funds will be unfrozen and returned to the player.
            </p>

            <form onSubmit={handleRejectCashoutSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-rose-400 mb-1 uppercase tracking-wider">
                  Rejection Note (Displayed to User) *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Screenshot timestamp expired or game score does not match platform record."
                  value={rejectCashoutModal.reason}
                  onChange={(e) => setRejectCashoutModal({ ...rejectCashoutModal, reason: e.target.value })}
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all resize-none"
                  style={{
                    backgroundColor: '#070514',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRejectCashoutModal({ open: false, item: null, reason: '' })}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
                    border: 'none',
                  }}
                >
                  <X size={14} strokeWidth={3} />
                  <span>Reject &amp; Unfreeze</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Full-screen Zoomable Game Screenshot Proof Modal */}
      {screenshotModal.open && (
        <div
          className="vegas-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(5, 3, 15, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setScreenshotModal({ open: false, src: null, title: '' })}
        >
          <div
            className="vegas-modal-card relative w-full max-w-4xl p-5 sm:p-6 max-h-[92vh] overflow-hidden flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0E0A24',
              background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
              border: '1.5px solid #00F0FF',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.3)',
              borderRadius: '20px',
              fontFamily: 'Lexend, -apple-system, sans-serif',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#00F0FF]"
                  style={{
                    backgroundColor: 'rgba(0, 240, 255, 0.15)',
                    border: '1px solid rgba(0, 240, 255, 0.35)',
                  }}
                >
                  <Eye size={16} />
                </div>
                <h4 className="m-0 text-sm sm:text-base font-black text-white">
                  {screenshotModal.title || 'Game Winning Proof'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setScreenshotModal({ open: false, src: null, title: '' })}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="overflow-auto rounded-xl flex items-center justify-center p-2"
              style={{
                backgroundColor: '#05030e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                maxHeight: '76vh',
              }}
            >
              <img
                src={screenshotModal.src}
                alt="Proof Full View"
                className="max-w-full max-h-[72vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
