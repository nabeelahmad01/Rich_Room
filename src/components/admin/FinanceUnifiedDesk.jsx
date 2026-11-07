'use client';

import React, { useState } from 'react';
import {
  Search,
  Check,
  X,
  Copy,
  CheckCheck,
  RefreshCw,
  Coins,
  DollarSign,
  Wallet,
  Clock,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  CreditCard,
  History,
  CheckCircle2,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Maximize2,
} from 'lucide-react';

export default function FinanceUnifiedDesk({
  deposits = [],
  redemptions = [],
  paymentMethods = [],
  onApproveDeposit,
  onRejectDeposit,
  onApproveRedemption,
  onRejectRedemption,
  onRefresh,
  isRefreshing = false,
  customDepositSC = {},
  setCustomDepositSC,
  onAddMethod,
  onDeleteMethod,
  onToggleMethod,
}) {
  const [activeView, setActiveView] = useState('live_queue'); // 'live_queue' | 'deposit_history' | 'cashout_history' | 'methods'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [rejectDepositModal, setRejectDepositModal] = useState({ open: false, deposit: null, reason: '' });
  const [rejectRedeemModal, setRejectRedeemModal] = useState({ open: false, item: null, reason: '' });
  const [approvingId, setApprovingId] = useState(null);
  const [previewProof, setPreviewProof] = useState(null);

  // Instant close on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewProof(null);
        setRejectDepositModal({ open: false, deposit: null, reason: '' });
        setRejectRedeemModal({ open: false, item: null, reason: '' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pendingDeposits = deposits.filter((d) => d.status === 'pending');
  const historyDeposits = deposits.filter((d) => d.status !== 'pending');
  const pendingRedemptions = redemptions.filter((r) => r.status === 'pending');
  const historyRedemptions = redemptions.filter((r) => r.status !== 'pending');

  const filterItems = (list, isRedeem = false) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((item) => {
      const u = item.username?.toLowerCase() || '';
      const note = (isRedeem ? item.destinationAddress : item.senderNote || item.txHash)?.toLowerCase() || '';
      const method = (isRedeem ? item.payoutMethod : item.methodName)?.toLowerCase() || '';
      const amt = item.amount?.toString() || '';
      return u.includes(q) || note.includes(q) || method.includes(q) || amt.includes(q);
    });
  };

  const filteredPendingDeposits = filterItems(pendingDeposits, false);
  const filteredPendingRedemptions = filterItems(pendingRedemptions, true);
  const filteredHistoryDeposits = filterItems(historyDeposits, false);
  const filteredHistoryRedemptions = filterItems(historyRedemptions, true);

  const getMethodBadgeStyle = (methodName = '') => {
    const m = (methodName || '').toLowerCase();
    if (m.includes('cash') || m.includes('app')) {
      return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#34D399' };
    }
    if (m.includes('crypto') || m.includes('btc') || m.includes('bitcoin')) {
      return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#FBBF24' };
    }
    if (m.includes('zelle')) {
      return { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', text: '#C084FC' };
    }
    return { bg: 'rgba(255, 255, 255, 0.08)', border: 'rgba(255, 255, 255, 0.18)', text: '#E2E8F0' };
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Lexend, sans-serif' }}>
      {/* Top Header & Navigation Bar */}
      <div
        style={{
          backgroundColor: '#0E0824',
          border: '1px solid rgba(255, 215, 0, 0.25)',
          borderRadius: '20px',
          padding: '18px 22px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(255, 215, 0, 0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Financial Desk &amp; Payment Operations
            </h2>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 215, 0, 0.15)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                color: 'var(--neon-cyan)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--neon-cyan)' }} />
              Live Sync
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>
            Top Box: Pending Deposits Desk • Bottom Box: Pending Withdrawal / Cashout Desk
          </p>
        </div>

        {/* View Switcher Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px',
            backgroundColor: '#070415',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setActiveView('live_queue')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              background: activeView === 'live_queue' ? 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-purple) 45%, var(--neon-cyan) 100%)' : 'transparent',
              color: activeView === 'live_queue' ? '#FFFFFF' : '#94A3B8',
              boxShadow: activeView === 'live_queue' ? '0 4px 15px rgba(255, 215, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Coins size={14} />
            <span>Active Queue</span>
            {(pendingDeposits.length > 0 || pendingRedemptions.length > 0) && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  color: '#FFFFFF',
                  marginLeft: '4px',
                }}
              >
                {pendingDeposits.length + pendingRedemptions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('deposit_history')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              backgroundColor: activeView === 'deposit_history' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeView === 'deposit_history' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            <History size={13} />
            <span>Deposit History ({historyDeposits.length})</span>
          </button>

          <button
            onClick={() => setActiveView('cashout_history')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              backgroundColor: activeView === 'cashout_history' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeView === 'cashout_history' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            <Wallet size={13} />
            <span>Cashout History ({historyRedemptions.length})</span>
          </button>

          <button
            onClick={() => setActiveView('methods')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              backgroundColor: activeView === 'methods' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeView === 'methods' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            <CreditCard size={13} />
            <span>Gateways</span>
          </button>
        </div>
      </div>

      {/* Search & Quick Refresh Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#0c0f24',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 14px',
            backgroundColor: '#070914',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '340px',
            boxSizing: 'border-box',
          }}
        >
          <Search size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search player, Cashtag, TX..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '12px',
              color: '#FFFFFF',
              fontFamily: 'Lexend, sans-serif',
              outline: 'none',
              padding: 0,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#CBD5E1',
            fontSize: '12px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} color={isRefreshing ? '#F59E0B' : '#CBD5E1'} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* VIEW 1: ACTIVE LIVE QUEUE */}
      {activeView === 'live_queue' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* ============================================================== */}
          {/* ================= SECTION 1 (TOP): PENDING DEPOSITS =========== */}
          {/* ============================================================== */}
          <div
            style={{
              backgroundColor: '#0c0f24',
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '20px',
              padding: '22px',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.08)',
              marginBottom: '32px',
            }}
          >
            {/* Box Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(245, 158, 11, 0.18)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FBBF24',
                    boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <Coins size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Pending Deposit Requests
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '2px 9px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        border: '1px solid rgba(245, 158, 11, 0.5)',
                        color: '#FDE68A',
                        fontFamily: 'monospace',
                      }}
                    >
                      {pendingDeposits.length} PENDING
                    </span>
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                    Player incoming deposits requiring verification &amp; SC wallet crediting
                  </p>
                </div>
              </div>
            </div>

            {/* Table or Empty State */}
            {filteredPendingDeposits.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#070914',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px',
                }}
              >
                <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 10px auto', opacity: 0.8 }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>No pending deposit requests</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                  All incoming deposits have been reviewed. When a player submits a deposit, it will ring and show here immediately.
                </p>
              </div>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  width: '100%',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px', backgroundColor: 'var(--bg-deep)' }}>
                  <thead style={{ backgroundColor: '#050711', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                    <tr>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Game &amp; Account</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deposit USD</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coins to Credit</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cashtag / Note</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Screenshot / Receipt</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date &amp; Time</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingDeposits.map((d) => {
                      const depositId = d.id || d._id;
                      const calculatedSC = Number(
                        d.totalSC !== undefined ? d.totalSC : d.amount + (d.bonusSC || 0)
                      ).toFixed(2);
                      const bonusType = d.bonusType || 'welcome';
                      const bonusPercent = d.bonusPercent ?? (bonusType === 'welcome' ? 300 : 50);
                      const bonusSC = Number(
                        d.bonusSC !== undefined ? d.bonusSC : (d.amount * bonusPercent) / 100
                      ).toFixed(2);
                      const calculatedGC = (d.totalGC || d.amount * 10000).toLocaleString();
                      const scToCredit =
                        customDepositSC[depositId] !== undefined ? customDepositSC[depositId] : calculatedSC;
                      const methodStyle = getMethodBadgeStyle(d.methodName);
                      const note = d.senderNote || d.txHash;

                      return (
                        <tr
                          key={depositId}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            backgroundColor: 'rgba(245, 158, 11, 0.03)',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* 1. Player */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                  fontSize: '12px',
                                  color: '#FFFFFF',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {d.username ? d.username.charAt(0) : 'U'}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{d.username}</p>
                                <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
                                  ID: {d.userId?.slice(-6) || depositId?.slice(-6)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Game & Account */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            {d.gameTitle ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--neon-cyan)' }}>
                                  🎮 {d.gameTitle}
                                </span>
                                {d.gameAccountUsername ? (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontFamily: 'monospace',
                                      color: '#34D399',
                                      backgroundColor: 'rgba(16, 185, 129, 0.14)',
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      width: 'fit-content',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                    }}
                                  >
                                    ID: @{d.gameAccountUsername}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '9.5px',
                                      fontWeight: 800,
                                      color: '#FBBF24',
                                      backgroundColor: 'rgba(245, 158, 11, 0.14)',
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      width: 'fit-content',
                                      border: '1px solid rgba(245, 158, 11, 0.35)',
                                    }}
                                  >
                                    ⚡ No Account (Auto Queues ID)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#64748B' }}>Direct Top-up</span>
                            )}
                          </td>

                          {/* 3. Deposit USD */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: '#FDE68A',
                                fontWeight: 900,
                                fontSize: '13px',
                                fontFamily: 'monospace',
                              }}
                            >
                              <span>${Number(d.amount).toFixed(2)}</span>
                              <span style={{ fontSize: '9.5px', color: '#F59E0B' }}>USD</span>
                            </div>
                          </td>

                          {/* 3. Coins to Credit */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '180px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 900, color: '#34D399', fontSize: '13px', fontFamily: 'monospace' }}>
                                  {calculatedSC} SC
                                </span>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 900,
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    backgroundColor: bonusType === 'welcome' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                    color: bonusType === 'welcome' ? 'var(--neon-cyan)' : '#C084FC',
                                    border: `1px solid ${bonusType === 'welcome' ? 'rgba(255, 215, 0, 0.35)' : 'rgba(168, 85, 247, 0.35)'}`,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  +{bonusPercent}% {bonusType}
                                </span>
                              </div>
                              <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                                Base: ${d.amount} + Bonus: ${bonusSC} SC
                              </span>

                              {/* Editable Input Box */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginTop: '3px',
                                  padding: '3px 8px',
                                  backgroundColor: '#070914',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  width: 'fit-content',
                                }}
                              >
                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>To Credit:</span>
                                <div style={{ display: 'flex', alignItems: 'center', color: '#34D399', fontWeight: 900, fontSize: '12px', fontFamily: 'monospace' }}>
                                  <span>$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={scToCredit}
                                    onChange={(e) =>
                                      setCustomDepositSC({ ...customDepositSC, [depositId]: e.target.value })
                                    }
                                    style={{
                                      width: '60px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      color: '#34D399',
                                      fontSize: '12px',
                                      fontWeight: 900,
                                      outline: 'none',
                                      padding: '0 4px',
                                      fontFamily: 'monospace',
                                    }}
                                  />
                                  <span>SC</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 4. Method */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '10px',
                                backgroundColor: methodStyle.bg,
                                border: `1px solid ${methodStyle.border}`,
                                color: methodStyle.text,
                                fontSize: '11.5px',
                                fontWeight: 800,
                              }}
                            >
                              {d.methodName}
                            </span>
                          </td>

                          {/* 5. Cashtag / Reference */}
                          <td style={{ padding: '14px 16px' }}>
                            {note ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '11.5px',
                                    color: '#FDE68A',
                                    backgroundColor: '#070914',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    maxWidth: '140px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {note}
                                </span>
                                <button
                                  onClick={() => handleCopy(note, depositId)}
                                  style={{
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: '#CBD5E1',
                                    cursor: 'pointer',
                                  }}
                                  title="Copy Cashtag"
                                >
                                  {copiedId === depositId ? <CheckCheck size={12} color="#10B981" /> : <Copy size={12} />}
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>None provided</span>
                            )}
                          </td>

                          {/* 6. Screenshot / Receipt Proof */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            {(() => {
                              const proofSrc = d.proofImage || d.proofUrl || d.receiptImage || d.screenshot || (d.hasProof ? `/api/payments/deposit/proof?id=${depositId}` : null);
                              return proofSrc ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewProof({
                                        image: proofSrc,
                                        username: d.username,
                                        amount: d.amount,
                                        method: d.methodName,
                                        note: note,
                                        date: d.createdAt,
                                      })
                                    }
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '5px 10px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(255, 215, 0, 0.15)',
                                      border: '1px solid rgba(255, 215, 0, 0.4)',
                                      color: 'var(--neon-cyan)',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                    }}
                                    title="Click to view full screenshot proof"
                                  >
                                    <Eye size={12} />
                                    <span>View Proof</span>
                                  </button>

                                  <div
                                    onClick={() =>
                                      setPreviewProof({
                                        image: proofSrc,
                                        username: d.username,
                                        amount: d.amount,
                                        method: d.methodName,
                                        note: note,
                                        date: d.createdAt,
                                      })
                                    }
                                    style={{
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255, 215, 0, 0.4)',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                      backgroundColor: '#000000',
                                    }}
                                    title="Thumbnail preview"
                                  >
                                    <img
                                      src={proofSrc}
                                      alt="Proof"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>No receipt</span>
                              );
                            })()}
                          </td>

                          {/* 7. Date & Time (Placed right before Actions!) */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FFFFFF', fontWeight: 700, fontSize: '12px' }}>
                              <Clock size={12} color="#94A3B8" />
                              <span>{formatRelativeTime(d.createdAt)}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                              {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(d.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                onClick={async () => {
                                  setApprovingId(depositId);
                                  try {
                                    await onApproveDeposit(depositId, scToCredit);
                                  } finally {
                                    setApprovingId(null);
                                  }
                                }}
                                disabled={approvingId === depositId}
                                style={{
                                  padding: '7px 14px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                  border: 'none',
                                  color: '#000000',
                                  fontSize: '11.5px',
                                  fontWeight: 900,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                }}
                              >
                                {approvingId === depositId ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Check size={13} strokeWidth={3} />
                                )}
                                <span>Approve ({scToCredit} SC)</span>
                              </button>

                              <button
                                onClick={() => setRejectDepositModal({ open: true, deposit: d, reason: '' })}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  color: '#F87171',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* ================= SECTION 2 (BOTTOM): PENDING CASHOUTS ======== */}
          {/* ============================================================== */}
          <div
            style={{
              backgroundColor: '#0c0f24',
              border: '1.5px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '20px',
              padding: '22px',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(168, 85, 247, 0.08)',
            }}
          >
            {/* Box Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(168, 85, 247, 0.18)',
                    border: '1px solid rgba(168, 85, 247, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C084FC',
                    boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)',
                  }}
                >
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Pending Withdrawal / Cashout Requests
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '2px 9px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                        border: '1px solid rgba(168, 85, 247, 0.5)',
                        color: '#E9D5FF',
                        fontFamily: 'monospace',
                      }}
                    >
                      {pendingRedemptions.length} PENDING
                    </span>
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                    Player cashout payouts requiring administrator dispatch &amp; verification
                  </p>
                </div>
              </div>
            </div>

            {/* Table or Empty State */}
            {filteredPendingRedemptions.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#070914',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px',
                }}
              >
                <CheckCircle2 size={32} color="var(--neon-purple)" style={{ margin: '0 auto 10px auto', opacity: 0.8 }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>No pending cashout requests</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                  When a player requests a redemption / cashout, it will appear here instantly with an audio alert.
                </p>
              </div>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  width: '100%',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px', backgroundColor: 'var(--bg-deep)' }}>
                  <thead style={{ backgroundColor: '#050711', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                    <tr>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Game &amp; Account</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Redeem Amount</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payout Method</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination Address / Cashtag</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Payment QR Code</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date &amp; Time</th>
                      <th style={{ padding: '14px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingRedemptions.map((r) => {
                      const redeemId = r.id || r._id;
                      return (
                        <tr
                          key={redeemId}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            backgroundColor: 'rgba(168, 85, 247, 0.03)',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* 1. Player */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--neon-purple) 0%, #3B82F6 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                  fontSize: '12px',
                                  color: '#FFFFFF',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {r.username ? r.username.charAt(0) : 'U'}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{r.username}</p>
                                <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
                                  ID: {r.userId?.slice(-6) || redeemId?.slice(-6)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Game Platform & Verified ID */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#C084FC' }}>
                                🎮 {r.gameTitle || 'Game'}
                              </span>
                              {r.gameAccountUsername ? (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    color: '#34D399',
                                    backgroundColor: 'rgba(16, 185, 129, 0.14)',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    width: 'fit-content',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                  }}
                                >
                                  ID: @{r.gameAccountUsername}
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', color: '#94A3B8' }}>Verified Platform</span>
                              )}
                            </div>
                          </td>

                          {/* 3. Redeem Amount */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                color: '#E9D5FF',
                                fontWeight: 900,
                                fontSize: '13px',
                                fontFamily: 'monospace',
                              }}
                            >
                              ${Number(r.amount).toFixed(2)} SC
                            </span>
                          </td>

                          {/* 3. Payout Method */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                color: '#FFFFFF',
                                fontSize: '11.5px',
                                fontWeight: 800,
                              }}
                            >
                              {r.payoutMethod || 'Direct'}
                            </span>
                          </td>

                          {/* 4. Destination Address */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '11.5px',
                                  color: '#FDE68A',
                                  backgroundColor: '#070914',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {r.destinationAddress}
                              </span>
                              <button
                                onClick={() => handleCopy(r.destinationAddress, redeemId)}
                                style={{
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  color: '#CBD5E1',
                                  cursor: 'pointer',
                                }}
                                title="Copy Address"
                              >
                                {copiedId === redeemId ? <CheckCheck size={12} color="#10B981" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>

                          {/* 5. User Payment QR Code (Clickable Preview) */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            {r.qrCodeImage ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewProof({
                                    image: r.qrCodeImage,
                                    url: r.qrCodeImage,
                                    title: `${r.username}'s ${r.payoutMethod || 'Payment'} QR Code`,
                                    username: r.username,
                                    player: r.username,
                                    amount: r.amount,
                                    method: r.payoutMethod || 'Direct Payment',
                                    note: r.destinationAddress,
                                    date: r.createdAt,
                                  })
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  color: '#34D399',
                                  cursor: 'pointer',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                }}
                              >
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    backgroundColor: '#000',
                                    flexShrink: 0,
                                  }}
                                >
                                  <img
                                    src={r.qrCodeImage}
                                    alt="QR"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </div>
                                <span>Scan QR Code 📷</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                                Manual Address
                              </span>
                            )}
                          </td>

                          {/* 5. Date & Time (Placed right before Actions!) */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FFFFFF', fontWeight: 700, fontSize: '12px' }}>
                              <Clock size={12} color="#94A3B8" />
                              <span>{formatRelativeTime(r.createdAt)}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                              {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </td>

                          {/* 6. Actions */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                onClick={() => onApproveRedemption(redeemId)}
                                style={{
                                  padding: '7px 14px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, var(--neon-purple) 0%, #7C3AED 100%)',
                                  border: 'none',
                                  color: '#FFFFFF',
                                  fontSize: '11.5px',
                                  fontWeight: 900,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
                                }}
                              >
                                <Check size={13} strokeWidth={3} />
                                <span>Mark Dispatched</span>
                              </button>

                              <button
                                onClick={() => setRejectRedeemModal({ open: true, item: r, reason: '' })}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  color: '#F87171',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Reject &amp; Refund
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: COMPLETED DEPOSIT HISTORY */}
      {activeView === 'deposit_history' && (
        <div
          style={{
            backgroundColor: '#0c0f24',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#FFFFFF' }}>
              Deposit Transaction History ({historyDeposits.length})
            </h3>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px', backgroundColor: 'var(--bg-deep)' }}>
              <thead style={{ backgroundColor: '#050711', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Player</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Game &amp; Account</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Deposit Amount</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Coins Credited</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Method</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Cashtag/TX</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Receipt Proof</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Date &amp; Time</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryDeposits.map((d) => {
                  const depositId = d.id || d._id;
                  const note = d.senderNote || d.txHash;
                  return (
                    <tr key={depositId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFFFFF', fontSize: '12px' }}>{d.username}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--neon-cyan)', display: 'block' }}>
                          {d.gameTitle || 'Direct'}
                        </span>
                        {d.gameAccountUsername && (
                          <span style={{ fontSize: '10px', color: '#34D399', fontFamily: 'monospace' }}>
                            @{d.gameAccountUsername}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 900, color: '#FBBF24', fontSize: '12px' }}>${d.amount} USD</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#34D399', fontSize: '12px' }}>
                        {d.creditedSC ? `${Number(d.creditedSC).toFixed(2)} SC` : `${d.totalSC || d.amount} SC`}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#E2E8F0', fontSize: '12px' }}>{d.methodName}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#94A3B8', fontSize: '11.5px' }}>{note || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          const proofSrc = d.proofImage || d.proofUrl || d.receiptImage || d.screenshot || (d.hasProof ? `/api/payments/deposit/proof?id=${d.id || d._id}` : null);
                          return proofSrc ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewProof({
                                  image: proofSrc,
                                  username: d.username,
                                  amount: d.amount,
                                  method: d.methodName,
                                  note: note,
                                  date: d.createdAt,
                                })
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255, 215, 0, 0.12)',
                                border: '1px solid rgba(255, 215, 0, 0.35)',
                                color: 'var(--neon-cyan)',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              <Eye size={11} />
                              <span>View</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748B' }}>—</span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '11.5px' }}>{new Date(d.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '10px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            backgroundColor: d.status === 'approved' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                            color: d.status === 'approved' ? '#34D399' : '#F87171',
                            border: `1px solid ${d.status === 'approved' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          }}
                        >
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: COMPLETED CASHOUT HISTORY */}
      {activeView === 'cashout_history' && (
        <div
          style={{
            backgroundColor: '#0c0f24',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#FFFFFF' }}>
              Cashout / Redemption History ({historyRedemptions.length})
            </h3>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px', backgroundColor: 'var(--bg-deep)' }}>
              <thead style={{ backgroundColor: '#050711', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Player</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Game &amp; Account</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Redeem Amount</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Payout Method</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Destination</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Date &amp; Time</th>
                  <th style={{ padding: '12px 16px', fontSize: '10.5px', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryRedemptions.map((r) => {
                  const redeemId = r.id || r._id;
                  return (
                    <tr key={redeemId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFFFFF', fontSize: '12px' }}>{r.username}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '12px', color: '#C084FC', display: 'block' }}>
                          {r.gameTitle || 'Game'}
                        </span>
                        {r.gameAccountUsername && (
                          <span style={{ fontSize: '10px', color: '#34D399', fontFamily: 'monospace' }}>
                            @{r.gameAccountUsername}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 900, color: '#C084FC', fontSize: '12px' }}>${r.amount} SC</td>
                      <td style={{ padding: '12px 16px', color: '#E2E8F0', fontSize: '12px' }}>{r.payoutMethod || 'Direct'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#94A3B8', fontSize: '11.5px' }}>{r.destinationAddress}</td>
                      <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '11.5px' }}>{new Date(r.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '10px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            backgroundColor: r.status === 'approved' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                            color: r.status === 'approved' ? '#34D399' : '#F87171',
                            border: `1px solid ${r.status === 'approved' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: PAYMENT METHODS CONFIG */}
      {activeView === 'methods' && (
        <div
          style={{
            backgroundColor: '#0c0f24',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#FFFFFF' }}>
              Active Payment Gateways &amp; Methods ({paymentMethods.length})
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {paymentMethods.map((m) => (
              <div
                key={m.id || m._id}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: '#141832',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{m.name}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>{m.accountNumber || m.address || 'Standard account'}</p>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: m.enabled !== false ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: m.enabled !== false ? '#34D399' : '#F87171',
                    border: `1px solid ${m.enabled !== false ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  }}
                >
                  {m.enabled !== false ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Screenshot Proof Modal */}
      {previewProof && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(3, 4, 10, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setPreviewProof(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              backgroundColor: '#0d1024',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.95), 0 0 40px rgba(255, 215, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              color: '#FFFFFF',
              maxHeight: '92vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '12px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{previewProof.title || 'Payment Screenshot Receipt'}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#FDE68A',
                    }}
                  >
                    ${previewProof.amount} USD
                  </span>
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                  Uploaded by <strong style={{ color: 'var(--neon-cyan)' }}>{previewProof.username || previewProof.player || 'Player'}</strong> via {previewProof.method || 'Transfer'}{' '}
                  {previewProof.note ? `• Cashtag/TX: ${previewProof.note}` : ''}
                </p>
              </div>
              <button
                onClick={() => setPreviewProof(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Image Box */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#050711',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '12px',
                minHeight: '260px',
                maxHeight: '65vh',
              }}
            >
              <img
                src={previewProof.image || previewProof.url || previewProof.proofUrl || previewProof.qrCodeImage}
                alt="Payment Proof Receipt"
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = document.getElementById('receipt-image-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id="receipt-image-fallback"
                style={{
                  display: 'none',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '24px',
                  color: '#94A3B8',
                  textAlign: 'center',
                }}
              >
                <AlertCircle size={32} color="#F59E0B" />
                <p style={{ margin: 0, fontSize: '12.5px', color: '#F1F5F9', fontWeight: 700 }}>
                  Image proof preview unavailable
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>
                  The uploaded proof could not be rendered directly.
                </p>
                {(previewProof.image || previewProof.url) && (
                  <a
                    href={previewProof.image || previewProof.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--neon-cyan)', fontSize: '11.5px', marginTop: '6px', textDecoration: 'underline' }}
                  >
                    Open Image in New Window ↗
                  </a>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Uploaded: {previewProof.date ? new Date(previewProof.date).toLocaleString() : 'Just now'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={previewProof.image || previewProof.url}
                  target="_blank"
                  rel="noreferrer"
                  download={`receipt-${previewProof.username || previewProof.player || 'player'}.png`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 215, 0, 0.15)',
                    border: '1px solid rgba(255, 215, 0, 0.4)',
                    color: 'var(--neon-cyan)',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ExternalLink size={12} />
                  <span>Open Full Size</span>
                </a>
                <button
                  onClick={() => setPreviewProof(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Deposit Modal */}
      {rejectDepositModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(3, 4, 10, 0.88)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#0d1024',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              padding: '22px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.95)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              color: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171' }}>
                <AlertTriangle size={20} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#FFFFFF' }}>Reject Deposit Request</h3>
              </div>
              <button
                onClick={() => setRejectDepositModal({ open: false, deposit: null, reason: '' })}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
              Rejecting deposit of <strong style={{ color: '#FFFFFF' }}>${rejectDepositModal.deposit?.amount} USD</strong> for{' '}
              <strong style={{ color: '#FDE68A' }}>{rejectDepositModal.deposit?.username}</strong>.
            </p>
            <textarea
              rows={3}
              value={rejectDepositModal.reason}
              onChange={(e) => setRejectDepositModal({ ...rejectDepositModal, reason: e.target.value })}
              placeholder="Enter rejection reason for player..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: '#141832',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '12px',
                color: '#FFFFFF',
                fontFamily: 'Lexend, sans-serif',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px' }}>
              <button
                onClick={() => setRejectDepositModal({ open: false, deposit: null, reason: '' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const depId = rejectDepositModal.deposit.id || rejectDepositModal.deposit._id;
                  const reason = rejectDepositModal.reason || 'Payment details could not be verified.';
                  // Close modal instantly in 0ms!
                  setRejectDepositModal({ open: false, deposit: null, reason: '' });
                  onRejectDeposit(depId, reason);
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Redemption Modal */}
      {rejectRedeemModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(3, 4, 10, 0.88)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#0d1024',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              padding: '22px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.95)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              color: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171' }}>
                <AlertTriangle size={20} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#FFFFFF' }}>Reject &amp; Refund Cashout</h3>
              </div>
              <button
                onClick={() => setRejectRedeemModal({ open: false, item: null, reason: '' })}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
              Rejecting cashout of <strong style={{ color: '#E9D5FF' }}>${rejectRedeemModal.item?.amount} SC</strong> for{' '}
              <strong style={{ color: '#FFFFFF' }}>{rejectRedeemModal.item?.username}</strong>. Coins will be refunded to balance.
            </p>
            <textarea
              rows={3}
              value={rejectRedeemModal.reason}
              onChange={(e) => setRejectRedeemModal({ ...rejectRedeemModal, reason: e.target.value })}
              placeholder="Enter rejection reason (e.g. Invalid cashtag)..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: '#141832',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '12px',
                color: '#FFFFFF',
                fontFamily: 'Lexend, sans-serif',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px' }}>
              <button
                onClick={() => setRejectRedeemModal({ open: false, item: null, reason: '' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const redId = rejectRedeemModal.item.id || rejectRedeemModal.item._id;
                  const reason = rejectRedeemModal.reason || 'Cashout rejected. Coins refunded to player balance.';
                  // Close modal instantly in 0ms!
                  setRejectRedeemModal({ open: false, item: null, reason: '' });
                  onRejectRedemption(redId, reason);
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                }}
              >
                Refund Coins &amp; Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
