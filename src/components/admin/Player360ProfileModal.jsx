'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Copy,
  DollarSign,
  Plus,
  Minus,
  Key,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Users,
  Gamepad2,
  History,
  Sparkles,
  Eye,
  MessageSquare,
  Send,
  MessageCircle,
} from 'lucide-react';

export default function Player360ProfileModal({
  userId,
  onClose,
  onUserUpdated,
  onOpenChat,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [copiedField, setCopiedField] = useState(null);

  // Balance adjustment state
  const [adjustMode, setAdjustMode] = useState('add'); // 'add' | 'deduct'
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustFeedback, setAdjustFeedback] = useState(null);

  // Direct Message modal state
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState(null);

  // Receipt popup preview
  const [previewImage, setPreviewImage] = useState(null);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const cleanText = messageText.trim();
    if (!cleanText || sendingMessage) return;

    setSendingMessage(true);
    setMessageFeedback(null);

    const targetUid = data?.user?._id?.toString() || data?.user?.id || userId;
    const targetUname = data?.user?.username || 'Player';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: String(targetUid),
          targetUserId: String(targetUid),
          targetUsername: targetUname,
          text: cleanText,
          isStaffReply: true,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setMessageFeedback({
          type: 'success',
          text: `Message delivered! Real-time notification & in-app chat sent to @${targetUname}.`,
        });
        setMessageText('');
        setTimeout(() => {
          setChatModalOpen(false);
          setMessageFeedback(null);
        }, 2000);
      } else {
        setMessageFeedback({
          type: 'error',
          text: resData.error || resData.message || 'Failed to send message.',
        });
      }
    } catch (err) {
      setMessageFeedback({
        type: 'error',
        text: err.message || 'Network error occurred.',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users?userId=${encodeURIComponent(userId)}`);
      const d = await res.json();
      if (d.success) {
        setData(d);
      } else {
        alert(d.error || 'Failed to load user profile');
      }
    } catch (err) {
      console.error('Fetch player 360 error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const copyText = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApplyAdjustment = async (e) => {
    e?.preventDefault();
    const val = parseFloat(adjustAmount);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    const finalAmount = adjustMode === 'deduct' ? -val : val;
    setIsAdjusting(true);
    setAdjustFeedback(null);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          action: 'adjustBalance',
          balanceAdjustment: finalAmount,
          reason: adjustReason.trim() || (adjustMode === 'add' ? 'Manual VIP Allotment' : 'Manual Balance Deduction'),
        }),
      });
      const d = await res.json();
      if (d.success) {
        setAdjustFeedback({ type: 'success', message: d.message || 'Balance updated successfully!' });
        setAdjustAmount('');
        setAdjustReason('');
        setData(prev => ({
          ...prev,
          user: { ...prev.user, balanceSC: d.newBalance },
        }));
        if (onUserUpdated) onUserUpdated(data.user.id, d.newBalance);
        fetchProfile();
      } else {
        setAdjustFeedback({ type: 'error', message: d.error || 'Failed to update balance' });
      }
    } catch (err) {
      setAdjustFeedback({ type: 'error', message: err.message });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleResetPassword = async () => {
    const newPass = prompt(`Enter new password for ${data?.user?.username} (minimum 6 characters):`);
    if (!newPass) return;
    if (newPass.length < 6) return alert('Password must be at least 6 characters');
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id, action: 'resetPassword', newPassword: newPass }),
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message || 'Password reset successfully');
      } else {
        alert(d.error || 'Failed to reset password');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnbindDevice = async () => {
    if (!window.confirm(`Clear hardware device lock for player "${data?.user?.username}"?`)) return;
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id, action: 'resetDevice' }),
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message || 'Device binding cleared');
        setData(prev => ({ ...prev, user: { ...prev.user, deviceId: null } }));
        if (onUserUpdated) onUserUpdated(data.user.id, data.user.balanceSC);
      } else {
        alert(d.error || 'Failed to unbind device');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleBan = async () => {
    const actionText = data?.user?.isBanned ? 'unban and reactivate' : 'ban and suspend';
    if (!window.confirm(`Are you sure you want to ${actionText} player "${data?.user?.username}"?`)) return;
    const reason = prompt('Reason for action:', data?.user?.isBanned ? 'Account cleared' : 'Terms violation');
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id, action: 'toggleBan', reason }),
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message || `Account ${d.isBanned ? 'banned' : 'unbanned'}`);
        setData(prev => ({ ...prev, user: { ...prev.user, isBanned: d.isBanned } }));
        if (onUserUpdated) onUserUpdated(data.user.id, data.user.balanceSC);
      } else {
        alert(d.error || 'Action failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (!userId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(3, 2, 10, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '92vh',
          backgroundColor: '#0c081e',
          border: '1px solid rgba(255, 215, 0, 0.35)',
          borderRadius: '24px',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.95), 0 0 50px rgba(255, 215, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#FFFFFF',
          fontFamily: 'Lexend, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. TOP HEADER BAR */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: 'var(--bg-deep)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(245, 158, 11, 0.25))',
                border: '1px solid rgba(255, 215, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '20px',
                color: 'var(--neon-cyan)',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.2)',
                flexShrink: 0,
              }}
            >
              {data?.user?.username?.substring(0, 2).toUpperCase() || 'P'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {data?.user?.username || 'Player Profile'}
                </h2>
                {data?.user?.isBanned ? (
                  <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 900, backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#F43F5E', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
                    BANNED ACCOUNT
                  </span>
                ) : (
                  <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 900, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                    ACTIVE PLAYER
                  </span>
                )}
                {data?.user?.deviceId && (
                  <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(255, 215, 0, 0.12)', color: 'var(--neon-cyan)', border: '1px solid rgba(255, 215, 0, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Smartphone size={11} /> Bound Device
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '12px', color: '#9A91A8', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', color: '#E2DCEB' }}>{data?.user?.email}</span>
                <span>•</span>
                <span>Joined: {data?.user?.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : 'N/A'}</span>
                {data?.user?.referralCode && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>
                      Code: {data.user.referralCode}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Direct Message Player Button (Placed directly to the left of Refresh) */}
            <button
              type="button"
              onClick={() => {
                setChatModalOpen(true);
                setMessageFeedback(null);
              }}
              title={`Send Direct Message to @${data?.user?.username || 'Player'}`}
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                color: 'var(--neon-cyan)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                letterSpacing: '0.2px',
                boxShadow: '0 0 12px rgba(255, 215, 0, 0.12)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.28) 0%, rgba(16, 185, 129, 0.28) 100%)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 215, 0, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.12)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <MessageSquare size={14} />
              <span>Message Player</span>
            </button>

            <button
              type="button"
              onClick={fetchProfile}
              title="Refresh Player Data"
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#CBD5E1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. HERO BALANCE & ADJUSTMENT CONSOLE (CLEAN DARK PALETTE) */}
        {data?.user && (
          <div
            style={{
              padding: '20px 24px',
              backgroundColor: '#110c29',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            {/* Left: Prominent Pure SC Balance Card */}
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: 'rgba(7, 5, 20, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '18px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(16, 185, 129, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={13} />
                  <span>PURE SC CASH BALANCE</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#34D399', fontFamily: 'monospace', marginTop: '4px', textShadow: '0 0 25px rgba(16, 185, 129, 0.35)' }}>
                  ${Number(data.user.balanceSC || 0).toFixed(2)}{' '}
                  <span style={{ fontSize: '14px', color: '#10B981', fontFamily: 'Lexend, sans-serif', fontWeight: 800 }}>SC</span>
                </div>
                <div style={{ fontSize: '11px', color: '#9A91A8', marginTop: '2px' }}>
                  Active platform liquidity for sweepstakes games
                </div>
              </div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981',
                }}
              >
                <DollarSign size={24} />
              </div>
            </div>

            {/* Right: Balance Adjuster (Kam / Zyada krna) */}
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: 'rgba(7, 5, 20, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <form onSubmit={handleApplyAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setAdjustMode('add')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: adjustMode === 'add' ? '#10B981' : 'rgba(255, 255, 255, 0.05)',
                        color: adjustMode === 'add' ? 'var(--bg-deep)' : '#9A91A8',
                        border: 'none',
                        boxShadow: adjustMode === 'add' ? '0 0 16px rgba(16, 185, 129, 0.5)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={13} /> Add Coins (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustMode('deduct')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: adjustMode === 'deduct' ? '#F43F5E' : 'rgba(255, 255, 255, 0.05)',
                        color: adjustMode === 'deduct' ? '#FFFFFF' : '#9A91A8',
                        border: 'none',
                        boxShadow: adjustMode === 'deduct' ? '0 0 16px rgba(244, 63, 94, 0.5)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Minus size={13} /> Deduct Coins (-)
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {[10, 25, 50, 100, 250].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAdjustAmount(String(amt))}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255, 215, 0, 0.08)',
                          border: '1px solid rgba(255, 215, 0, 0.2)',
                          color: 'var(--neon-cyan)',
                          fontSize: '10px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Amount ($ SC)"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    required
                    style={{
                      flex: '1 1 120px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      backgroundColor: '#161033',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Audit Reason / Note (Optional)"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    style={{
                      flex: '2 1 180px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      backgroundColor: '#161033',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '12px',
                      backgroundColor: adjustMode === 'add' ? '#10B981' : '#F43F5E',
                      color: adjustMode === 'add' ? 'var(--bg-deep)' : '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: adjustMode === 'add' ? '0 4px 14px rgba(16, 185, 129, 0.4)' : '0 4px 14px rgba(244, 63, 94, 0.4)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isAdjusting ? 'Updating...' : adjustMode === 'add' ? 'Credit Balance' : 'Deduct Balance'}
                  </button>
                </div>

                {adjustFeedback && (
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: adjustFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                      color: adjustFeedback.type === 'success' ? '#34D399' : '#FDA4AF',
                      border: adjustFeedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)',
                    }}
                  >
                    {adjustFeedback.message}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* 3. NAVIGATION SUB-TABS */}
        <div
          style={{
            backgroundColor: 'var(--bg-deep)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'overview', label: 'Overview & KPIs', icon: Sparkles, count: null },
            { id: 'deposits', label: 'Deposits History', icon: ArrowDownLeft, count: data?.deposits?.length },
            { id: 'withdrawals', label: 'Cashouts / Withdrawals', icon: ArrowUpRight, count: data?.withdrawals?.length },
            { id: 'games', label: 'Game Accounts', icon: Gamepad2, count: data?.gameAccounts?.length },
            { id: 'referrals', label: 'Player Referrals', icon: Users, count: data?.referrals?.length },
            { id: 'ledger', label: 'Audit Ledger', icon: History, count: data?.ledger?.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  padding: '14px 16px',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: isActive ? 'var(--neon-cyan)' : '#9A91A8',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--neon-cyan)' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count !== undefined && (
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: 900,
                      backgroundColor: isActive ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: isActive ? 'var(--neon-cyan)' : '#CBD5E1',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4. MAIN SCROLLABLE CONTENT */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#0A071B' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#9A91A8' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid rgba(255, 215, 0, 0.2)',
                  borderTopColor: 'var(--neon-cyan)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 14px',
                }}
              />
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                Loading player intelligence...
              </p>
            </div>
          ) : !data ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9A91A8', fontSize: '13px' }}>
              Failed to load player data.
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & KPIS */}
              {activeSubTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* KPI Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                    <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: '#130E2E', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: '#9A91A8' }}>Total Deposited</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#34D399', fontFamily: 'monospace', marginTop: '4px' }}>
                        ${Number(data.stats?.totalDepositsAmount || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9A91A8', marginTop: '2px' }}>{data.stats?.depositsCount || 0} approved deposits</div>
                    </div>

                    <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: '#130E2E', border: '1px solid rgba(255, 215, 0, 0.25)' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: '#9A91A8' }}>Total Cashed Out</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--neon-cyan)', fontFamily: 'monospace', marginTop: '4px' }}>
                        ${Number(data.stats?.totalWithdrawalsAmount || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9A91A8', marginTop: '2px' }}>{data.stats?.withdrawalsCount || 0} completed redemptions</div>
                    </div>

                    <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: '#130E2E', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: '#9A91A8' }}>Net Platform Margin</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: (data.stats?.netMargin || 0) >= 0 ? '#A7F3D0' : '#FDA4AF', fontFamily: 'monospace', marginTop: '4px' }}>
                        ${Number(data.stats?.netMargin || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9A91A8', marginTop: '2px' }}>Deposits minus Cashouts</div>
                    </div>

                    <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: '#130E2E', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, color: '#9A91A8' }}>Player Referrals</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace', marginTop: '4px' }}>
                        {data.stats?.referralsCount || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9A91A8', marginTop: '2px' }}>Directly invited players</div>
                    </div>
                  </div>

                  {/* Two Column Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))', gap: '16px' }}>
                    {/* Account Security Box */}
                    <div style={{ padding: '18px 20px', borderRadius: '18px', backgroundColor: '#130E2E', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '12px', fontWeight: 900, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} /> Account Security &amp; Compliance
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px' }}>
                          <span style={{ color: '#9A91A8' }}>Player ID:</span>
                          <span style={{ fontFamily: 'monospace', color: '#E2DCEB', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {data.user.id}
                            <button type="button" onClick={() => copyText(data.user.id, 'id')} style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer' }}>
                              <Copy size={11} />
                            </button>
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px' }}>
                          <span style={{ color: '#9A91A8' }}>Hardware Device Binding:</span>
                          <span style={{ fontFamily: 'monospace', color: data.user.deviceId ? '#34D399' : '#94A3B8', fontWeight: 700 }}>
                            {data.user.deviceId ? `${data.user.deviceId.substring(0, 16)}...` : 'Unbound'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px' }}>
                          <span style={{ color: '#9A91A8' }}>Referred By:</span>
                          <span style={{ fontWeight: 700, color: '#E2DCEB' }}>{data.user.referredBy || 'Organic / None'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#9A91A8' }}>Personal Referral Code:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#FBBF24' }}>{data.user.referralCode || 'None'}</span>
                        </div>
                      </div>

                      {/* Security Action Buttons with Clear Labels */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.35)',
                            color: '#D8B4FE',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontFamily: 'Lexend, sans-serif',
                          }}
                        >
                          <Key size={12} />
                          <span>Reset Password</span>
                        </button>

                        {data.user.deviceId && (
                          <button
                            type="button"
                            onClick={handleUnbindDevice}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(14, 165, 233, 0.15)',
                              border: '1px solid rgba(14, 165, 233, 0.35)',
                              color: '#7DD3FC',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontFamily: 'Lexend, sans-serif',
                            }}
                          >
                            <Smartphone size={12} />
                            <span>Unbind Device</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleToggleBan}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            backgroundColor: data.user.isBanned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                            border: data.user.isBanned ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(244, 63, 94, 0.35)',
                            color: data.user.isBanned ? '#34D399' : '#FDA4AF',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontFamily: 'Lexend, sans-serif',
                          }}
                        >
                          <ShieldCheck size={12} />
                          <span>{data.user.isBanned ? 'Unban Player' : 'Ban Player'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Linked Game Accounts Box */}
                    <div style={{ padding: '18px 20px', borderRadius: '18px', backgroundColor: '#130E2E', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '12px', fontWeight: 900, color: 'var(--neon-purple)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Gamepad2 size={14} /> Active Game Portals ({data.gameAccounts?.length || 0})
                      </h4>
                      {data.gameAccounts?.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#9A91A8', margin: '20px 0' }}>No dedicated game platform accounts created yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {data.gameAccounts.slice(0, 4).map(acc => (
                            <div key={acc.id} style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: 'rgba(7, 5, 20, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '12px' }}>{acc.gameTitle}</div>
                                <div style={{ fontSize: '11px', color: '#9A91A8', fontFamily: 'monospace' }}>User: {acc.username}</div>
                              </div>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 900, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                READY
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DEPOSITS HISTORY */}
              {activeSubTab === 'deposits' && (
                <div>
                  {data.deposits?.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9A91A8', backgroundColor: '#130E2E', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      No deposit records found for this player.
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#130E2E', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead style={{ backgroundColor: 'var(--bg-deep)', color: '#9A91A8', textTransform: 'uppercase', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Amount ($ SC)</th>
                            <th style={{ padding: '12px 16px' }}>Payment Method</th>
                            <th style={{ padding: '12px 16px' }}>Reference / TxHash</th>
                            <th style={{ padding: '12px 16px' }}>Proof Receipt</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Date &amp; Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.deposits.map(d => (
                            <tr key={d.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 900, color: '#34D399', fontSize: '13px' }}>
                                ${Number(d.amount).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFFFFF' }}>{d.methodName}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#9A91A8' }}>
                                {d.txHash || d.senderNote || '—'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {d.proofImage ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage(d.proofImage)}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(255, 215, 0, 0.12)',
                                      border: '1px solid rgba(255, 215, 0, 0.35)',
                                      color: 'var(--neon-cyan)',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <Eye size={12} /> View Receipt
                                  </button>
                                ) : (
                                  <span style={{ color: '#64748B' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: '9999px',
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    backgroundColor: d.status === 'APPROVED' || d.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : d.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: d.status === 'APPROVED' || d.status === 'COMPLETED' ? '#34D399' : d.status === 'REJECTED' ? '#FDA4AF' : '#FDE68A',
                                    border: d.status === 'APPROVED' || d.status === 'COMPLETED' ? '1px solid rgba(16, 185, 129, 0.4)' : d.status === 'REJECTED' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                  }}
                                >
                                  {d.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#9A91A8', fontSize: '11px' }}>
                                {d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* TAB 3: CASHOUTS / WITHDRAWALS HISTORY */}
              {activeSubTab === 'withdrawals' && (
                <div>
                  {data.withdrawals?.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9A91A8', backgroundColor: '#130E2E', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      No cashout records found for this player.
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#130E2E', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead style={{ backgroundColor: 'var(--bg-deep)', color: '#9A91A8', textTransform: 'uppercase', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Amount ($ SC)</th>
                            <th style={{ padding: '12px 16px' }}>Game Title</th>
                            <th style={{ padding: '12px 16px' }}>Payout Method</th>
                            <th style={{ padding: '12px 16px' }}>Cashtag / Destination</th>
                            <th style={{ padding: '12px 16px' }}>Game Win Proof</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Date &amp; Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.withdrawals.map(w => (
                            <tr key={w.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 900, color: 'var(--neon-cyan)', fontSize: '13px' }}>
                                ${Number(w.amount).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFFFFF' }}>{w.gameTitle}</td>
                              <td style={{ padding: '12px 16px', color: '#E2DCEB', fontWeight: 700 }}>{w.payoutMethod}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#FFFFFF', fontSize: '11px' }}>
                                {w.destinationAddress || '—'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {w.gameScreenshot ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage(w.gameScreenshot)}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                      border: '1px solid rgba(245, 158, 11, 0.35)',
                                      color: 'var(--neon-purple)',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <Eye size={12} /> Win Proof
                                  </button>
                                ) : (
                                  <span style={{ color: '#64748B' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: '9999px',
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    backgroundColor: w.status === 'COMPLETED' || w.status === 'PAID' ? 'rgba(16, 185, 129, 0.2)' : w.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: w.status === 'COMPLETED' || w.status === 'PAID' ? '#34D399' : w.status === 'REJECTED' ? '#FDA4AF' : '#FDE68A',
                                    border: w.status === 'COMPLETED' || w.status === 'PAID' ? '1px solid rgba(16, 185, 129, 0.4)' : w.status === 'REJECTED' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                  }}
                                >
                                  {w.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#9A91A8', fontSize: '11px' }}>
                                {w.createdAt ? new Date(w.createdAt).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* TAB 4: GAME ACCOUNTS */}
              {activeSubTab === 'games' && (
                <div>
                  {data.gameAccounts?.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9A91A8', backgroundColor: '#130E2E', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      No game platform accounts created yet for this user.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '14px' }}>
                      {data.gameAccounts.map(g => (
                        <div key={g.id} style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: '#130E2E', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 900, color: '#FFFFFF', fontSize: '14px' }}>{g.gameTitle}</span>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 900, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                              READY
                            </span>
                          </div>
                          <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: 'rgba(7, 5, 20, 0.7)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#9A91A8' }}>Username:</span>
                              <span style={{ fontFamily: 'monospace', color: 'var(--neon-cyan)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {g.username}
                                <button type="button" onClick={() => copyText(g.username, `u-${g.id}`)} style={{ background: 'none', border: 'none', color: '#9A91A8', cursor: 'pointer' }}>
                                  {copiedField === `u-${g.id}` ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                                </button>
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#9A91A8' }}>Password:</span>
                              <span style={{ fontFamily: 'monospace', color: 'var(--neon-purple)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {g.password}
                                <button type="button" onClick={() => copyText(g.password, `p-${g.id}`)} style={{ background: 'none', border: 'none', color: '#9A91A8', cursor: 'pointer' }}>
                                  {copiedField === `p-${g.id}` ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                                </button>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: REFERRALS */}
              {activeSubTab === 'referrals' && (
                <div>
                  {data.referrals?.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9A91A8', backgroundColor: '#130E2E', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      This player has not referred any players yet.
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#130E2E', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', minWidth: '580px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead style={{ backgroundColor: 'var(--bg-deep)', color: '#9A91A8', textTransform: 'uppercase', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Player</th>
                            <th style={{ padding: '12px 16px' }}>Email</th>
                            <th style={{ padding: '12px 16px' }}>Current Balance</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Joined Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.referrals.map(ref => (
                            <tr key={ref.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 800, color: '#FFFFFF' }}>{ref.username}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#9A91A8' }}>{ref.email}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 900, color: '#34D399' }}>
                                ${Number(ref.balanceSC || 0).toFixed(2)} SC
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#9A91A8', fontSize: '11px' }}>
                                {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : 'Recent'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* TAB 6: AUDIT LEDGER */}
              {activeSubTab === 'ledger' && (
                <div>
                  {data.ledger?.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9A91A8', backgroundColor: '#130E2E', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      No ledger adjustments recorded for this player yet.
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#130E2E', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead style={{ backgroundColor: 'var(--bg-deep)', color: '#9A91A8', textTransform: 'uppercase', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Action Type</th>
                            <th style={{ padding: '12px 16px' }}>Amount</th>
                            <th style={{ padding: '12px 16px' }}>Balance After</th>
                            <th style={{ padding: '12px 16px' }}>Audit Reason</th>
                            <th style={{ padding: '12px 16px' }}>Processed By</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.ledger.map(l => (
                            <tr key={l.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    backgroundColor: String(l.type).includes('CREDIT') || String(l.type).includes('allotment') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                    color: String(l.type).includes('CREDIT') || String(l.type).includes('allotment') ? '#34D399' : '#FDA4AF',
                                  }}
                                >
                                  {l.type}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 900, color: '#FFFFFF' }}>
                                ${Number(l.amount || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 900, color: '#34D399' }}>
                                ${Number(l.balanceAfter || 0).toFixed(2)} SC
                              </td>
                              <td style={{ padding: '12px 16px', color: '#E2DCEB' }}>
                                {l.reason || 'Manual Adjustment'}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--neon-cyan)', fontWeight: 800 }}>
                                {l.processedBy}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: '#9A91A8', fontSize: '11px' }}>
                                {l.createdAt ? new Date(l.createdAt).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 5. FOOTER */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--bg-deep)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#9A91A8',
          }}
        >
          <div>
            Player Management: <strong style={{ color: '#FFFFFF' }}>{data?.user?.username}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Close Profile
          </button>
        </div>
      </div>

      {/* POPUP IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            backgroundColor: 'rgba(2, 1, 6, 0.95)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              maxWidth: '650px',
              width: '100%',
              backgroundColor: '#0c081e',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
                Document Proof Preview
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{ background: 'none', border: 'none', color: '#9A91A8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ maxHeight: '75vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage} alt="Document Proof" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px' }} />
            </div>
          </div>
        </div>
      )}

      {/* 8. DIRECT MESSAGE TO PLAYER MODAL */}
      {chatModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100001,
            backgroundColor: 'rgba(5, 3, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => {
            if (!sendingMessage) setChatModalOpen(false);
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#0c081e',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 215, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                    border: '1px solid rgba(255, 215, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--neon-cyan)',
                  }}
                >
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.3px' }}>
                    Send Message to <span style={{ color: 'var(--neon-cyan)' }}>@{data?.user?.username || 'Player'}</span>
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                    Instant VIP Concierge reply with device push & in-app chat delivery
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!sendingMessage) setChatModalOpen(false);
                }}
                disabled={sendingMessage}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendMessage} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Quick Template Chips */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Quick Response Templates:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    `🎉 Hi @${data?.user?.username || 'Player'}, your bonus has been credited to your wallet!`,
                    `✅ Hi @${data?.user?.username || 'Player'}, your payment was verified and approved.`,
                    `🎮 Hi @${data?.user?.username || 'Player'}, your game platform account credentials are ready!`,
                    `⚠️ Hi @${data?.user?.username || 'Player'}, please upload a clearer screenshot of your payment receipt.`,
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessageText(preset)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#CBD5E1',
                        fontSize: '11px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
                        e.currentTarget.style.color = 'var(--neon-cyan)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = '#CBD5E1';
                      }}
                    >
                      {preset.split(',')[0]}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Message Content
                  </label>
                  <span style={{ fontSize: '10.5px', color: '#64748B', fontFamily: 'monospace' }}>
                    {messageText.length} / 2000
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Write an official concierge message to @${data?.user?.username || 'player'}...`}
                  maxLength={2000}
                  disabled={sendingMessage}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-deep)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(255, 215, 0, 0.6)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                />
              </div>

              {/* Feedback Alert */}
              {messageFeedback && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor:
                      messageFeedback.type === 'success'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${
                      messageFeedback.type === 'success'
                        ? 'rgba(16, 185, 129, 0.4)'
                        : 'rgba(239, 68, 68, 0.4)'
                    }`,
                    color: messageFeedback.type === 'success' ? '#10B981' : '#EF4444',
                  }}
                >
                  {messageFeedback.type === 'success' ? <Check size={16} /> : <X size={16} />}
                  <span>{messageFeedback.text}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '6px' }}>
                <div>
                  {onOpenChat && (
                    <button
                      type="button"
                      onClick={() => {
                        setChatModalOpen(false);
                        onOpenChat(data?.user || { _id: userId, username: data?.user?.username });
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#94A3B8',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ArrowUpRight size={13} />
                      <span>Open Full Chat Desk</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setChatModalOpen(false)}
                    disabled={sendingMessage}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94A3B8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendingMessage}
                    style={{
                      padding: '9px 20px',
                      borderRadius: '10px',
                      background: (!messageText.trim() || sendingMessage)
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'linear-gradient(135deg, var(--neon-cyan) 0%, #10B981 100%)',
                      border: 'none',
                      color: (!messageText.trim() || sendingMessage) ? '#64748B' : 'var(--bg-deep)',
                      fontSize: '12px',
                      fontWeight: 900,
                      letterSpacing: '0.5px',
                      cursor: (!messageText.trim() || sendingMessage) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: (!messageText.trim() || sendingMessage) ? 'none' : '0 0 15px rgba(255, 215, 0, 0.4)',
                    }}
                  >
                    {sendingMessage ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
