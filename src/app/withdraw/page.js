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
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';

export default function WithdrawPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Withdrawal Form State
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState('Cash App');
  const [recipientTag, setRecipientTag] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [adminGames, setAdminGames] = useState([]);
  const [userGameAccounts, setUserGameAccounts] = useState([]);

  // Proof uploads (Required by rules)
  const [gameScreenshot, setGameScreenshot] = useState('');
  const [gameScreenshotName, setGameScreenshotName] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [qrCodeImageName, setQrCodeImageName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // History State
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 1. Fetch current user
  const fetchUser = async (isSilent = false) => {
    if (!isSilent) setLoadingUser(true);
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

  // 2. Fetch withdrawal history
  const fetchHistory = async (isSilent = false) => {
    if (!isSilent) setLoadingHistory(true);
    try {
      const res = await fetch('/api/payments/withdraw', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.redemptions) {
        diffSet(setWithdrawHistory, data.redemptions);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Fetch verified games created by admin
  const fetchAdminGames = async () => {
    try {
      const res = await fetch('/api/games', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.games) && data.games.length > 0) {
        const cleanList = data.games.map((g) => ({
          ...g,
          title: cleanGameTitle(g.title || '')
        }));
        diffSet(setAdminGames, cleanList);
        setSelectedGame((prev) => {
          if (prev && cleanList.some((g) => g.title.toLowerCase().trim() === prev.toLowerCase().trim())) {
            return prev;
          }
          return cleanList[0]?.title || '';
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchHistory();
    fetchGameAccounts();
    fetchAdminGames();

    // Zero-refresh live polling: fast updates as soon as admin approves/rejects
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchHistory(true);
        fetchUser(true);
        fetchGameAccounts();
        fetchAdminGames();
      }
    }, 2000);

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

  const compressImage = (file, maxDim = 1200, quality = 0.82) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleGameScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return alert('Screenshot file must be under 15MB');
    setGameScreenshotName(file.name);
    try {
      const compressed = await compressImage(file, 1200, 0.82);
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
    if (file.size > 15 * 1024 * 1024) return alert('QR Code file must be under 15MB');
    setQrCodeImageName(file.name);
    try {
      const compressed = await compressImage(file, 800, 0.85);
      setQrCodeImage(compressed || null);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setQrCodeImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  const handleSubmitWithdraw = async (e) => {
    e.preventDefault();
    if (!finalAmount || finalAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid withdrawal amount.' });
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

  const activeGameList = adminGames.length > 0
    ? adminGames.map((g) => cleanGameTitle(g.title))
    : (userGameAccounts.length > 0
        ? [...new Set(userGameAccounts.map((a) => cleanGameTitle(a.gameTitle)).filter(Boolean))]
        : []);

  const presetAmounts = [20, 50, 100, 250, 500];

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
        />

        {/* Center Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 lg:pb-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--chrome-border)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-[0_0_40px_var(--neon-cyan-glow)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/10 border border-[var(--chrome-border)] text-[var(--neon-cyan)] text-xs font-bold uppercase tracking-wider mb-2">
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
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-[var(--chrome-border)] flex flex-col items-end min-w-[170px]">
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

          {/* Dual Wallet Desk Tabs: Deposit vs Redeem */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 max-w-md shadow-lg">
            <Link
              href="/deposit"
              className="flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              <ArrowDownLeft size={16} strokeWidth={2.5} />
              <span>Deposit / Load</span>
            </Link>
            <button
              type="button"
              className="flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all text-black"
              style={{
                background: 'var(--primary-gradient)',
                boxShadow: '0 0 15px var(--neon-cyan-glow)',
              }}
            >
              <ArrowUpRight size={16} strokeWidth={2.5} />
              <span>Redeem / Cashout</span>
            </button>
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
                  <span className="text-xs text-slate-400">Min $20.00</span>
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
                            <span className="text-[10px] text-[var(--neon-cyan)] font-bold flex items-center gap-1 bg-[var(--neon-cyan)]/10 border border-[var(--chrome-border)] px-2 py-0.5 rounded-full font-mono">
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
                          value={selectedGame || (activeGameList[0] || '')}
                          onChange={(e) => setSelectedGame(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl bg-slate-900 border text-white font-heading font-bold text-sm focus:outline-none transition-colors ${
                            linkedAcc
                              ? 'border-slate-700 focus:border-[var(--neon-cyan)]'
                              : 'border-red-500/80 focus:border-red-400'
                          }`}
                        >
                          {activeGameList.map((g) => {
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
                          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-[var(--chrome-border)] flex items-center gap-2 mt-2 text-[var(--neon-cyan)] text-xs">
                            <CheckCircle2 size={14} className="text-[var(--neon-cyan)] shrink-0" />
                            <span>
                              Verified Game Account: <strong className="font-mono text-white bg-slate-950 border border-[var(--chrome-border)] px-1.5 py-0.5 rounded">@{linkedAcc.username}</strong> will be submitted to Coin Allotment.
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
                  <span className="text-xs text-slate-400 font-mono">1 SC = $1.00 USD</span>
                </div>

                {/* Presets */}
                <div className="grid grid-cols-5 gap-2">
                  {presetAmounts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setAmount(p);
                        setCustomAmount('');
                      }}
                      className={`py-3 rounded-xl font-heading font-bold text-sm transition-all cursor-pointer ${
                        !customAmount && amount === p
                          ? 'bg-[var(--neon-cyan)] text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      ${p}
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                    Or Enter Exact Amount:
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 150"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-[var(--neon-cyan)] text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    💡 You can request to cash out any amount won from your game platform. Upload your score proof below for instant desk verification.
                  </p>
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
                      <QrCode size={14} className="text-[var(--neon-cyan)]" />
                      <span>2. Your Payout QR Code *</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-[var(--neon-cyan)]/60 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-900/40 relative">
                      <input
                        type="file"
                        accept="image/*"
                        required={!qrCodeImage}
                        onChange={handleQrUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center gap-1 pointer-events-none">
                        <Upload size={20} className="text-[var(--neon-cyan)]" />
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
                  className="w-full py-4 rounded-2xl font-heading font-black text-base tracking-wider text-black hover:scale-101 active:scale-99 transition-all disabled:opacity-50 mt-4 cursor-pointer"
                  style={{
                    background: 'var(--primary-gradient)',
                    boxShadow: '0 0 25px var(--neon-cyan-glow)',
                  }}
                >
                  {submitting
                    ? 'SUBMITTING CASHOUT...'
                    : `SUBMIT $${finalAmount.toFixed(2)} CASHOUT REQUEST`}
                </button>
              </div>
            </form>

            {/* Right 5 Columns: Cashout Guidelines */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--chrome-border)] shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-heading font-bold text-[var(--neon-cyan)] uppercase tracking-wider">
                    Redemption Protocol
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]">
                    GUARANTEED
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-[var(--neon-cyan)] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">1. External Game Score Verification</strong>
                      <span className="text-[11px] text-slate-400">
                        Our desk reviews your winning screenshot directly on the game platform terminal.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-[var(--neon-cyan)] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">2. Fast QR Code Dispatch</strong>
                      <span className="text-[11px] text-slate-400">
                        Your payout QR code is scanned and money is dispatched straight to your app.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-[var(--neon-cyan)] shrink-0 mt-0.5" />
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
                              <span className="text-[10px] text-[var(--neon-cyan)] font-mono block">
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
                                  ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--chrome-border)]'
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
                              <span className="text-[var(--neon-cyan)] text-[11px] font-semibold">Payout Dispatched ✓</span>
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

        {/* Cyber Footer */}
        <CyberFooter />
      </div>

      {/* Mobile Bottom Nav */}
      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(mode) => router.push(`/${mode}`)}
        onOpenWallet={(tab) => {
          if (tab === 'deposit') router.push('/deposit');
          else router.push('/withdraw');
        }}
      />
    </div>
  );
}
