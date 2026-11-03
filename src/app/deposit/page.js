'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Upload,
  AlertCircle,
  Clock,
  Sparkles,
  QrCode,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  X,
  FileText,
  Gamepad2,
} from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';

export default function DepositPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Settings for Bonus System
  const [settings, setSettings] = useState({
    welcomeBonusPercent: 120,
    regularBonusPercent: 50,
  });

  // Deposit Form State
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [playerPaymentEmail, setPlayerPaymentEmail] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [adminGames, setAdminGames] = useState([]);
  const [userGameAccounts, setUserGameAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // QR Preview Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // History State
  const [depositHistory, setDepositHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 1. Fetch current user & settings
  const fetchUserAndSettings = async (isSilent = false) => {
    if (!isSilent) setLoadingUser(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/admin/settings', { cache: 'no-store' }),
      ]);
      const [uData, sData] = await Promise.all([uRes.json(), sRes.json()]);

      if (uData.authenticated && uData.user) {
        diffSet(setUser, uData.user);
        if (uData.user.email) {
          setPlayerPaymentEmail((prev) => prev || uData.user.email);
        }
      } else if (!isSilent) {
        router.push('/login?redirect=/deposit');
      }

      if (sData.success && sData.settings) {
        diffSet(setSettings, {
          welcomeBonusPercent: Number(sData.settings.welcomeBonusPercent ?? 300),
          regularBonusPercent: Number(sData.settings.regularBonusPercent ?? 50),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingUser(false);
    }
  };

  // 2. Fetch gateways
  const fetchGateways = async () => {
    try {
      const res = await fetch('/api/payments/methods');
      const data = await res.json();
      if (data.success && data.methods && data.methods.length > 0) {
        diffSet(setGateways, data.methods);
        setSelectedGateway((prev) => prev || data.methods[0]);
      } else {
        const defaults = [
          {
            id: 'cashapp',
            name: 'Cash App',
            type: 'cashapp',
            tagName: '$PlayersParadiseCash',
            accountDetails: '$PlayersParadiseCash',
            paymentUrl: 'https://cash.app/$PlayersParadiseCash',
            qrCode: '',
            minDeposit: 10,
            instructions: 'Send exact amount via Cash App. Upload your payment receipt below.',
          },
          {
            id: 'crypto-btc',
            name: 'Bitcoin (BTC)',
            type: 'crypto',
            tagName: 'bc1qplayersparadisehubdeposit777address',
            accountDetails: 'bc1qplayersparadisehubdeposit777address',
            paymentUrl: '',
            qrCode: '',
            minDeposit: 20,
            instructions: 'Send exact BTC equivalent. Paste TxHash or tag below.',
          },
        ];
        diffSet(setGateways, defaults);
        setSelectedGateway((prev) => prev || defaults[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Fetch deposit history (with silent background update support)
  const fetchHistory = async (isSilent = false) => {
    if (!isSilent) setLoadingHistory(true);
    try {
      const res = await fetch('/api/payments/deposit', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.deposits) {
        diffSet(setDepositHistory, data.deposits);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingHistory(false);
    }
  };

  // 4. Fetch player active game accounts
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

  // 5. Fetch verified games created by admin
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
    fetchUserAndSettings();
    fetchGateways();
    fetchHistory();
    fetchGameAccounts();
    fetchAdminGames();

    // Zero-refresh live polling: updates pending deposits as soon as admin approves/rejects
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchHistory(true);
        fetchUserAndSettings(true);
        fetchGameAccounts();
        fetchAdminGames();
      }
    }, 4000);

    const handleUserSync = (e) => {
      if (e.detail) diffSet(setUser, e.detail);
    };

    const handleFocus = () => {
      fetchHistory(true);
      fetchUserAndSettings(true);
    };

    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const handleCopy = (text, fieldName) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleDownloadQR = (qrData, name) => {
    if (!qrData) return;
    const a = document.createElement('a');
    a.href = qrData;
    a.download = `qrcode_${(name || 'gateway').toLowerCase().replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit.');
      return;
    }

    setProofFileName(file.name);
    try {
      const compressed = await compressImage(file, 1200, 0.82);
      setProofImage(compressed || null);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setProofImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  // Bonus Calculation Logic
  const hasApprovedDeposit =
    depositHistory.some((d) => d.status === 'approved' || d.status === 'completed') ||
    Boolean(user?.totalDeposited && user.totalDeposited > 0);

  const bonusPercent = hasApprovedDeposit
    ? settings.regularBonusPercent
    : settings.welcomeBonusPercent;
  const isWelcome = !hasApprovedDeposit;

  const bonusSC = Number(((finalAmount * bonusPercent) / 100).toFixed(2));
  const totalSC = Number((finalAmount + bonusSC).toFixed(2));

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    if (!finalAmount || finalAmount < 5) {
      setStatusMessage({ type: 'error', text: 'Minimum deposit is $5.00' });
      return;
    }

    if (!senderAccount.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your sending Tag Name / Cashtag.' });
      return;
    }

    if (!playerPaymentEmail.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your Payment Tag associated email.' });
      return;
    }

    if (!proofImage) {
      setStatusMessage({ type: 'error', text: 'Please upload your payment proof screenshot.' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const activeGateway = selectedGateway || (gateways && gateways.length > 0 ? gateways[0] : null);
      const chosenMethodName = activeGateway?.name || 'Cash App';
      const chosenMethodId = activeGateway?.id || 'cashapp';

      const linkedAccount = userGameAccounts.find(
        (a) => (a.gameTitle || '').toLowerCase().trim() === selectedGame.toLowerCase().trim()
      );

      const payload = {
        amount: finalAmount,
        method: chosenMethodName,
        methodName: chosenMethodName,
        methodId: chosenMethodId,
        playerTagName: senderAccount.trim(),
        playerPaymentEmail: playerPaymentEmail.trim(),
        senderNote: senderAccount.trim(),
        transactionId: transactionId.trim(),
        txHash: transactionId.trim(),
        proofImage,
        gameTitle: selectedGame,
        gameAccountUsername: linkedAccount ? linkedAccount.username : '',
      };

      const res = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `Deposit request for $${finalAmount.toFixed(2)} submitted! Total ${totalSC.toFixed(2)} SC (${bonusPercent}% bonus included) will be credited upon desk verification.`,
        });
        setSenderAccount('');
        setTransactionId('');
        setProofImage('');
        setProofFileName('');
        fetchHistory();
        fetchUserAndSettings();
      } else {
        setStatusMessage({ type: 'error', text: data.message || data.error || 'Deposit submission failed.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const presetAmounts = [20, 50, 100, 200, 500];
  const activeTagName =
    selectedGateway?.tagName || selectedGateway?.accountDetails || selectedGateway?.tag || '';

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
            if (tab === 'withdraw') router.push('/withdraw');
            else router.push('/deposit');
          }}
        />

        {/* Center Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 lg:pb-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--chrome-border)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-[0_0_40px_var(--neon-cyan-glow)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/10 border border-[var(--chrome-border)] text-[var(--neon-cyan)] text-xs font-bold uppercase tracking-wider mb-2">
                  <ArrowDownLeft size={14} />
                  <span>Instant Player Deposit Gateway</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
                  LOAD YOUR <span className="text-[var(--neon-cyan)]">PLAYING BALANCE</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  Fund your account instantly with 0% fees. Direct crediting for Fire Kirin, Orion Stars, Juwa, Panda Master, and Ultra Panda.
                </p>
              </div>

              {/* Balance Widget Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-[var(--chrome-border)] flex flex-col items-end min-w-[160px]">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  WALLET BALANCE
                </span>
                <span className="font-mono font-black text-2xl sm:text-3xl text-[var(--neon-cyan)] mt-0.5">
                  ${Number(user?.balanceSC ?? user?.balance ?? 0).toFixed(2)} SC
                </span>
                <span className="text-[10px] text-[var(--neon-cyan)]/90 flex items-center gap-1 mt-1 font-mono">
                  <CheckCircle2 size={11} /> 1:1 USD Redeemable
                </span>
              </div>
            </div>
          </div>

          {/* Dual Wallet Desk Tabs: Deposit vs Redeem */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 max-w-md shadow-lg">
            <button
              type="button"
              className="flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all text-black"
              style={{
                background: 'var(--primary-gradient)',
                boxShadow: '0 0 15px var(--neon-cyan-glow)',
              }}
            >
              <ArrowDownLeft size={16} strokeWidth={2.5} />
              <span>Deposit / Load</span>
            </button>
            <Link
              href="/withdraw"
              className="flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              <ArrowUpRight size={16} strokeWidth={2.5} />
              <span>Redeem / Cashout</span>
            </Link>
          </div>

          {/* Alert Message */}
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-all ${
                statusMessage.type === 'success'
                  ? 'bg-slate-900/90 border-[var(--neon-cyan)] text-[var(--neon-cyan)]'
                  : 'bg-red-950/70 border-red-500 text-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Form & Gateway Split Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Step 1, 2, 3 Inputs */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Select Payment Gateway */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--chrome-border)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black"
                      style={{ background: 'var(--primary-gradient)' }}
                    >
                      1
                    </span>
                    Select Payment Gateway
                  </h3>
                  <span className="text-xs text-slate-400">0% Transaction Fee</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {gateways.map((gw) => {
                    const isSelected = selectedGateway?.id === gw.id;
                    return (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedGateway(gw)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-[var(--neon-cyan)] shadow-lg'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                        style={
                          isSelected
                            ? {
                                background: 'rgba(255, 255, 255, 0.05)',
                                boxShadow: '0 0 15px var(--neon-cyan-glow)',
                                borderColor: 'var(--neon-cyan)',
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-heading font-bold text-white truncate">
                            {gw.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 size={14} className="text-[var(--neon-cyan)] flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          Min ${gw.minDeposit || 10}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* DIRECT PAYMENT LINK & INSTRUCTIONS RIGHT UNDER GATEWAY SELECTION */}
                {selectedGateway && (
                  <div className="pt-4 border-t border-slate-800/80 space-y-3">
                    {selectedGateway.paymentUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-300 uppercase block">
                          Instant Payment Link:
                        </span>
                        <a
                          href={selectedGateway.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 rounded-xl text-black font-heading font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
                          style={{
                            background: 'var(--primary-gradient)',
                            boxShadow: '0 0 20px var(--neon-cyan-glow)',
                          }}
                        >
                          <span>OPEN &amp; PAY VIA {selectedGateway.name.toUpperCase()} NOW</span>
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    )}

                    {activeTagName && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                          Tag Name / Cashtag to Send To:
                        </span>
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                          <span className="font-mono font-black text-xs sm:text-sm text-amber-300 select-all break-all">
                            {activeTagName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeTagName, 'gwTag')}
                            className="px-3 py-1.5 rounded-lg text-black text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all cursor-pointer hover:opacity-90"
                            style={{
                              background: 'var(--primary-gradient)',
                              boxShadow: '0 0 10px var(--neon-cyan-glow)',
                            }}
                          >
                            {copiedField === 'gwTag' ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedField === 'gwTag' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Choose Deposit Amount & Live Bonus Preview */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--chrome-border)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black"
                      style={{ background: 'var(--primary-gradient)' }}
                    >
                      2
                    </span>
                    Select Amount ($ USD)
                  </h3>
                  <span className="text-xs text-[var(--neon-cyan)] font-bold flex items-center gap-1 font-mono">
                    <Sparkles size={13} className="text-amber-400" />
                    +{bonusPercent}% {isWelcome ? 'First Deposit Match' : 'Reload Bonus'}
                  </span>
                </div>

                {/* Amount presets */}
                <div className="grid grid-cols-5 gap-2">
                  {presetAmounts.map((p) => {
                    const isSelected = !customAmount && amount === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setAmount(p);
                          setCustomAmount('');
                        }}
                        className={`py-3 rounded-xl font-heading font-bold text-sm transition-all cursor-pointer ${
                          isSelected
                            ? 'text-black shadow-lg font-black'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
                        }`}
                        style={
                          isSelected
                            ? {
                                background: 'var(--primary-gradient)',
                                boxShadow: '0 0 15px var(--neon-cyan-glow)',
                              }
                            : undefined
                        }
                      >
                        ${p}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount input */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                    Or Enter Custom Amount:
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="number"
                      min="5"
                      step="1"
                      placeholder="e.g. 75"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-[var(--neon-cyan)] text-sm"
                    />
                  </div>
                </div>

                {/* Real-time Dynamic Bonus Breakdown Card */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--chrome-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[var(--neon-cyan)] tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-400" />
                      Active Promo Breakdown ({isWelcome ? 'First Deposit Pack' : 'Reload Boost'})
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Deposit: <strong>${finalAmount.toFixed(2)}</strong> + Bonus (+{bonusPercent}%):{' '}
                      <span className="text-[var(--neon-cyan)] font-bold font-mono">+${bonusSC.toFixed(2)} SC</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">
                      Total To Receive:
                    </span>
                    <span className="text-xl font-mono font-black text-[var(--neon-cyan)]">
                      ${totalSC.toFixed(2)} SC
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3: Player Sender Details & Screenshot Upload */}
              <form
                onSubmit={handleSubmitDeposit}
                className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--chrome-border)] space-y-4"
              >
                <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black"
                    style={{ background: 'var(--primary-gradient)' }}
                  >
                    3
                  </span>
                  Submit Proof &amp; Tag Details
                </h3>

                <div className="space-y-3.5">
                  {/* Field: Target Game Platform */}
                  <div>
                    {(() => {
                      const linkedAcc = userGameAccounts.find(
                        (a) => (a.gameTitle || '').toLowerCase().trim() === selectedGame.toLowerCase().trim()
                      );
                      const activeGameList = adminGames.length > 0
                        ? adminGames.map((g) => cleanGameTitle(g.title))
                        : (userGameAccounts.length > 0
                            ? [...new Set(userGameAccounts.map((a) => cleanGameTitle(a.gameTitle)).filter(Boolean))]
                            : []);

                      return (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                              <Gamepad2 size={13} className="text-[var(--neon-cyan)]" />
                              Select Target Game Platform *
                            </label>
                            {linkedAcc ? (
                              <span className="text-[10px] text-[var(--neon-cyan)] font-bold flex items-center gap-1 bg-[var(--neon-cyan)]/10 border border-[var(--chrome-border)] px-2 py-0.5 rounded-full font-mono">
                                <CheckCircle2 size={10} className="text-[var(--neon-cyan)]" />
                                Linked ID: @{linkedAcc.username}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full">
                                <Sparkles size={10} className="text-amber-400" />
                                No Account Yet (Auto Queued)
                              </span>
                            )}
                          </div>

                          <select
                            value={selectedGame || (activeGameList[0] || '')}
                            onChange={(e) => setSelectedGame(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-heading font-bold text-sm focus:outline-none focus:border-[var(--neon-cyan)]"
                          >
                            {activeGameList.map((g) => {
                              const match = userGameAccounts.find(
                                (a) => (a.gameTitle || '').toLowerCase().trim() === g.toLowerCase().trim()
                              );
                              return (
                                <option key={g} value={g} className="bg-slate-900 text-white">
                                  {g} {match ? `— (Username: @${match.username})` : '— (No account yet)'}
                                </option>
                              );
                            })}
                          </select>

                          {linkedAcc ? (
                            <p className="text-[11px] text-[var(--neon-cyan)] mt-1.5 flex items-center gap-1.5">
                              <CheckCircle2 size={12} className="shrink-0" />
                              <span>
                                Your deposit will be associated with your active <strong>{selectedGame}</strong> ID: <code className="text-[var(--neon-cyan)] bg-slate-900/90 border border-[var(--chrome-border)] px-1 py-0.5 rounded">@{linkedAcc.username}</code>
                              </span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-amber-300/90 mt-1.5 flex items-center gap-1.5 bg-amber-950/30 border border-amber-500/20 p-2 rounded-xl">
                              <Sparkles size={13} className="shrink-0 text-amber-400" />
                              <span>
                                You don&apos;t have an account for <strong>{selectedGame}</strong> yet. You can deposit now! Once verified by Finance, an account request will automatically be created so staff can issue your credentials.
                              </span>
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Field: Player Tag Name (Required) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Your Sending Tag Name / Cashtag / Handle *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. $JohnDoe77 / @mycashtag / wallet address"
                      value={senderAccount}
                      onChange={(e) => setSenderAccount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-[var(--neon-cyan)]"
                    />
                    <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                      Enter the exact Cashtag or handle you sent the payment from.
                    </span>
                  </div>

                  {/* Field: Player Payment Email (Required) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Your Payment Tag Associated Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. your-cashapp-email@domain.com"
                      value={playerPaymentEmail}
                      onChange={(e) => setPlayerPaymentEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-[var(--neon-cyan)]"
                    />
                    <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                      Email tied to your payment app so desk agents can match your transaction instantly.
                    </span>
                  </div>

                  {/* Field: Optional Transaction ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Transaction Web Confirmation / Reference ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. #981240192 or TxHash"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-[var(--neon-cyan)]"
                    />
                  </div>

                  {/* Field: Upload Screenshot Proof (Required) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Upload Payment Proof Screenshot *
                    </label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-[var(--neon-cyan)]/60 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-900/40 relative">
                      <input
                        type="file"
                        accept="image/*"
                        required={!proofImage}
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                        <Upload size={22} className="text-[var(--neon-cyan)]" />
                        <span className="text-xs font-bold text-slate-200">
                          {proofFileName ? `Selected: ${proofFileName}` : 'Click or drop payment screenshot here'}
                        </span>
                        <span className="text-[10px] text-slate-500">PNG, JPG, or WEBP up to 5MB</span>
                      </div>
                    </div>

                    {/* Preview Thumbnail */}
                    {proofImage && (
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={proofImage}
                            alt="Receipt Preview"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                          />
                          <span className="text-xs font-mono text-[var(--neon-cyan)] font-bold">
                            Screenshot Ready
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProofImage('');
                            setProofFileName('');
                          }}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold"
                        >
                          Remove
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
                    ? 'SUBMITTING REQUEST...'
                    : `SUBMIT $${finalAmount.toFixed(2)} DEPOSIT (RECEIVE ${totalSC.toFixed(2)} SC)`}
                </button>
              </form>
            </div>

            {/* Right 5 Columns: Gateway Pay Button, Tag Name, QR Code & Download */}
            <div className="lg:col-span-5 space-y-6">
              {selectedGateway && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--chrome-border)] shadow-lg space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-heading font-bold text-[var(--neon-cyan)] uppercase tracking-wider">
                      {selectedGateway.name} Checkout Desk
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--chrome-border)]">
                      LIVE DESK
                    </span>
                  </div>

                  {/* 1. DIRECT PAYMENT LINK BUTTON (If paymentUrl exists) */}
                  {selectedGateway.paymentUrl && (
                    <a
                      href={selectedGateway.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 rounded-2xl text-black font-heading font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: 'var(--primary-gradient)',
                        boxShadow: '0 0 20px var(--neon-cyan-glow)',
                      }}
                    >
                      <span>OPEN &amp; PAY VIA {selectedGateway.name.toUpperCase()}</span>
                      <ExternalLink size={16} />
                    </a>
                  )}

                  {/* 2. TAG NAME / IDENTIFIER WITH 1-CLICK COPY */}
                  {activeTagName && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-300 uppercase block mb-1.5">
                        Tag Name / Cashtag to Send To:
                      </span>
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                        <span className="font-mono font-black text-sm text-amber-300 select-all break-all">
                          {activeTagName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeTagName, 'gwTag')}
                          className="px-3 py-1.5 rounded-xl text-black text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all cursor-pointer hover:opacity-90"
                          style={{
                            background: 'var(--primary-gradient)',
                            boxShadow: '0 0 10px var(--neon-cyan-glow)',
                          }}
                        >
                          {copiedField === 'gwTag' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedField === 'gwTag' ? 'Copied' : 'Copy Tag'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. SCANNABLE QR CODE WITH VIEW & DOWNLOAD BUTTONS */}
                  {selectedGateway.qrCode && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-300 uppercase">
                        Scan &amp; Pay QR Code:
                      </span>
                      <div
                        className="p-2.5 bg-white rounded-xl cursor-pointer hover:scale-102 transition shadow-lg"
                        onClick={() => setQrModalOpen(true)}
                        title="Click to zoom QR Code"
                      >
                        <img
                          src={selectedGateway.qrCode}
                          alt={`${selectedGateway.name} QR Code`}
                          className="w-36 h-36 object-contain"
                        />
                      </div>

                      {/* View & Download Buttons */}
                      <div className="flex items-center gap-2 w-full pt-1">
                        <button
                          type="button"
                          onClick={() => setQrModalOpen(true)}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye size={14} className="text-[var(--neon-cyan)]" />
                          <span>View Full</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadQR(selectedGateway.qrCode, selectedGateway.name)}
                          className="flex-1 py-2 px-3 rounded-xl border border-[var(--chrome-border)] text-[var(--neon-cyan)] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:bg-slate-800/80"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <Download size={14} />
                          <span>Download QR</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Gateway Instructions */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <AlertCircle size={14} />
                      <span>Instructions:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      {selectedGateway.instructions ||
                        'Send exact payment amount to the Tag or QR Code above. Upload screenshot proof with your tag name and associated email to verify.'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Average verification speed: <strong>1 to 3 minutes</strong> 24/7.
                    </p>
                  </div>
                </div>
              )}

              {/* Safe Escrow Assurance Card */}
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-[var(--chrome-border)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--neon-cyan)]/20 border border-[var(--chrome-border)] text-[var(--neon-cyan)] flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">Rich Room VIP Guarantee</h4>
                    <p className="text-[11px] text-slate-400">All deposits are 100% verified &amp; credited</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>✓ Instant direct wallet top-up upon review</div>
                  <div>✓ Bonus automatically credited into playable coins</div>
                  <div>✓ 24/7 Financial Desk supervision</div>
                </div>
              </div>
            </div>
          </div>

          {/* Previous Deposit History Table */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--chrome-border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-black text-white flex items-center gap-2">
                <Clock size={16} className="text-[var(--neon-cyan)]" />
                <span>Your Deposit History</span>
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
              <div className="p-8 text-center text-slate-500 text-xs">Loading deposits...</div>
            ) : depositHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No deposit requests recorded yet. Make your first deposit above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3">Game Platform</th>
                      <th className="pb-3 px-3">Method</th>
                      <th className="pb-3 px-3">Base USD</th>
                      <th className="pb-3 px-3">Total Coins</th>
                      <th className="pb-3 px-3">Your Tag / Email</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {depositHistory.map((d) => {
                      const totalCoins = d.totalSC || d.amount;
                      const isRejected = d.status === 'rejected' || d.status === 'REJECTED';
                      return (
                        <tr key={d.id || d._id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-3 text-slate-400">
                            {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-heading font-bold text-white text-xs block">
                              {d.gameTitle || 'Standard'}
                            </span>
                            {d.gameAccountUsername ? (
                              <span className="text-[10.5px] text-[var(--neon-cyan)] font-mono block">
                                @{d.gameAccountUsername}
                              </span>
                            ) : d.gameTitle ? (
                              <span className="text-[9.5px] text-amber-300 font-sans block">
                                Auto-request pending
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 px-3 text-white font-bold">{d.methodName || d.method || 'Cash App'}</td>
                          <td className="py-3 px-3 text-slate-300 font-bold">
                            ${Number(d.amount || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-[var(--neon-cyan)] font-black">
                            ${Number(totalCoins).toFixed(2)} SC
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            <div>{d.playerTagName || d.senderNote || '-'}</div>
                            {d.playerPaymentEmail && (
                              <div className="text-[10px] text-slate-500">{d.playerPaymentEmail}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                d.status === 'approved' || d.status === 'completed'
                                  ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--chrome-border)]'
                                  : isRejected
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {d.status || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {isRejected && d.rejectReason ? (
                              <span className="text-[11px] text-red-300 bg-red-950/60 border border-red-500/30 px-2.5 py-1 rounded-lg block max-w-xs break-words font-sans">
                                Reason: {d.rejectReason}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] font-sans">Verified by Desk</span>
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

      {/* QR Code Zoom Modal */}
      {qrModalOpen && selectedGateway?.qrCode && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="relative bg-slate-950 border border-[var(--chrome-border)] p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="font-heading font-black text-base text-white">
              {selectedGateway.name} QR Code
            </h3>
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-inner">
              <img
                src={selectedGateway.qrCode}
                alt={`${selectedGateway.name} QR`}
                className="w-56 h-56 object-contain"
              />
            </div>
            {activeTagName && (
              <p className="font-mono text-xs text-amber-300 select-all font-bold">
                {activeTagName}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownloadQR(selectedGateway.qrCode, selectedGateway.name)}
                className="w-full py-2.5 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  background: 'var(--primary-gradient)',
                  boxShadow: '0 0 15px var(--neon-cyan-glow)',
                }}
              >
                <Download size={14} />
                <span>Save to Device</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
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
