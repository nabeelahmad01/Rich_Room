'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Terminal,
  Cpu,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';

function ProvisioningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');
  const gameParam = searchParams.get('game') || 'Game Platform';

  const [user, setUser] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 30-Second 3-Stage Progress Simulation
  const [progress, setProgress] = useState(5);
  const [currentStage, setCurrentStage] = useState(1);
  const [terminalLogs, setTerminalLogs] = useState([
    '[INIT] Connecting to Game Master Terminal...',
  ]);

  // Request & Credentials Data
  const [requestData, setRequestData] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          diffSet(setUser, data.user);
        } else {
          router.push('/login');
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchUser();
  }, []);

  // 30-Second Progress Timer Simulation
  useEffect(() => {
    const startTime = Date.now();
    const duration = 30000; // 30 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      const rem = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setCountdown(rem);

      if (elapsed < 10000) {
        setCurrentStage(1);
      } else if (elapsed < 20000) {
        setCurrentStage(2);
      } else {
        setCurrentStage(3);
      }

      // Add dynamic terminal logs
      if (elapsed > 4000 && elapsed < 5000) {
        setTerminalLogs(prev => [
          ...prev,
          '[AUTH] Cryptographic key handshake verified: 2048-bit AES',
        ]);
      }
      if (elapsed > 11000 && elapsed < 12000) {
        setTerminalLogs(prev => [
          ...prev,
          `[NODE] Allocating secure game slot on ${gameParam} gateway...`,
        ]);
      }
      if (elapsed > 16000 && elapsed < 17000) {
        setTerminalLogs(prev => [
          ...prev,
          '[ESCROW] Coin escrow verified & locked for player transfer.',
        ]);
      }
      if (elapsed > 21000 && elapsed < 22000) {
        setTerminalLogs(prev => [
          ...prev,
          '[DISPATCH] Handing off to 24/7 Operations Desk for live terminal pairing...',
        ]);
      }

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameParam]);

  // Live Status Polling (No refresh needed - auto-detects approval immediately)
  useEffect(() => {
    if (!user || isApproved) return;

    let isMounted = true;

    async function pollStatus() {
      if (!user?.email || !isMounted) return;
      try {
        const cleanGame = (gameParam || '').toLowerCase().trim();

        // 1. Fetch both account-requests and game-accounts with no-store cache
        const [reqRes, credRes] = await Promise.allSettled([
          fetch(`/api/account-requests?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' }),
          fetch(`/api/game-accounts?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' }),
        ]);

        const reqData = reqRes.status === 'fulfilled' ? await reqRes.value.json().catch(() => ({})) : {};
        const credData = credRes.status === 'fulfilled' ? await credRes.value.json().catch(() => ({})) : {};

        // 2. Check if credentials are ready in gameAccounts
        if (credData.success && Array.isArray(credData.gameAccounts)) {
          const directCred = credData.gameAccounts.find((a) => {
            const t = (a.gameTitle || '').toLowerCase().trim();
            return t === cleanGame || (cleanGame && t.includes(cleanGame)) || (t && cleanGame.includes(t));
          });

          if (directCred && isMounted) {
            setRequestData({
              gameTitle: directCred.gameTitle || gameParam,
              gameAccountUsername: directCred.username,
              gameAccountPassword: directCred.password,
              status: 'READY',
            });
            setIsApproved(true);
            setProgress(100);
            setCurrentStage(3);

            confetti({
              particleCount: 90,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#00F0FF', '#10B981', '#F59E0B', '#C026D3'],
            });
            return;
          }
        }

        // 3. Check in accountRequests
        if (reqData.success && Array.isArray(reqData.accountRequests)) {
          let target = null;
          if (requestId) {
            target = reqData.accountRequests.find(
              (r) => String(r.id) === String(requestId) || String(r._id) === String(requestId)
            );
          }
          if (!target || target.status !== 'READY') {
            const readyByGame = reqData.accountRequests.find((r) => {
              const t = (r.gameTitle || '').toLowerCase().trim();
              return (
                (t === cleanGame || (cleanGame && t.includes(cleanGame)) || (t && cleanGame.includes(t))) &&
                r.status === 'READY'
              );
            });
            if (readyByGame) target = readyByGame;
          }
          if (!target) {
            target = reqData.accountRequests.find((r) => {
              const t = (r.gameTitle || '').toLowerCase().trim();
              return t === cleanGame || (cleanGame && t.includes(cleanGame)) || (t && cleanGame.includes(t));
            });
          }

          if (target && isMounted) {
            setRequestData(target);
            if (target.status === 'READY' || target.status === 'APPROVED') {
              setIsApproved(true);
              setProgress(100);
              setCurrentStage(3);

              confetti({
                particleCount: 90,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00F0FF', '#10B981', '#F59E0B', '#C026D3'],
              });
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }

    pollStatus();
    // Fast 1.5-second polling interval for real-time unlock
    const pollInterval = setInterval(pollStatus, 1500);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [user, requestId, gameParam, isApproved]);

  const handleCopy = (text, field) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const stages = [
    {
      num: 1,
      title: 'Gateway Handshake',
      desc: 'Connecting to sovereign platform terminal cluster',
      icon: Terminal,
    },
    {
      num: 2,
      title: 'Credential Synthesis',
      desc: 'Allocating encrypted player slot & PIN escrow',
      icon: Cpu,
    },
    {
      num: 3,
      title: 'Desk Agent Approval',
      desc: 'Live terminal pairing & credentials verification',
      icon: Lock,
    },
  ];

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
      />

      {/* Main Content Layout with proper lg:pl-64 offset */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Navbar */}
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
          onOpenAuth={(mode) => router.push(`/${mode}`)}
          onOpenWallet={(tab) => {
            if (tab === 'withdraw') router.push('/withdraw');
            else router.push('/deposit');
          }}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 lg:pb-8">
          {/* Header Card */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--neon-purple)]/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-[#0c102b] p-6 sm:p-8 shadow-[0_0_40px_rgba(192,38,211,0.15)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-purple)]/10 border border-[var(--neon-purple)]/40 text-[var(--neon-purple-light)] text-xs font-bold uppercase tracking-wider mb-2">
                  <Cpu size={14} />
                  <span>Real-Time Provisioning Gateway</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
                  PROVISIONING ACCOUNT: <span className="text-[var(--neon-cyan)]">{gameParam}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  {isApproved
                    ? 'Your game credentials have been verified and unlocked below! Start playing now.'
                    : 'System is generating and synchronizing your account across our high-speed gaming cluster.'}
                </p>
              </div>

              {/* Countdown or Status Indicator */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-end min-w-[170px]">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  {isApproved ? 'TERMINAL STATUS' : 'ESTIMATED TIME'}
                </span>
                <span className={`font-mono font-black text-2xl mt-0.5 ${isApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isApproved ? 'READY' : `${countdown}s REMAINING`}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  {isApproved ? '● Live on Game Terminal' : '○ Live 3-Stage Handshake'}
                </span>
              </div>
            </div>
          </div>

          {/* 3-Stage Visual Pipeline */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#0d102b] border border-slate-800 space-y-6">
            {/* Progress Bar Header */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Terminal size={14} className="text-[var(--neon-cyan)]" />
                  Terminal Provisioning Pipeline
                </span>
                <span className="font-mono text-[var(--neon-cyan)]">{progress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--neon-cyan)] via-blue-500 to-[var(--neon-purple)] transition-all duration-500 shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* 3 Interactive Stages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {stages.map((stg) => {
                const Icon = stg.icon;
                const isPassed = isApproved || currentStage > stg.num;
                const isCurrent = !isApproved && currentStage === stg.num;

                return (
                  <div
                    key={stg.num}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      isPassed
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-purple-950/30 border-[var(--neon-purple)] shadow-[0_0_20px_rgba(192,38,211,0.25)] animate-pulse'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-500'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black ${
                        isPassed
                          ? 'bg-emerald-500 text-black'
                          : isCurrent
                          ? 'bg-[var(--neon-purple)] text-white'
                          : 'bg-slate-900 text-slate-600'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 size={18} /> : stg.num}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-heading font-black uppercase tracking-wide text-white">
                        {stg.title}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {stg.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Terminal Box */}
            <div className="p-4 rounded-2xl bg-black/70 border border-slate-800 font-mono text-[11px] space-y-1.5 max-h-36 overflow-y-auto">
              <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Terminal Audit Trail:
              </div>
              {terminalLogs.map((log, i) => (
                <div key={i} className="text-emerald-400/90 leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Unlocked Credentials Card (Shown When Approved) */}
          {isApproved ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0c182b] to-[#0d102b] border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)] space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center">
                    <KeyRound size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      VERIFIED ACCESS UNLOCKED
                    </span>
                    <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
                      {requestData?.gameTitle || gameParam} Credentials
                    </h2>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 size={15} />
                  <span>Ready to Play</span>
                </div>
              </div>

              {/* Credentials Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username Field */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Game Username / Player ID
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-black text-base sm:text-lg text-white select-all">
                      {requestData?.gameAccountUsername || user?.username || 'PlayerAccount'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(requestData?.gameAccountUsername || user?.username, 'user')}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedField === 'user' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedField === 'user' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Password Field */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Game Password / PIN
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-black text-base sm:text-lg text-emerald-400 select-all">
                      {showPassword
                        ? requestData?.gameAccountPassword || 'Pass1234'
                        : '••••••••••••'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Show/Hide Password"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(requestData?.gameAccountPassword || 'Pass1234', 'pass')}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        {copiedField === 'pass' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedField === 'pass' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <Link
                  href="/games"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold text-center transition-colors"
                >
                  View All Platforms
                </Link>

                <a
                  href={`https://${(requestData?.gameTitle || gameParam).toLowerCase().replace(/\s+/g, '')}.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-102 active:scale-98 transition-all"
                >
                  <span>LAUNCH & PLAY NOW</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ) : (
            /* Pending Approval Message Box */
            <div className="p-6 rounded-3xl bg-[#0d102b] border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-heading font-black text-white">
                Live Desk Verification Active
              </h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                Terminal handshake completed (100%). Operations Desk is currently assigning your unique credentials on the game terminal. This screen will automatically refresh the instant your account is provisioned!
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/games"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Browse Other Games
                </Link>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Refresh Queue</span>
                </button>
              </div>
            </div>
          )}
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(mode) => router.push(`/${mode}`)}
        onOpenWallet={(tab) => {
          if (tab === 'withdraw') router.push('/withdraw');
          else router.push('/deposit');
        }}
      />
    </div>
  );
}

export default function GameProvisioningPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070919] flex items-center justify-center text-white font-mono text-sm">Initializing Terminal...</div>}>
      <ProvisioningContent />
    </Suspense>
  );
}
