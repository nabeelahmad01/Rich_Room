'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, User, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { getOrCreateDeviceId } from '@/lib/deviceClient';
import { readCachedPlayer, writeCachedPlayer } from '@/lib/playerSessionCache';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [checkingSession, setCheckingSession] = useState(true);
  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [otp, setOtp] = useState('');
  const [ageVerified, setAgeVerified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const go = (dest) => {
      if (!cancelled) router.replace(dest);
    };
    const cached = readCachedPlayer();
    if (cached) {
      go(redirectTarget || '/');
      return () => {
        cancelled = true;
      };
    }
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.authenticated && data?.user) {
          writeCachedPlayer(data.user);
          go(redirectTarget || '/');
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [redirectTarget, router]);

  // Auto-capture referral code from URL parameter (?ref=PP-CCZFE) or saved cache
  useEffect(() => {
    const urlRef = searchParams.get('ref') || searchParams.get('referralCode') || searchParams.get('referrer');
    if (urlRef) {
      const clean = urlRef.trim().toUpperCase();
      setReferralCode(clean);
      try {
        localStorage.setItem('paradise_ref_code', clean);
        sessionStorage.setItem('paradise_ref_code', clean);
      } catch {}
    } else {
      try {
        const stored = localStorage.getItem('paradise_ref_code') || sessionStorage.getItem('paradise_ref_code');
        if (stored) setReferralCode(stored.trim().toUpperCase());
      } catch {}
    }
  }, [searchParams]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!ageVerified) {
      setError('You must confirm that you are at least 18 years old.');
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanMail = email.trim().toLowerCase();

    if (cleanUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanMail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

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

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch security code.');
      }

      setStep('otp');
      setResendCooldown(45);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
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

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setResendCooldown(45);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          otp: otp.trim(),
          referralCode: referralCode.trim(),
          ageVerified: true,
          deviceId,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Registration failed. Please check your verification code.');
      }

      try {
        localStorage.removeItem('paradise_ref_code');
        sessionStorage.removeItem('paradise_ref_code');
      } catch {}

      setSuccessMsg('Account verified! Welcome to Rich Room. Redirecting...');
      if (data.user) writeCachedPlayer(data.user);

      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      setTimeout(() => {
        if (redirectTarget) {
          window.location.href = redirectTarget;
        } else {
          window.location.href = '/';
        }
      }, 800);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="w-full max-w-md p-8 rounded-3xl border border-[var(--chrome-border)] bg-[#070919] flex flex-col items-center gap-3">
        <Sparkles size={28} className="text-[var(--neon-purple)] animate-pulse" />
        <p className="text-xs text-slate-400">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-5 sm:p-8 rounded-3xl border border-[var(--chrome-border)] bg-[#070919] shadow-2xl space-y-6 relative overflow-hidden">
      <div className="text-center space-y-3">
        <Link href="/">
          <div
            className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden border-2 border-[var(--neon-purple)] shadow-[0_0_20px_rgba(192,38,211,0.4)]"
            style={{ position: 'relative', width: '64px', height: '64px', minWidth: '64px', margin: '0 auto' }}
          >
            <Image src="/logo.png" alt="Logo" fill className="object-cover" priority />
          </div>
        </Link>
        <h1 className="font-heading font-black text-2xl text-white">
          {step === 'details' ? (
            <>JOIN <span className="text-[var(--neon-purple-light)]">RICH ROOM</span></>
          ) : (
            <>SECURITY <span className="text-[var(--neon-cyan)]">VERIFICATION</span></>
          )}
        </h1>
        <p className="text-xs text-slate-400">
          {step === 'details'
            ? 'Create your verified player account to get started'
            : `Enter the 6-digit code sent to ${email}`}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center gap-2.5 text-xs text-emerald-200 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 animate-pulse" />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 'details' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">
              CHOOSE USERNAME
            </label>
            <div className="relative">
              <input
                type="text"
                required
                minLength={3}
                placeholder="e.g. cyber_master"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="cyber-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="yourname@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cyber-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">
              PASSWORD (MIN 6 CHARACTERS)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cyber-input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-sub font-bold text-slate-300">
                VIP REFERRAL / AGENT CODE (OPTIONAL)
              </label>
              {referralCode && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
                  <CheckCircle2 size={12} /> Code Applied
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. PP-CCZFE"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="cyber-input uppercase font-mono tracking-wider text-[var(--neon-cyan)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="ageCheck"
              checked={ageVerified}
              onChange={(e) => setAgeVerified(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[var(--neon-purple)] accent-[var(--neon-purple)] cursor-pointer"
            />
            <label htmlFor="ageCheck" className="text-[11px] text-slate-300 cursor-pointer select-none">
              I confirm I am 18+ years old and agree to the Terms of Service.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cyber-btn-purple py-3.5 rounded-xl font-heading font-black text-sm tracking-wider cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{loading ? 'SENDING EMAIL OTP...' : 'CONTINUE & SEND EMAIL OTP'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndRegister} className="space-y-4">
          <div className="text-center py-2 space-y-2">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto text-[var(--neon-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <Mail size={22} />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              We dispatched a 6-digit verification code to:<br />
              <strong className="text-[var(--neon-cyan)] font-mono text-sm">{email}</strong>
            </p>
            <button
              type="button"
              onClick={() => {
                setStep('details');
                setError('');
              }}
              className="text-xs text-[var(--neon-purple-light)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Change email or edit details</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-sub font-bold text-center text-slate-300 mb-1.5">
              ENTER 6-DIGIT SECURITY CODE
            </label>
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
              className="cyber-input text-center font-mono text-2xl tracking-[10px] text-[var(--neon-cyan)] border-[var(--neon-cyan)]/50 focus:border-[var(--neon-cyan)] py-3"
            />
          </div>


          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Didn&apos;t receive it?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className={`font-bold transition ${
                resendCooldown > 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-[var(--neon-cyan)] hover:underline cursor-pointer'
              }`}
            >
              {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || Boolean(successMsg)}
            className="w-full cyber-btn-cyan py-3.5 rounded-xl font-heading font-black text-sm tracking-wider cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{loading ? 'VERIFYING CODE...' : 'VERIFY & COMPLETE REGISTRATION'}</span>
            {!loading && <CheckCircle2 size={16} />}
          </button>
        </form>
      )}

      <div className="pt-2 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--neon-cyan)] font-bold hover:underline">
          Sign in here
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
