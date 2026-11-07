'use client';

import React from 'react';
import { Volume2, VolumeX, Play, Check, X, Bell, Sparkles, Sliders } from 'lucide-react';
import { AVAILABLE_TUNES, playTune, unlockAudioContext } from '@/lib/soundAlerts';

export default function SoundSettingsModal({
  isOpen,
  onClose,
  selectedTune,
  onSelectTune,
  volume,
  onChangeVolume,
  soundEnabled,
  onToggleSound,
  onTestToast,
}) {
  if (!isOpen) return null;

  const handlePreview = (tuneId) => {
    unlockAudioContext();
    playTune(tuneId, volume);
  };

  const handleTestFullAlert = () => {
    unlockAudioContext();
    playTune(selectedTune, volume);
    if (onTestToast) {
      onTestToast({
        title: '🔔 New Deposit Alert (Preview)',
        message: '$50.00 USD from VIP player via Cash App',
        time: 'Just now',
      });
    }
  };

  return (
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
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="modal-scrollable"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid rgba(255, 215, 0, 0.35)',
          borderRadius: '24px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 40px rgba(255, 215, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          color: '#FFFFFF',
          fontFamily: 'Lexend, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-deep)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBF24',
                boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)',
                flexShrink: 0,
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Notification Sound &amp; Chime
                </h3>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255, 215, 0, 0.15)',
                    border: '1px solid rgba(255, 215, 0, 0.4)',
                    color: 'var(--neon-cyan)',
                    textTransform: 'uppercase',
                  }}
                >
                  Live Alerts
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                Tune plays automatically on incoming deposit, cashout &amp; account requests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-scrollable" style={{ padding: '18px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', backgroundColor: '#0d1024' }}>
          {/* Master Enable & Volume Controls Card */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '16px',
              backgroundColor: '#141832',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    unlockAudioContext();
                    onToggleSound(!soundEnabled);
                  }}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: soundEnabled ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                    border: `1px solid ${soundEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    color: soundEnabled ? '#34D399' : '#F87171',
                    cursor: 'pointer',
                  }}
                >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>Audio Notification Chime</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: soundEnabled ? '#34D399' : '#94A3B8' }}>
                    {soundEnabled ? '● Sound alerts enabled' : '○ Muted — visual toast alerts only'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  unlockAudioContext();
                  onToggleSound(!soundEnabled);
                }}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '9999px',
                  backgroundColor: soundEnabled ? '#10B981' : '#334155',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  padding: '2px',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    transform: soundEnabled ? 'translateX(22px)' : 'translateX(0px)',
                    transition: 'transform 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  }}
                />
              </button>
            </div>

            {/* Volume Slider Row */}
            <div
              style={{
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 800, color: '#CBD5E1', minWidth: '70px' }}>
                <Sliders size={13} color="#FBBF24" />
                <span>Volume:</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onChangeVolume(v);
                  unlockAudioContext();
                  playTune(selectedTune, v);
                }}
                style={{
                  flex: 1,
                  height: '6px',
                  accentColor: '#F59E0B',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#FBBF24', minWidth: '40px', textAlign: 'right' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Tune Selection Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#FBBF24" />
                Select Audio Chime
              </p>
              <span style={{ fontSize: '10.5px', color: '#64748B' }}>Click ▶ to test sound</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '10px' }}>
              {AVAILABLE_TUNES.map((tune) => {
                const isSelected = selectedTune === tune.id;
                return (
                  <div
                    key={tune.id}
                    onClick={() => {
                      unlockAudioContext();
                      onSelectTune(tune.id);
                      playTune(tune.id, volume);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : '#141832',
                      border: isSelected ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isSelected ? '0 0 16px rgba(245, 158, 11, 0.2)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{tune.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: isSelected ? '#FDE68A' : '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tune.name}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tune.desc}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(tune.id);
                        }}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#FBBF24',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Play preview"
                      >
                        <Play size={11} fill="currentColor" />
                      </button>

                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? '#F59E0B' : 'transparent',
                          border: isSelected ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#000000',
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--bg-deep)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleTestFullAlert}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid rgba(255, 215, 0, 0.35)',
              color: 'var(--neon-cyan)',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Bell size={13} color="var(--neon-cyan)" />
            <span>Test Sound &amp; Alert</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-coral"
            style={{
              padding: '9px 24px',
              borderRadius: '12px',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
            }}
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
