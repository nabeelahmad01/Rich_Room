'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Gamepad2,
  Sparkles
} from 'lucide-react';
import { fetchJsonWithTimeout } from '@/lib/fetchWithTimeout';
import { mergePlayerUser } from '@/lib/authClient';

export default function LoadCoinsModal({
  isOpen,
  onClose,
  game,
  user,
  onSuccess,
}) {
  const [loadAmount, setLoadAmount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const availableBalance = user
    ? Math.max(0, Number((user.balanceSC || 0) - (user.frozenBalance || 0)))
    : 0;

  const frozenBalance = user ? Math.max(0, Number(user.frozenBalance || 0)) : 0;

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (availableBalance > 0) {
        setLoadAmount(Math.min(20, availableBalance));
      } else {
        setLoadAmount(0);
      }
    }
  }, [isOpen, availableBalance]);

  if (!isOpen || !game) return null;

  const gameTitle = game.title || game.name || 'Game Platform';
  const gameId = game.gameId || game.id || game._id;

  const presetAmounts = [10, 20, 50, 100];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const amt = Number(loadAmount);
    if (!amt || amt <= 0) {
      setErrorMsg('Please enter a valid amount greater than $0.');
      return;
    }

    if (amt > availableBalance) {
      setErrorMsg(`Cannot load $${amt.toFixed(2)} SC. Your available balance is only $${availableBalance.toFixed(2)} SC.`);
      return;
    }

    setLoading(true);
    const priorBalance = Number(user?.balanceSC || 0);
    const optimisticBalance = Math.max(0, Number((priorBalance - amt).toFixed(2)));
    if (user) {
      const merged = mergePlayerUser({ balanceSC: optimisticBalance, balance: optimisticBalance }, user);
      window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: merged }));
    }
    window.dispatchEvent(new CustomEvent('balanceUpdate'));

    try {
      const { res, data } = await fetchJsonWithTimeout(
        '/api/account-requests',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameTitle,
            gameId,
            gameAccountUsername: game.username || game.gameAccountUsername || '',
            requestType: 'COIN_LOAD',
            transferAmount: amt,
            userEmail: user?.email,
            userName: user?.username,
          }),
        },
        45000
      );

      if (res.ok && data.success) {
        setSuccessMsg(`🎉 $${amt.toFixed(2)} SC deducted from your wallet and submitted to Coin Desk for ${gameTitle}!`);
        try {
          const bChan = new BroadcastChannel('paradise_balance_sync');
          bChan.postMessage({ type: 'BALANCE_UPDATED', time: Date.now() });
          bChan.close();
        } catch {}
        try {
          localStorage.setItem('paradise_user_balance_sync', String(Date.now()));
        } catch {}
        window.dispatchEvent(new CustomEvent('balanceUpdated'));
        if (onSuccess) onSuccess(data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        if (user) {
          const merged = mergePlayerUser({ balanceSC: priorBalance, balance: priorBalance }, user);
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: merged }));
        }
        setErrorMsg(data.message || data.error || 'Failed to submit load request.');
      }
    } catch (err) {
      if (user) {
        const merged = mergePlayerUser({ balanceSC: priorBalance, balance: priorBalance }, user);
        window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: merged }));
      }
      setErrorMsg(err?.message || 'Network error. Could not submit load request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 4, 10, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-scrollable p-4 sm:p-6"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--chrome-border)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px var(--neon-cyan-glow)',
          color: '#FFFFFF',
          fontFamily: 'Lexend, sans-serif',
          maxHeight: '92vh',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'var(--neon-cyan-glow)',
                border: '1px solid var(--chrome-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--neon-cyan)',
              }}
            >
              <Coins size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
                Load Coins into Game
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--neon-cyan)', fontWeight: 700 }}>
                {gameTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9A91A8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Balance Overview Box */}
        <div
          style={{
            backgroundColor: 'var(--bg-deep)',
            border: '1px solid var(--chrome-border)',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9A91A8', fontWeight: 800 }}>
              Available Wallet Balance
            </span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--neon-cyan)', marginTop: '2px' }}>
              ${availableBalance.toFixed(2)} <span style={{ fontSize: '12px', color: '#CBD5E1' }}>SC</span>
            </div>
          </div>

          {frozenBalance > 0 && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#F59E0B', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <Lock size={10} />
                In Escrow
              </span>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#FDE68A', marginTop: '2px' }}>
                ${frozenBalance.toFixed(2)} SC
              </div>
            </div>
          )}
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FCA5A5',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#A7F3D0',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {availableBalance <= 0 ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: '13px', color: '#FCA5A5', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Your available balance is $0.00 SC. Please make a deposit or wait for pending cashouts to complete before loading coins into games.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = '/deposit';
              }}
              className="btn-sovereign-coral"
              style={{ width: '100%', padding: '12px' }}
            >
              MAKE A DEPOSIT
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Amount Selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: 900, color: '#C8C1D4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Amount to Load ($ SC)
                </label>
                <button
                  type="button"
                  onClick={() => setLoadAmount(availableBalance)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00F0FF',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  LOAD MAX (${availableBalance.toFixed(2)})
                </button>
              </div>

              {/* Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {presetAmounts.map((amt) => {
                  const disabled = amt > availableBalance;
                  const isSel = loadAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      disabled={disabled}
                      onClick={() => setLoadAmount(amt)}
                      style={{
                        padding: '10px 0',
                        borderRadius: '10px',
                        border: isSel ? '2px solid var(--neon-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: isSel ? 'var(--neon-cyan-glow)' : 'var(--bg-deep)',
                        color: disabled ? '#555' : isSel ? 'var(--neon-cyan)' : '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 900,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.4 : 1,
                      }}
                    >
                      ${amt}
                    </button>
                  );
                })}
              </div>

              {/* Exact Input */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--neon-cyan)', fontWeight: 900, fontSize: '16px' }}>
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={availableBalance}
                  value={loadAmount}
                  onChange={(e) => setLoadAmount(Math.min(availableBalance, Number(e.target.value)))}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-deep)',
                    border: '1.5px solid var(--chrome-border)',
                    borderRadius: '12px',
                    padding: '12px 14px 12px 32px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 900,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Escrow Rule Note */}
            <div
              style={{
                backgroundColor: 'var(--neon-cyan-glow)',
                border: '1px solid var(--chrome-border)',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '11px',
                color: '#CBD5E1',
                lineHeight: 1.4,
              }}
            >
              <Lock size={14} color="var(--neon-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Escrow Security:</strong> When you submit, ${Number(loadAmount || 0).toFixed(2)} SC will be temporarily frozen until staff approves the load into your {gameTitle} player ID. If rejected, coins are immediately returned to your available balance.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadAmount <= 0 || loadAmount > availableBalance}
              style={{
                width: '100%',
                background: 'var(--primary-gradient)',
                color: '#030712',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 0 15px var(--neon-cyan-glow)',
                cursor: loading || loadAmount <= 0 || loadAmount > availableBalance ? 'not-allowed' : 'pointer',
                padding: '14px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: loadAmount <= 0 || loadAmount > availableBalance ? 0.6 : 1,
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>FREEZING ESCROW &amp; SUBMITTING...</span>
                </>
              ) : (
                <>
                  <Coins size={16} />
                  <span>LOAD ${Number(loadAmount || 0).toFixed(2)} SC INTO {gameTitle.toUpperCase()}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
