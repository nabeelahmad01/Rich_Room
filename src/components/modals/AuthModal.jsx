'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  Lock,
  Mail,
  User,
  Gift,
  Eye,
  EyeOff,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Coins
} from 'lucide-react';
import { getOrCreateDeviceId } from '@/lib/deviceClient';
import { writeCachedPlayer } from '@/lib/playerSessionCache';

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'login',
  onAuthSuccess,
  onSuccess,
}) {
  const [tab, setTab] = useState(initialTab);
  const [regStep, setRegStep] = useState('details'); // 'details' | 'otp'
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [state, setState] = useState('CA');
  const [ageVerified, setAgeVerified] = useState(true);
  const [otp, setOtp] = useState('');
  const [otpSentMsg, setOtpSentMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    setTab(initialTab);
    setRegStep('details');
    setErrorMsg(null);
    setSuccessMsg(null);
    setOtp('');

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlRef = sp.get('ref') || sp.get('referralCode') || sp.get('referrer');
      if (urlRef) {
        const clean = urlRef.trim().toUpperCase();
        setReferralCode(clean);
        setShowReferralInput(true);
        try {
          localStorage.setItem('paradise_ref_code', clean);
          sessionStorage.setItem('paradise_ref_code', clean);
        } catch {}
      } else {
        try {
          const stored = localStorage.getItem('paradise_ref_code') || sessionStorage.getItem('paradise_ref_code');
          if (stored) {
            setReferralCode(stored.trim().toUpperCase());
            setShowReferralInput(true);
          }
        } catch {}
      }
    }
  }, [initialTab, isOpen]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Android Native Back Button Support for APK & Mobile Browser
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ vegasAuthModalOpen: true }, '');
      const handlePopState = () => {
        onClose();
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({ identifier, password, deviceId }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccessMsg(`Welcome back, ${data.user?.username || 'Player'}!`);
        writeCachedPlayer(data.user);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: data.user }));
          window.dispatchEvent(new CustomEvent('paradise-cashier-refresh'));
        }
        if (onAuthSuccess) onAuthSuccess(data.user);
        if (onSuccess) onSuccess(data.user);
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setErrorMsg(data.error || 'Invalid credentials.');
      }
    } catch {
      setLoading(false);
      setErrorMsg('Login connection failed. Please try again.');
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!ageVerified) {
      setErrorMsg('You must certify that you are 18+ and a US resident.');
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanMail = email.trim().toLowerCase();

    if (cleanUser.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanMail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          email: cleanMail,
          username: cleanUser,
          purpose: 'Registration',
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setRegStep('otp');
        setOtpSentMsg(data.message || `A 6-digit security code has been sent to ${cleanMail}.`);
        setResendCooldown(45);
      } else {
        setErrorMsg(data.error || 'Failed to dispatch verification code.');
      }
    } catch {
      setLoading(false);
      setErrorMsg('Network error. Could not send verification code.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          purpose: 'Registration',
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setOtpSentMsg(data.message || `New code sent to ${email}`);
        setResendCooldown(45);
      } else {
        setErrorMsg(data.error || 'Failed to resend code.');
      }
    } catch {
      setLoading(false);
      setErrorMsg('Network error. Could not resend code.');
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit security code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          otp: otp.trim(),
          referralCode: referralCode.trim(),
          state,
          ageVerified: true,
          deviceId,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccessMsg('Account verified! $5.00 Bonus Credited.');
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}

        writeCachedPlayer(data.user);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: data.user }));
          window.dispatchEvent(new CustomEvent('paradise-cashier-refresh'));
        }
        if (onAuthSuccess) onAuthSuccess(data.user);
        if (onSuccess) onSuccess(data.user);

        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setErrorMsg(data.error || 'Registration failed.');
      }
    } catch {
      setLoading(false);
      setErrorMsg('Registration failed. Please check your network connection.');
    }
  };

  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
    'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
    'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
    'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(5, 2, 14, 0.92)',
        backdropFilter: 'blur(18px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Main Split-Screen Architecture Modal Container */}
      <div
        className="modal-scrollable"
        style={{
          width: '100%',
          maxWidth: '820px',
          backgroundColor: '#0E0A24',
          borderRadius: '26px',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 45px rgba(0, 240, 255, 0.2), inset 0 0 25px rgba(224, 38, 216, 0.1)',
          position: 'relative',
          color: '#F8FAFC',
          maxHeight: '94vh',
          display: 'flex',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Absolute Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D1CADB',
            cursor: 'pointer',
            zIndex: 30,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
          }}
          className="hover:scale-105"
        >
          <X size={17} />
        </button>

        {/* ======================================================== */}
        {/* LEFT COLUMN: VIP EXPERIENCE & SHOWCASE (Desktop Only)     */}
        {/* ======================================================== */}
        <div
          className="hidden md:flex"
          style={{
            width: '42%',
            background: 'linear-gradient(160deg, #160D38 0%, #0A051A 100%)',
            borderRight: '1px solid rgba(0, 240, 255, 0.22)',
            padding: '32px 28px',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Glows */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-20%',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--neon-cyan-glow) 0%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(30px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-10%',
              right: '-10%',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--neon-purple-glow) 0%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(30px)',
            }}
          />

          {/* Top Brand Showcase */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <img
              src="/logo.png"
              alt="Rich Room VIP"
              style={{
                height: '56px',
                width: 'auto',
                maxHeight: '60px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 16px var(--neon-cyan-glow))',
                marginBottom: '16px',
              }}
            />

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--neon-cyan-glow)',
                border: '1px solid var(--chrome-border)',
                borderRadius: '9999px',
                padding: '4px 12px',
                marginBottom: '14px',
              }}
            >
              <Sparkles size={12} color="var(--neon-cyan)" />
              <span
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontSize: '10px',
                  fontWeight: 900,
                  color: 'var(--neon-cyan)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                PREMIER SWEEPSTAKES LOUNGE
              </span>
            </div>

            <h3
              style={{
                fontFamily: 'Lexend, sans-serif',
                fontSize: '22px',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.25,
                margin: '0 0 10px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Experience True <span style={{ color: 'var(--neon-cyan)' }}>Sovereign Tier</span> Gaming.
            </h3>

            <p
              style={{
                fontSize: '12px',
                color: '#BDB4CB',
                lineHeight: 1.5,
                margin: 0,
                fontFamily: 'Lexend, sans-serif',
              }}
            >
              Join thousands of VIP players playing official Fire Kirin, Orion Stars, and Ultra Panda sweepstakes games with 100% legal cash prizes.
            </p>
          </div>

          {/* Center VIP Perks List */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              margin: '22px 0',
              backgroundColor: 'rgba(7, 5, 20, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 240, 255, 0.15)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Gift size={15} color="#00F0FF" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '11.5px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#FFFFFF' }}>
                  $5.00 Instant Freeplay + 50,000 GC
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif' }}>
                  Credited immediately on signup
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(224, 38, 216, 0.15)',
                  border: '1px solid rgba(224, 38, 216, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap size={15} color="#E026D8" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '11.5px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#FFFFFF' }}>
                  Instant Cash Redemptions
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif' }}>
                  Direct to Cash App &amp; Crypto
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 240, 255, 0.15)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Coins size={15} color="#00F0FF" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '11.5px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#FFFFFF' }}>
                  50% VIP Referral Share
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif' }}>
                  Weekly automated royalty payouts
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Live Player Stat Strip */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 10px #10B981',
                }}
              />
              <span style={{ fontSize: '11px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#FFFFFF' }}>
                $2,450,000+
              </span>
            </div>
            <span style={{ fontSize: '10.5px', fontFamily: 'Lexend, sans-serif', color: '#8E849E' }}>
              Redeemed in 2026
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: INTERACTIVE FORM (Sign In / Register)      */}
        {/* ======================================================== */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto',
          }}
          className="modal-scrollable p-4 sm:p-7"
        >
          <div>
            {/* Mobile Header Banner (Visible only on <768px) */}
            <div className="md:hidden" style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img
                src="/logo.png"
                alt="Rich Room VIP"
                style={{
                  height: '46px',
                  width: 'auto',
                  maxHeight: '50px',
                  objectFit: 'contain',
                  margin: '0 auto 8px auto',
                  display: 'block',
                  filter: 'drop-shadow(0 0 14px var(--neon-cyan-glow))',
                }}
              />
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(0, 240, 255, 0.12)',
                  border: '1px solid rgba(0, 240, 255, 0.35)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  marginBottom: '4px',
                }}
              >
                <Sparkles size={11} color="#00F0FF" />
                <span style={{ fontSize: '9.5px', fontFamily: 'Lexend, sans-serif', fontWeight: 900, color: '#00F0FF' }}>
                  $5.00 FREEPLAY INSTANT SIGNUP BONUS + 50,000 GC
                </span>
              </div>
            </div>

            {/* Desktop Form Heading */}
            <div style={{ marginBottom: '18px' }}>
              <h2
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontSize: '22px',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  margin: '0 0 4px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                {tab === 'login'
                  ? 'Welcome Back, Player'
                  : regStep === 'otp'
                  ? 'Security Verification'
                  : 'Create Sovereign Vault'}
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: '#A69FB3',
                  margin: 0,
                  fontFamily: 'Lexend, sans-serif',
                }}
              >
                {tab === 'login'
                  ? 'Enter your credentials to access your balances & sweepstakes games.'
                  : regStep === 'otp'
                  ? `Enter the 6-digit verification code sent to ${email || 'your email'}.`
                  : 'Get started in under 30 seconds with immediate $5 Freeplay access.'}
              </p>
            </div>

            {/* Segmented Switcher Pill: SIGN IN vs REGISTER */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-deep)',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '16px',
                border: '1px solid var(--chrome-border)',
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setRegStep('details');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: tab === 'login' ? 'var(--neon-cyan)' : 'transparent',
                  color: tab === 'login' ? '#030712' : '#9A91A8',
                  fontFamily: 'Lexend, sans-serif',
                  fontSize: '11.5px',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: tab === 'login' ? '0 0 20px var(--neon-cyan-glow)' : 'none',
                }}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: tab === 'register' ? 'var(--neon-cyan)' : 'transparent',
                  color: tab === 'register' ? '#030712' : '#9A91A8',
                  fontFamily: 'Lexend, sans-serif',
                  fontSize: '11.5px',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: tab === 'register' ? '0 0 20px var(--neon-cyan-glow)' : 'none',
                }}
              >
                REGISTER
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#FCA5A5',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontFamily: 'Lexend, sans-serif',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  lineHeight: 1.35,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Banner */}
            {successMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  color: '#6EE7B7',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontFamily: 'Lexend, sans-serif',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  lineHeight: 1.35,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB: LOGIN FORM                                          */}
            {/* ======================================================== */}
            {tab === 'login' ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10.5px',
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 800,
                      color: '#C8C1D4',
                      marginBottom: '5px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    USERNAME OR EMAIL
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={16}
                      color="#00F0FF"
                      style={{ position: 'absolute', top: '13px', left: '14px', opacity: 0.85 }}
                    />
                    <input
                      type="text"
                      placeholder="Enter username or email address"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      autoFocus
                      style={{
                        width: '100%',
                        backgroundColor: '#070514',
                        border: '1px solid rgba(0, 240, 255, 0.28)',
                        borderRadius: '12px',
                        padding: '12px 14px 12px 42px',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontFamily: 'Lexend, sans-serif',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#00F0FF';
                        e.target.style.boxShadow = '0 0 16px rgba(0, 240, 255, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0, 240, 255, 0.28)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label
                      style={{
                        fontSize: '10.5px',
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 800,
                        color: '#C8C1D4',
                        letterSpacing: '0.04em',
                      }}
                    >
                      PASSWORD
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.location.href = '/forgot-password';
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#00F0FF',
                        fontSize: '10.5px',
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={16}
                      color="#00F0FF"
                      style={{ position: 'absolute', top: '13px', left: '14px', opacity: 0.85 }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        backgroundColor: '#070514',
                        border: '1px solid rgba(0, 240, 255, 0.28)',
                        borderRadius: '12px',
                        padding: '12px 42px 12px 42px',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontFamily: 'Lexend, sans-serif',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#00F0FF';
                        e.target.style.boxShadow = '0 0 16px rgba(0, 240, 255, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0, 240, 255, 0.28)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        top: '11px',
                        right: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#8E849E',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: 'var(--primary-gradient)',
                    color: '#030712',
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 900,
                    fontSize: '13px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '13px 0',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 22px var(--neon-cyan-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '6px',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.75 : 1,
                  }}
                  className="hover:scale-[1.01]"
                >
                  <span>{loading ? 'AUTHENTICATING...' : 'ENTER SOVEREIGN VAULT'}</span>
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>
            ) : regStep === 'details' ? (
              /* ======================================================== */
              /* TAB: REGISTRATION STEP 1 - DETAILS                       */
              /* ======================================================== */
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {/* 2-Column Grid: Username & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '10px',
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 800,
                        color: '#C8C1D4',
                        marginBottom: '4px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      USERNAME
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        size={14}
                        color="#00F0FF"
                        style={{ position: 'absolute', top: '12px', left: '12px', opacity: 0.85 }}
                      />
                      <input
                        type="text"
                        placeholder="Choose username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={3}
                        style={{
                          width: '100%',
                          backgroundColor: '#070514',
                          border: '1px solid rgba(0, 240, 255, 0.28)',
                          borderRadius: '11px',
                          padding: '10px 12px 10px 36px',
                          color: '#FFFFFF',
                          fontSize: '12.5px',
                          fontFamily: 'Lexend, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '10px',
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 800,
                        color: '#C8C1D4',
                        marginBottom: '4px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      EMAIL ADDRESS
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={14}
                        color="#00F0FF"
                        style={{ position: 'absolute', top: '12px', left: '12px', opacity: 0.85 }}
                      />
                      <input
                        type="email"
                        placeholder="name@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          backgroundColor: '#070514',
                          border: '1px solid rgba(0, 240, 255, 0.28)',
                          borderRadius: '11px',
                          padding: '10px 12px 10px 36px',
                          color: '#FFFFFF',
                          fontSize: '12.5px',
                          fontFamily: 'Lexend, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field (Full Width) */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 800,
                      color: '#C8C1D4',
                      marginBottom: '4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    PASSWORD (MIN 6 CHARACTERS)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={14}
                      color="#00F0FF"
                      style={{ position: 'absolute', top: '12px', left: '12px', opacity: 0.85 }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        backgroundColor: '#070514',
                        border: '1px solid rgba(0, 240, 255, 0.28)',
                        borderRadius: '11px',
                        padding: '10px 36px 10px 36px',
                        color: '#FFFFFF',
                        fontSize: '12.5px',
                        fontFamily: 'Lexend, sans-serif',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'transparent',
                        border: 'none',
                        color: '#8E849E',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Referral Code Expandable Switch */}
                <div>
                  {!showReferralInput && !referralCode ? (
                    <button
                      type="button"
                      onClick={() => setShowReferralInput(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#00F0FF',
                        fontFamily: 'Lexend, sans-serif',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 0',
                      }}
                    >
                      <Sparkles size={13} />
                      <span>+ Have a VIP Referral or Agent Code?</span>
                    </button>
                  ) : (
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          fontFamily: 'Lexend, sans-serif',
                          fontWeight: 800,
                          color: '#C8C1D4',
                          marginBottom: '4px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        REFERRAL CODE (OPTIONAL)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Sparkles
                          size={14}
                          color="#00F0FF"
                          style={{ position: 'absolute', top: '12px', left: '12px', opacity: 0.85 }}
                        />
                        <input
                          type="text"
                          placeholder="e.g. PP-VIP88"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          style={{
                            width: '100%',
                            backgroundColor: '#070514',
                            border: '1px solid rgba(0, 240, 255, 0.28)',
                            borderRadius: '11px',
                            padding: '10px 12px 10px 36px',
                            color: '#FFFFFF',
                            fontSize: '12.5px',
                            fontFamily: 'Lexend, sans-serif',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 18+ Certification Checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    id="ageVerifyCheckModal"
                    checked={ageVerified}
                    onChange={(e) => setAgeVerified(e.target.checked)}
                    style={{
                      accentColor: '#00F0FF',
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                      marginTop: '1px',
                      flexShrink: 0,
                    }}
                    required
                  />
                  <label
                    htmlFor="ageVerifyCheckModal"
                    style={{
                      fontSize: '10.5px',
                      color: '#B3A9C0',
                      cursor: 'pointer',
                      userSelect: 'none',
                      lineHeight: 1.4,
                      fontFamily: 'Lexend, sans-serif',
                    }}
                  >
                    I certify that I am at least 18 years old (21+ where applicable) and accept the Terms of Service.
                  </label>
                </div>

                {/* Send OTP Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: 'var(--primary-gradient)',
                    color: '#030712',
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 900,
                    fontSize: '12.5px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '12.5px 0',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 22px var(--neon-cyan-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.75 : 1,
                  }}
                  className="hover:scale-[1.01]"
                >
                  <span>{loading ? 'SENDING EMAIL OTP...' : 'CONTINUE & SEND EMAIL OTP'}</span>
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>
            ) : (
              /* ======================================================== */
              /* TAB: REGISTRATION STEP 2 - ENTER OTP CODE                */
              /* ======================================================== */
              <form onSubmit={handleVerifyAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ textAlign: 'center', padding: '4px 0 6px 0' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 240, 255, 0.12)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px auto',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
                    }}
                  >
                    <Mail size={20} color="#00F0FF" />
                  </div>
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      margin: '0 0 4px 0',
                      fontFamily: 'Lexend, sans-serif',
                    }}
                  >
                    ENTER VERIFICATION CODE
                  </h3>
                  <p
                    style={{
                      fontSize: '11.5px',
                      color: '#BDB4CB',
                      margin: '0 0 6px 0',
                      lineHeight: 1.4,
                      fontFamily: 'Lexend, sans-serif',
                    }}
                  >
                    A 6-digit security code was dispatched to: <br />
                    <strong style={{ color: '#00F0FF' }}>{email}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRegStep('details');
                      setErrorMsg(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#E026D8',
                      fontSize: '11px',
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    ← Edit email address or details
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#070514',
                      border: '2px solid rgba(0, 240, 255, 0.45)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      color: '#00F0FF',
                      fontSize: '24px',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '10px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 0 24px rgba(0, 240, 255, 0.25)',
                    }}
                  />
                </div>


                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11.5px',
                    color: '#9A91A8',
                    fontFamily: 'Lexend, sans-serif',
                  }}
                >
                  <span>Didn&apos;t receive it?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: resendCooldown > 0 ? '#64748B' : '#00F0FF',
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 800,
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                    }}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  style={{
                    width: '100%',
                    background: 'var(--primary-gradient)',
                    color: '#030712',
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 900,
                    fontSize: '13px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '13px 0',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 22px var(--neon-cyan-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    transition: 'all 0.2s ease',
                    opacity: loading || otp.length !== 6 ? 0.65 : 1,
                  }}
                  className="hover:scale-[1.01]"
                >
                  <span>{loading ? 'VERIFYING...' : 'VERIFY & CLAIM $5.00 BONUS'}</span>
                  {!loading && <CheckCircle2 size={16} />}
                </button>
              </form>
            )}
          </div>

          {/* Bottom Switcher Footer */}
          <div
            style={{
              paddingTop: '16px',
              marginTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
            }}
          >
            {tab === 'login' ? (
              <p style={{ fontSize: '11.5px', color: '#9A91A8', margin: 0, fontFamily: 'Lexend, sans-serif' }}>
                New to Rich Room?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMsg(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00F0FF',
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0 4px',
                  }}
                >
                  Create Account &amp; Claim $5 Freeplay
                </button>
              </p>
            ) : (
              <p style={{ fontSize: '11.5px', color: '#9A91A8', margin: 0, fontFamily: 'Lexend, sans-serif' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMsg(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00F0FF',
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0 4px',
                  }}
                >
                  Sign In to Sovereign Vault
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
