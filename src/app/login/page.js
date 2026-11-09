'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, User, Loader2 } from 'lucide-react';
import { getOrCreateDeviceId } from '@/lib/deviceClient';
import { readCachedPlayer, writeCachedPlayer } from '@/lib/playerSessionCache';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
          const dest =
            data.isAdmin || redirectTarget === '/admin' || (data.user?.role && data.user.role !== 'player')
              ? '/admin'
              : redirectTarget || '/';
          go(dest);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, deviceId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Login failed. Please verify your credentials.');
      }

      const username = data.user?.username || identifier;
      setSuccessMsg(`Welcome back, ${username}! Redirecting...`);
      writeCachedPlayer(data.user);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: data.user }));
        window.dispatchEvent(new CustomEvent('paradise-cashier-refresh'));
      }

      // Determine redirect destination
      const destination =
        data.isAdmin || redirectTarget === '/admin' || (data.user?.role && data.user.role !== 'player')
          ? '/admin'
          : redirectTarget || '/';

      // Full-page location change guarantees cookies are sent and app state is refreshed
      setTimeout(() => {
        window.location.href = destination;
      }, 700);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="w-full max-w-md p-8 rounded-3xl border border-[var(--chrome-border)] bg-[#070919] flex flex-col items-center gap-3">
        <Loader2 size={28} className="text-[var(--neon-cyan)] animate-spin" />
        <p className="text-xs text-slate-400">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-5 sm:p-8 rounded-3xl border border-[var(--chrome-border)] bg-[#070919] shadow-2xl space-y-6 relative overflow-hidden">
      <div className="text-center space-y-3">
        <Link href="/">
          <div
            className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden border-2 border-[var(--neon-cyan)] shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            style={{ position: 'relative', width: '64px', height: '64px', minWidth: '64px', margin: '0 auto' }}
          >
            <Image src="/logo.png" alt="Logo" fill className="object-cover" priority />
          </div>
        </Link>
        <h1 className="font-heading font-black text-2xl text-white">
          SIGN IN TO <span className="text-[var(--neon-cyan)]">RICH ROOM</span>
        </h1>
        <p className="text-xs text-slate-400">Access your game accounts, wallet, or admin portal</p>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">
            EMAIL OR USERNAME
          </label>
          <div className="relative">
            <input
              type="text"
              required
              disabled={loading || Boolean(successMsg)}
              placeholder="player@example.com or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="cyber-input"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-sub font-bold text-slate-300">
              PASSWORD
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-[var(--neon-cyan)] hover:underline font-bold"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type="password"
              required
              disabled={loading || Boolean(successMsg)}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="cyber-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(successMsg)}
          className="w-full cyber-btn-cyan py-3.5 rounded-xl font-heading font-black text-sm tracking-wider cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>AUTHENTICATING...</span>
            </>
          ) : successMsg ? (
            <>
              <CheckCircle2 size={16} className="text-black" />
              <span>LOGGED IN!</span>
            </>
          ) : (
            <span>SIGN IN NOW</span>
          )}
        </button>
      </form>

      <div className="pt-2 text-center text-xs text-slate-400">
        <p>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[var(--neon-cyan)] font-bold hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
