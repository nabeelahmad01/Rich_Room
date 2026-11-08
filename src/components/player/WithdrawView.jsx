'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Coins,
  Send,
  Upload,
  QrCode,
  Gamepad2,
  X,
  Eye,
} from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import DailySpinWheelModal from '@/components/common/DailySpinWheelModal';
import { diffSet } from '@/lib/fastDiff';
import { getAvailableGamePlatforms, ALL_PLATFORM_GAMES } from '@/lib/gameAssets';
import { compressImageFile } from '@/lib/imageCompress';
import { getCachedUser } from '@/lib/authClient';
import { MIN_CASHOUT_USD } from '@/lib/cashoutPolicy';

export default function WithdrawView({ isEmbedded = false, onSelectTab }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);

  // Withdrawal Form State
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('50');
  const [method, setMethod] = useState('Cash App');
  const [recipientTag, setRecipientTag] = useState('');
  const [selectedGame, setSelectedGame] = useState('Fire Kirin');
  const [userGameAccounts, setUserGameAccounts] = useState([]);

  // Proof uploads (Required by rules)
  const [gameScreenshot, setGameScreenshot] = useState('');
  const [gameScreenshotName, setGameScreenshotName] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [qrCodeImageName, setQrCodeImageName] = useState('');
  const [adminGames, setAdminGames] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('cached_games_list');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return ALL_PLATFORM_GAMES.map((title) => ({ title }));
  });

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // History State (Hydrated from cache for 0ms instant display)
  const [withdrawHistory, setWithdrawHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('pp_withdraw_history');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. Fetch current user
  const fetchUser = async (isSilent = false) => {
    if (!isSilent && !user) setLoadingUser(true);
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        diffSet(setUser, data.user);
      } else if (!isSilent) {
        router.push('/login?redirect=/withdraw');
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingUser(false);
    }
  };

  // 2. Fetch withdrawal history (lightweight query)
  const fetchHistory = async (isSilent = false) => {
    if (!isSilent && withdrawHistory.length === 0) setLoadingHistory(true);
    try {
      const res = await fetch('/api/payments/withdraw?lightweight=true', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.redemptions) {
        diffSet(setWithdrawHistory, data.redemptions);
        try {
          sessionStorage.setItem('pp_withdraw_history', JSON.stringify(data.redemptions));
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingHistory(false);
    }
  };

  // 3. Fetch user active game credentials
  const fetchGameAccounts = async () => {
    try {
      const res = await fetch('/api/game-accounts', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.gameAccounts)) {
        diffSet(setUserGameAccounts, data.gameAccounts);
        if (data.gameAccounts.length > 0 && !data.gameAccounts.some(a => a.gameTitle?.toLowerCase().trim() === selectedGame.toLowerCase().trim())) {
          setSelectedGame(data.gameAccounts[0].gameTitle || selectedGame);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Fetch active games catalog from Admin
  const fetchGames = async () => {
    try {
      const res = await fetch('/api/games', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.games) && data.games.length > 0) {
        setAdminGames(data.games);
        try {
          sessionStorage.setItem('cached_games_list', JSON.stringify(data.games));
        } catch {}
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setLoadingUser(false);
    }

    fetchUser(true);
    fetchHistory(true);
    fetchGameAccounts();
    fetchGames();

    // Zero-refresh live polling: gentle background sync with instant broadcast listeners
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchHistory(true);
        fetchUser(true);
      }
    }, 10000);

    const handleUserSync = (e) => {
      if (e.detail) diffSet(setUser, e.detail);
    };

    const handleFocus = () => {
      fetchHistory(true);
      fetchUser(true);
    };

    // Instant cross-tab balance sync listener
    let balanceChan = null;
    try {
      balanceChan = new BroadcastChannel('paradise_balance_sync');
      balanceChan.onmessage = () => {
        fetchHistory(true);
        fetchUser(true);
      };
    } catch {}

    const handleStorageSync = (e) => {
      if (e.key === 'paradise_user_balance_sync') {
        fetchHistory(true);
        fetchUser(true);
      }
    };

    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(pollInterval);
      if (balanceChan) balanceChan.close();
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const handleGameScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return alert('Screenshot file must be under 25MB');
    setGameScreenshotName(file.name);
    try {
      const compressed = await compressImageFile(file, { maxSize: 900, quality: 0.55 });
      setGameScreenshot(compressed || null);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setGameScreenshot(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return alert('QR Code file must be under 25MB');
    setQrCodeImageName(file.name);
    try {
      const compressed = await compressImageFile(file, { maxSize: 800, quality: 0.65 });
      setQrCodeImage(compressed || null);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setQrCodeImage(reader.result);
    }
  };

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  const handleSubmitWithdraw = async (e) => {
    e.preventDefault();
    if (!finalAmount || finalAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid withdrawal amount.' });
      return;
    }
    if (finalAmount < MIN_CASHOUT_USD) {
      setStatusMessage({
        type: 'error',
        text: `Minimum cashout is $${MIN_CASHOUT_USD}. Please enter $${MIN_CASHOUT_USD} or more.`,
      });
      return;
    }

    if (!recipientTag.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your Payout Tag Name / Cashtag.' });
      return;
    }

    if (!gameScreenshot) {
      setStatusMessage({
        type: 'error',
        text: 'Game winning screenshot is required to verify your winnings.',
      });
      return;
    }

    if (!qrCodeImage) {
      setStatusMessage({
        type: 'error',
        text: 'Your payout QR Code screenshot is required for dispatch.',
      });
      return;
    }

    const linkedAccount = userGameAccounts.find(
      (a) => (a.gameTitle || '').toLowerCase().trim() === selectedGame.toLowerCase().trim()
    );

    if (!linkedAccount) {
      setStatusMessage({
        type: 'error',
        text: `Withdrawal Blocked: You do not have an active game account for "${selectedGame}". You must have an approved game account and play first before requesting a cashout.`,
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        amount: finalAmount,
        payoutMethod: method,
        destinationTag: recipientTag.trim(),
        destinationAddress: recipientTag.trim(),
        gameTitle: selectedGame,
        gameAccountUsername: linkedAccount.username,
        gameScreenshot,
        qrCodeImage,
      };

      // 0ms Optimistic UI update: Instantly show pending redemption in player table
      const tempId = 'temp_' + Date.now();
      const optimisticItem = {
        id: tempId,
        _id: tempId,
        amount: finalAmount,
        payoutMethod: method,
        destinationTag: recipientTag.trim(),
        destinationAddress: recipientTag.trim(),
        gameTitle: selectedGame,
        gameAccountUsername: linkedAccount.username,
        status: 'pending',
        stage: 'coin_verification',
        createdAt: new Date().toISOString(),
      };
      setWithdrawHistory((prev) => [optimisticItem, ...prev]);

      const res = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `Cashout request for $${finalAmount.toFixed(2)} submitted! It has been routed to Coin Allotment for verification.`,
        });
        setRecipientTag('');
        setCustomAmount('');
        setGameScreenshot('');
        setGameScreenshotName('');
        setQrCodeImage('');
        setQrCodeImageName('');
        fetchHistory(true);
        fetchUser(true);

        // Alert Coin Operations Desk immediately (0ms cross-tab broadcast)
        try {
          const staffChannel = new BroadcastChannel('paradise_staff_alerts');
          staffChannel.postMessage({
            type: 'NEW_COIN_CASHOUT',
            amount: finalAmount,
            username: user?.username || 'Player',
            gameTitle: selectedGame,
          });
          staffChannel.close();
        } catch {}

        localStorage.setItem(
          'paradise_staff_event',
          JSON.stringify({
            type: 'NEW_COIN_CASHOUT',
            amount: finalAmount,
            username: user?.username || 'Player',
            gameTitle: selectedGame,
            time: Date.now(),
          })
        );
      } else {
        setStatusMessage({ type: 'error', text: data.error || data.message || 'Withdrawal submission failed.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const payoutMethods = [
    { id: 'cashapp', name: 'Cash App', placeholder: 'e.g. $YourCashtag' },
    { id: 'crypto-btc', name: 'Bitcoin (BTC)', placeholder: 'e.g. bc1q... wallet address' },
    { id: 'crypto-usdt', name: 'USDT (TRC20)', placeholder: 'e.g. TX... TRC20 address' },
    { id: 'venmo', name: 'Venmo', placeholder: 'e.g. @YourVenmoHandle' },
    { id: 'paypal', name: 'PayPal', placeholder: 'e.g. your-paypal@domain.com' },
    { id: 'zelle', name: 'Zelle Pay', placeholder: 'e.g. phone number or email' },
  ];

  const popularGames = getAvailableGamePlatforms(adminGames, userGameAccounts);

  const presetAmounts = [40, 50, 100, 250, 500];

  const renderWithdrawMain = () => (
    <main className={`max-w-7xl w-full mx-auto py-6 space-y-6 ${isEmbedded ? 'px-2 sm:px-4' : 'flex-1 px-4 sm:px-6 lg:px-8'}`}>
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--neon-cyan)]/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-[#0c102b] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-xs font-bold uppercase tracking-wider mb-2">
                  <ArrowUpRight size={14} />
                  <span>Instant Player Cashout Desk</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
                  REDEEM YOUR <span className="text-[var(--neon-cyan)]">GAME WINNINGS</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  Cash out your game winnings straight to CashApp, Crypto, or Venmo. 1:1 USD guaranteed payouts verified by our 24/7 financial desk.
                </p>
              </div>

              {/* Status Badge */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-[var(--neon-cyan)]/40 flex flex-col items-end min-w-[170px]">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  DISPATCH DESK
                </span>
                <span className="font-mono font-black text-2xl text-[var(--neon-cyan)] mt-0.5">
                  LIVE 24/7
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
                  <CheckCircle2 size={11} /> 0% Payout Fee
                </span>
              </div>
            </div>
          </div>

          {/* Alert Message */}
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-all ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                  : 'bg-red-950/70 border-red-500 text-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Form & Instructions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Withdrawal Form */}
            <form onSubmit={handleSubmitWithdraw} className="lg:col-span-7 space-y-6">
              {/* Step 1: Select Game Platform & Payout Destination */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0d102b] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[var(--neon-cyan)] text-black flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    Game Platform &amp; Payout Method
                  </h3>
                  <span className="text-xs text-emerald-400 font-bold">100% Flexible Amount</span>
                </div>

                {/* Game Select & Account Detection */}
                <div>
                  {(() => {
                    const linkedAcc = userGameAccounts.find(
                      (a) => (a.gameTitle || '').toLowerCase().trim() === selectedGame.toLowerCase().trim()
                    );

                    return (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                            <Gamepad2 size={13} className="text-[var(--neon-cyan)]" />
                            Select Game Won From *
                          </label>
                          {linkedAcc ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                              <CheckCircle2 size={10} />
                              ID: @{linkedAcc.username}
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 bg-red-950/70 border border-red-500/40 px-2 py-0.5 rounded-full">
                              <AlertCircle size={10} />
                              No Account Found
                            </span>
                          )}
                        </div>

                        <select
                          value={selectedGame}
                          onChange={(e) => setSelectedGame(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl bg-slate-900 border text-white font-heading font-bold text-sm focus:outline-none transition-colors ${
                            linkedAcc
                              ? 'border-slate-700 focus:border-[var(--neon-cyan)]'
                              : 'border-red-500/80 focus:border-red-400'
                          }`}
                        >
                          {popularGames.map((g) => {
                            const acc = userGameAccounts.find(
                              (a) => (a.gameTitle || '').toLowerCase().trim() === g.toLowerCase().trim()
                            );
                            return (
                              <option key={g} value={g} className="bg-slate-900 text-white">
                                {g} {acc ? `— (Username: @${acc.username})` : '— (No account)'}
                              </option>
                            );
                          })}
                        </select>

                        {linkedAcc ? (
                          <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center gap-2 mt-2 text-emerald-300 text-xs">
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                            <span>
                              Verified Game Account: <strong className="font-mono text-white bg-emerald-900/60 px-1.5 py-0.5 rounded">@{linkedAcc.username}</strong> will be submitted to Coin Allotment.
                            </span>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/60 flex items-start gap-3 mt-2 text-red-200">
                            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-red-300">
                                Withdrawal Blocked: No Active Account for {selectedGame}
                              </p>
                              <p className="text-[11px] text-red-300/80 leading-relaxed">
                                You do not have active credentials for <strong>{selectedGame}</strong>. Cashouts can only be processed from games where you have an active account.
                              </p>
                              <button
                                type="button"
                                onClick={() => router.push('/games')}
                                className="text-[11px] font-bold text-cyan-300 underline hover:text-cyan-200 mt-1 cursor-pointer block"
                              >
                                Request a {selectedGame} Account Under Games Hub ➔
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Payout Method Grid */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                    Payout Destination *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {payoutMethods.map((m) => {
                      const isSelected = method === m.name;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.name)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-950/50 border-[var(--neon-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs font-heading font-bold text-white truncate">
                            {m.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 size={14} className="text-[var(--neon-cyan)] flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payout Tag Name (Required) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Your Payout Tag Name / Cashtag / Handle *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. $YourCashtag or wallet address"
                    value={recipientTag}
                    onChange={(e) => setRecipientTag(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-[var(--neon-cyan)]"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                    The handle where our desk will send your prize payout.
                  </span>
                </div>
              </div>

              {/* Step 2: Choose Cashout Amount */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0d102b] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[var(--neon-cyan)] text-black flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    Cashout Amount ($ USD)
                  </h3>
                  <span className="text-xs text-emerald-400 font-mono font-bold">1 SC = $1.00 USD</span>
                </div>

                {/* Primary Direct Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 uppercase flex items-center justify-between">
                    <span>Enter Cashout Amount ($ USD) *</span>
                    <span className="text-[11px] text-cyan-400 font-normal font-sans">Type any amount you want</span>
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 font-bold"
                    />
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="e.g. 25, 50, 75, 120..."
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setAmount(e.target.value ? parseFloat(e.target.value) || 0 : 0);
                      }}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-900 border-2 border-cyan-500/40 text-white font-mono font-black text-lg focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all"
                    />
                  </div>
                </div>

                {/* Quick Selection Shortcuts */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Quick Preset Shortcuts:
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {[40, 50, 100, 200, 500].map((p) => {
                      const isSel = Number(customAmount || amount) === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setCustomAmount(String(p));
                            setAmount(p);
                          }}
                          className={`py-2.5 rounded-xl font-heading font-bold text-sm transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[var(--neon-cyan)] text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-102 font-black'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                          }`}
                        >
                          ${p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Amount Summary Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-[#0e122b] border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Cashout Amount To Receive
                    </span>
                    <span className="text-xl font-mono font-black text-emerald-400">
                      ${(Number(customAmount || amount || 0)).toFixed(2)} USD
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full font-mono">
                      Via {method}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3: Mandatory Proof Uploads (Game Win Screenshot + Payout QR) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0d102b] border border-slate-800 space-y-4">
                <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--neon-cyan)] text-black flex items-center justify-center text-xs font-black">
                    3
                  </span>
                  Upload Required Proofs (Game Win &amp; Payout QR)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Upload 1: Game Winning Screenshot */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Gamepad2 size={14} className="text-[var(--neon-cyan)]" />
                      <span>1. Game Winning Screenshot *</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-[var(--neon-cyan)]/60 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-900/40 relative">
                      <input
                        type="file"
                        accept="image/*"
                        required={!gameScreenshot}
                        onChange={handleGameScreenshotUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center gap-1 pointer-events-none">
                        <Upload size={20} className="text-[var(--neon-cyan)]" />
                        <span className="text-xs font-bold text-slate-200">
                          {gameScreenshotName ? `Selected: ${gameScreenshotName}` : 'Upload Game Screenshot'}
                        </span>
                        <span className="text-[10px] text-slate-500">Shows your balance/score</span>
                      </div>
                    </div>

                    {gameScreenshot && (
                      <div className="mt-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <img
                          src={gameScreenshot}
                          alt="Game Proof"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setGameScreenshot('');
                            setGameScreenshotName('');
                          }}
                          className="text-[11px] text-red-400 hover:text-red-300 font-bold px-2 py-1"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload 2: Payout QR Code Screenshot */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <QrCode size={14} className="text-emerald-400" />
                      <span>2. Your Payout QR Code *</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-900/40 relative">
                      <input
                        type="file"
                        accept="image/*"
                        required={!qrCodeImage}
                        onChange={handleQrUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center gap-1 pointer-events-none">
                        <Upload size={20} className="text-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">
                          {qrCodeImageName ? `Selected: ${qrCodeImageName}` : 'Upload Payout QR Code'}
                        </span>
                        <span className="text-[10px] text-slate-500">CashApp, Venmo, or Crypto QR</span>
                      </div>
                    </div>

                    {qrCodeImage && (
                      <div className="mt-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <img
                          src={qrCodeImage}
                          alt="QR Proof"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setQrCodeImage('');
                            setQrCodeImageName('');
                          }}
                          className="text-[11px] text-red-400 hover:text-red-300 font-bold px-2 py-1"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl font-heading font-black text-base tracking-wider bg-gradient-to-r from-[var(--neon-cyan)] to-blue-500 text-black shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:scale-101 active:scale-99 transition-all disabled:opacity-50 mt-4 cursor-pointer"
                >
                  {submitting
                    ? 'SUBMITTING CASHOUT...'
                    : `SUBMIT $${finalAmount.toFixed(2)} CASHOUT REQUEST`}
                </button>
              </div>
            </form>

            {/* Right 5 Columns: Cashout Guidelines */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0d102b] border border-cyan-500/30 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-heading font-bold text-[var(--neon-cyan)] uppercase tracking-wider">
                    Redemption Protocol
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                    GUARANTEED
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">1. External Game Score Verification</strong>
                      <span className="text-[11px] text-slate-400">
                        Our desk reviews your winning screenshot directly on the game platform terminal.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">2. Fast QR Code Dispatch</strong>
                      <span className="text-[11px] text-slate-400">
                        Your payout QR code is scanned and money is dispatched straight to your app.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">3. Rejection Protection Note</strong>
                      <span className="text-[11px] text-slate-400">
                        If any issue occurs, an official note with instructions is provided in your history table.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safe Assurance Card */}
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-[var(--neon-cyan)] flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">Player Protection</h4>
                    <p className="text-[11px] text-slate-400">100% Payout Fulfillment Guaranteed</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>✓ No sneaky rollover locks</div>
                  <div>✓ Full 1:1 USD cash value</div>
                  <div>✓ Verified payout receipts sent to email</div>
                </div>
              </div>
            </div>
          </div>

          {/* Previous Cashout History Table with Reject Reason Notes */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0d102b] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-black text-white flex items-center gap-2">
                <Clock size={16} className="text-[var(--neon-cyan)]" />
                <span>Your Cashout History</span>
              </h3>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading cashouts...</div>
            ) : withdrawHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No cashout requests recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3">Game</th>
                      <th className="pb-3 px-3">Amount</th>
                      <th className="pb-3 px-3">Method</th>
                      <th className="pb-3 px-3">Your Payout Tag</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3">Desk Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {withdrawHistory.map((w) => {
                      const isRejected = w.status === 'rejected' || w.status?.includes('reject');
                      return (
                        <tr key={w.id || w._id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-3 text-slate-400">
                            {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-white font-bold block">{w.gameTitle || 'Game Platform'}</span>
                            {w.gameAccountUsername && (
                              <span className="text-[10px] text-emerald-400 font-mono block">
                                @{w.gameAccountUsername}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[var(--neon-cyan)] font-black">
                            ${Number(w.amount || 0).toFixed(2)} SC
                          </td>
                          <td className="py-3 px-3 text-slate-300">{w.payoutMethod || 'Cash App'}</td>
                          <td className="py-3 px-3 text-amber-300 font-bold select-all">
                            {w.destinationTag || w.destinationAddress || '-'}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                w.status === 'approved' || w.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : isRejected
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : w.status === 'pending_coin' || w.stage === 'coin_verification'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {w.status === 'approved' || w.status === 'completed'
                                ? 'Dispatched ✓'
                                : isRejected
                                ? 'Rejected'
                                : w.status === 'pending_coin' || w.stage === 'coin_verification'
                                ? 'Stage 1: Coin Allotment'
                                : 'Stage 2: Finance Payout'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans">
                            {isRejected && (w.rejectReason || w.coinRejectReason || w.financeRejectReason) ? (
                              <span className="text-[11px] text-red-300 bg-red-950/60 border border-red-500/30 px-2.5 py-1 rounded-lg block max-w-xs break-words">
                                Reason: {w.rejectReason || w.coinRejectReason || w.financeRejectReason}
                              </span>
                            ) : w.status === 'approved' ? (
                              <span className="text-emerald-400 text-[11px] font-semibold">Payout Dispatched ✓</span>
                            ) : w.status === 'pending_coin' || w.stage === 'coin_verification' ? (
                              <span className="text-amber-300 text-[11px] flex items-center gap-1">
                                <Clock className="w-3 h-3 inline animate-pulse" /> Verifying Game Proof
                              </span>
                            ) : (
                              <span className="text-cyan-300 text-[11px] flex items-center gap-1">
                                <Clock className="w-3 h-3 inline animate-pulse" /> Cashier Sending Payout
                              </span>
                            )}
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
  );

  if (isEmbedded) {
    return <div className="w-full">{renderWithdrawMain()}</div>;
  }

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
          if (tab === 'deposit') router.push('/deposit');
          else router.push('/withdraw');
        }}
        onOpenGameRequest={() => router.push('/games')}
        onOpenChat={() => {}}
        onOpenDailyBonus={() => setSpinWheelOpen(true)}
        onOpenSpinWheel={() => setSpinWheelOpen(true)}
      />

      {/* Main Content Layout */}
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
            if (tab === 'deposit') router.push('/deposit');
            else router.push('/withdraw');
          }}
          onOpenSpinWheel={() => setSpinWheelOpen(true)}
        />

        {renderWithdrawMain()}

        {/* Cyber Footer */}
        <CyberFooter />
      </div>

      {/* Daily Spin Wheel Modal */}
      <DailySpinWheelModal
        isOpen={spinWheelOpen}
        onClose={() => setSpinWheelOpen(false)}
        user={user}
        onBalanceUpdated={fetchUser}
      />

      {/* Mobile Bottom Nav */}
      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(mode) => router.push(`/${mode}`)}
        onOpenWallet={(tab) => {
          if (tab === 'deposit') router.push('/deposit');
          else router.push('/withdraw');
        }}
        onOpenSpinWheel={() => setSpinWheelOpen(true)}
      />
    </div>
  );
}
