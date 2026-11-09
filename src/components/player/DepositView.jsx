'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';
import { getAvailableGamePlatforms } from '@/lib/gameAssets';
import { findAccountForGame } from '@/lib/gameAccountMatch';
import { readCachedGameAccountSeeds } from '@/lib/gameAccountsClientCache';
import { loadPlayerGameAccountsForEmail } from '@/lib/playerGameAccountsClient';
import { subscribePlayerAccountsSync } from '@/lib/playerAccountSync';
import CyberFooter from '@/components/common/CyberFooter';
import DailySpinWheelModal from '@/components/common/DailySpinWheelModal';
import { compressImageFile } from '@/lib/imageCompress';
import { getCachedUser, mergePlayerUser } from '@/lib/authClient';
import { writePaymentMethodsCache } from '@/lib/paymentMethodsCache';
import {
  readPaymentMethodsInstant,
  fetchPaymentMethods,
} from '@/lib/paymentMethodsClient';
import { CACHE_KEYS, readSessionCache, writeSessionCache } from '@/lib/playerDataCache';
import { readAdminGamesFromCache, refreshAdminGamesCatalog } from '@/lib/playerGamesCatalog';
import { readInitialGamesCatalog } from '@/lib/gamesClientCache';
import { fetchJsonQuick, fetchJsonWithTimeout } from '@/lib/fetchWithTimeout';
import { REALTIME_TYPES } from '@/lib/realtimePublish';
import { broadcastStaffNewDeposit } from '@/lib/staffAlertsSync';

export default function DepositView({ isEmbedded = false, onSelectTab, seedReadyAccounts = [] }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);

  // Settings for Bonus System
  const [settings, setSettings] = useState({
    welcomeBonusPercent: 100,
    regularBonusPercent: 10,
    welcomeBonusActive: true,
    regularBonusActive: true,
  });

  // Deposit Form State (never show placeholder demo gateways — cache or API only)
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [loadingGateways, setLoadingGateways] = useState(true);
  const [gatewaysError, setGatewaysError] = useState(null);
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [playerPaymentEmail, setPlayerPaymentEmail] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [selectedGame, setSelectedGame] = useState(() => {
    if (seedReadyAccounts?.length) return cleanGameTitle(seedReadyAccounts[0].gameTitle);
    const email = getCachedUser()?.email;
    const cached = email ? readCachedGameAccountSeeds(email).active : [];
    return cached.length ? cleanGameTitle(cached[0].gameTitle) : '';
  });
  const [adminGames, setAdminGames] = useState(() => {
    const fromCatalog = readInitialGamesCatalog('all', '');
    if (fromCatalog?.length) return fromCatalog;
    if (typeof window !== 'undefined') {
      try {
        const cached = readSessionCache(CACHE_KEYS.GAMES_LIST);
        if (cached?.length) return cached;
      } catch {}
    }
    return [];
  });
  const [userGameAccounts, setUserGameAccounts] = useState(() => {
    if (seedReadyAccounts?.length) return seedReadyAccounts;
    const email = getCachedUser()?.email;
    return email ? readCachedGameAccountSeeds(email).active : [];
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // QR Preview Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // History State
  const [depositHistory, setDepositHistory] = useState(() => {
    const cached = readSessionCache(CACHE_KEYS.DEPOSIT_HISTORY);
    return Array.isArray(cached) ? cached : [];
  });
  const [loadingHistory, setLoadingHistory] = useState(
    () => !readSessionCache(CACHE_KEYS.DEPOSIT_HISTORY)?.length
  );

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
          loadPlayerGameAccountsForEmail(uData.user.email).then(({ active }) => {
            if (!active.length) return;
            diffSet(setUserGameAccounts, active);
            setSelectedGame((prev) => {
              if (findAccountForGame(active, prev, adminGames)) return cleanGameTitle(prev);
              return cleanGameTitle(active[0].gameTitle);
            });
          });
        }
      } else if (!isSilent) {
        router.push('/login?redirect=/deposit');
      }

      if (sData.success && sData.settings) {
        diffSet(setSettings, {
          welcomeBonusPercent: Number(sData.settings.welcomeBonusPercent ?? 100),
          regularBonusPercent: Number(sData.settings.regularBonusPercent ?? 10),
          welcomeBonusActive: sData.settings.welcomeBonusActive !== false,
          regularBonusActive: sData.settings.regularBonusActive !== false,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingUser(false);
    }
  };

  const applyGatewayList = useCallback((methods) => {
    if (!methods?.length) {
      setGateways([]);
      setSelectedGateway(null);
      setGatewaysError(
        'No deposit gateways are active. Ask staff to enable gateways in Admin → Payment Gateways.'
      );
      return;
    }
    writePaymentMethodsCache(methods);
    diffSet(setGateways, methods);
    setGatewaysError(null);
    setSelectedGateway((prev) => {
      if (prev && methods.some((m) => m.id === prev.id)) return prev;
      return methods[0];
    });
  }, []);

  const fetchGateways = useCallback(
    async (isSilent = false) => {
      if (!isSilent && gateways.length === 0) setLoadingGateways(true);
      try {
        const methods = await fetchPaymentMethods({ force: !isSilent });
        applyGatewayList(methods);
      } catch (err) {
        console.error(err);
        const cached = readPaymentMethodsInstant();
        if (cached?.length) {
          applyGatewayList(cached);
        } else if (!isSilent) {
          setGatewaysError('Could not load payment options. Check your connection and tap Retry.');
        }
      } finally {
        setLoadingGateways(false);
      }
    },
    [applyGatewayList, gateways.length]
  );

  // 3. Fetch deposit history (with silent background update support and lightweight query)
  const fetchHistory = async (isSilent = false) => {
    if (!isSilent && depositHistory.length === 0) setLoadingHistory(true);
    try {
      const res = await fetch('/api/payments/deposit?lightweight=true', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.deposits) {
        diffSet(setDepositHistory, data.deposits);
        writeSessionCache(CACHE_KEYS.DEPOSIT_HISTORY, data.deposits);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingHistory(false);
    }
  };

  const fetchGameAccounts = useCallback(async () => {
    const email = user?.email || getCachedUser()?.email;
    if (!email) return;
    try {
      const { active } = await loadPlayerGameAccountsForEmail(email);
      if (!active.length) return;
      diffSet(setUserGameAccounts, active);
      setSelectedGame((prev) => {
        if (findAccountForGame(active, prev, adminGames)) return cleanGameTitle(prev);
        return cleanGameTitle(active[0].gameTitle);
      });
    } catch (err) {
      console.error(err);
    }
  }, [user?.email, adminGames]);

  const syncGamesCatalog = async (force = false) => {
    const games = await refreshAdminGamesCatalog({ force });
    if (games?.length) setAdminGames(games);
  };

  useEffect(() => {
    if (!seedReadyAccounts?.length) return;
    diffSet(setUserGameAccounts, seedReadyAccounts);
    setSelectedGame((prev) => {
      if (findAccountForGame(seedReadyAccounts, prev, adminGames)) return cleanGameTitle(prev);
      return cleanGameTitle(seedReadyAccounts[0].gameTitle);
    });
  }, [seedReadyAccounts, adminGames]);

  useEffect(() => {
    // 0ms instant hydrate client cache
    try {
      const cachedGames = readSessionCache(CACHE_KEYS.GAMES_LIST);
      if (cachedGames?.length) setAdminGames(cachedGames);
      const cachedHist = readSessionCache(CACHE_KEYS.DEPOSIT_HISTORY);
      if (cachedHist?.length) setDepositHistory(cachedHist);
    } catch {}

    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setLoadingUser(false);
      if (cached.email) setPlayerPaymentEmail((prev) => prev || cached.email);
    }

    fetchUserAndSettings(true);
    const cachedGw = readPaymentMethodsInstant();
    if (cachedGw?.length) {
      applyGatewayList(cachedGw);
      setLoadingGateways(false);
    }
    fetchPaymentMethods({ force: true }).then((methods) => applyGatewayList(methods));
    fetchHistory(true);
    fetchGameAccounts();
    const cachedCatalog = readAdminGamesFromCache();
    if (cachedCatalog?.length) setAdminGames(cachedCatalog);
    syncGamesCatalog(true);

    // Live polling — history/accounts only (games catalog uses 5m cache)
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchHistory(true);
        fetchUserAndSettings(true);
        fetchGameAccounts();
        fetchGateways(true);
      }
    }, 8000);

    const handleUserSync = (e) => {
      if (e.detail) {
        diffSet(setUser, (prev) => mergePlayerUser(e.detail, prev));
        fetchGateways(true);
        fetchGameAccounts();
        syncGamesCatalog(true);
      } else {
        const cached = getCachedUser();
        if (cached) diffSet(setUser, cached);
        else setUser(null);
      }
    };

    const handleFocus = () => {
      fetchHistory(true);
      fetchUserAndSettings(true);
      fetchGameAccounts();
      syncGamesCatalog(true);
      fetchGateways(true);
    };

    const unsubscribeAccounts = subscribePlayerAccountsSync(() => fetchGameAccounts());

    const handleCashierRefresh = () => {
      fetchHistory(true);
      fetchUserAndSettings(true);
      fetchGateways(true);
      syncGamesCatalog(true);
      fetchGameAccounts();
    };

    const handleDepositUpdated = (e) => {
      const ev = e.detail || {};
      if (ev.type && ev.type !== REALTIME_TYPES.FINANCE_DEPOSIT) return;
      fetchHistory(true);
      fetchUserAndSettings(true);
      if (ev.action === 'approve' || ev.status === 'approved') {
        const credited = ev.creditedSC != null ? Number(ev.creditedSC) : null;
        if (credited != null && !Number.isNaN(credited)) {
          diffSet(setUser, (prev) => {
            const base = prev || getCachedUser() || {};
            const nextBal = Number((Number(base.balanceSC || base.balance || 0) + credited).toFixed(2));
            return mergePlayerUser({ balanceSC: nextBal, balance: nextBal }, base);
          });
        }
        setStatusMessage({
          type: 'success',
          text:
            credited != null && !Number.isNaN(credited)
              ? `Deposit approved! ${credited.toFixed(2)} SC added to your wallet.`
              : 'Deposit approved! Your wallet balance has been updated.',
        });
      }
    };

    const handleInstantSync = (e) => {
      const ev = e.detail;
      if (ev?.type === REALTIME_TYPES.FINANCE_DEPOSIT) {
        handleDepositUpdated(e);
      }
    };

    const handlePaymentMethodsEvent = (e) => {
      const methods = e.detail?.methods;
      if (Array.isArray(methods)) applyGatewayList(methods);
    };

    window.addEventListener('paradise-user-sync', handleUserSync);
    window.addEventListener('paradise-cashier-refresh', handleCashierRefresh);
    window.addEventListener('paradise-deposit-updated', handleDepositUpdated);
    window.addEventListener('paradise-instant-sync', handleInstantSync);
    window.addEventListener('paradise-payment-methods', handlePaymentMethodsEvent);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      unsubscribeAccounts();
      clearInterval(pollInterval);
      window.removeEventListener('paradise-cashier-refresh', handleCashierRefresh);
      window.removeEventListener('paradise-deposit-updated', handleDepositUpdated);
      window.removeEventListener('paradise-instant-sync', handleInstantSync);
      window.removeEventListener('paradise-payment-methods', handlePaymentMethodsEvent);
      window.removeEventListener('paradise-user-sync', handleUserSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchGameAccounts, applyGatewayList, fetchGateways]);

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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit.');
      return;
    }

    setProofFileName(file.name);
    try {
      const compressed = await compressImageFile(file, { maxSize: 900, quality: 0.55 });
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
    Boolean(user?.welcomeBonusClaimed) ||
    Boolean(user?.totalDeposited && user.totalDeposited > 0) ||
    depositHistory.some((d) => d.status === 'approved' || d.status === 'completed');

  const bonusType = hasApprovedDeposit ? 'regular' : 'welcome';
  const isWelcome = !hasApprovedDeposit;

  const isBonusActive = hasApprovedDeposit
    ? settings.regularBonusActive !== false
    : settings.welcomeBonusActive !== false;

  const bonusPercent = !isBonusActive
    ? 0
    : hasApprovedDeposit
    ? Number(settings.regularBonusPercent ?? 10)
    : Number(settings.welcomeBonusPercent ?? 100);

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

    const activeGateway = selectedGateway || (gateways?.length ? gateways[0] : null);
    if (!activeGateway || loadingGateways) {
      setStatusMessage({
        type: 'error',
        text: 'Payment gateways are still loading. Please wait a moment and try again.',
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage({
      type: 'info',
      text: 'Sending your deposit request to the desk…',
    });

    let tempId;

    try {
      const chosenMethodName = activeGateway.name || 'Payment';
      const chosenMethodId = activeGateway.id;

      const linkedAccount = findAccountForGame(userGameAccounts, selectedGame, adminGames);

      const proofPayload = proofImage;
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
        gameTitle: selectedGame,
        gameAccountUsername: linkedAccount ? linkedAccount.username : '',
        bonusType,
        bonusPercent,
        proofDeferred: true,
      };

      // 0ms Optimistic UI update: Instantly show pending deposit in history table
      tempId = 'temp_' + Date.now();
      const optimisticDeposit = {
        id: tempId,
        _id: tempId,
        amount: finalAmount,
        totalSC,
        bonusSC,
        bonusPercent,
        bonusType,
        status: 'pending',
        methodName: chosenMethodName,
        gameTitle: selectedGame || null,
        gameAccountUsername: linkedAccount ? linkedAccount.username : '',
        createdAt: new Date().toISOString(),
      };
      setDepositHistory((prev) => [optimisticDeposit, ...prev]);

      broadcastStaffNewDeposit({
        depositId: tempId,
        amount: finalAmount,
        username: user?.username || 'Player',
        methodName: chosenMethodName,
        totalSC,
        bonusSC,
        gameTitle: selectedGame || '',
        playerTagName: senderAccount.trim(),
        txHash: transactionId.trim(),
        hasProof: Boolean(proofImage),
      });

      const { res, data } = await fetchJsonQuick(
        '/api/payments/deposit',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        20000
      );

      setSubmitting(false);

      if (res.ok && data.success) {
        const realId = data.depositId;
        if (realId) {
          setDepositHistory((prev) =>
            prev.map((d) =>
              d.id === tempId ? { ...d, id: realId, _id: realId } : d
            )
          );
          broadcastStaffNewDeposit({
            depositId: realId,
            replacesDepositId: tempId,
            amount: finalAmount,
            username: user?.username || 'Player',
            methodName: chosenMethodName,
            totalSC,
            bonusSC,
            gameTitle: selectedGame || '',
            playerTagName: senderAccount.trim(),
            txHash: transactionId.trim(),
            hasProof: Boolean(proofPayload),
          });
          void fetchJsonWithTimeout(
            '/api/payments/deposit/proof',
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ depositId: realId, proofImage: proofPayload }),
            },
            120000
          ).catch(() => {});
        }
        setStatusMessage({
          type: 'success',
          text: `Deposit request for $${finalAmount.toFixed(2)} submitted! Total ${totalSC.toFixed(2)} SC (${bonusPercent}% bonus included) will be credited upon desk verification.`,
        });
        setSenderAccount('');
        setTransactionId('');
        setProofImage('');
        setProofFileName('');
        fetchHistory(true);
        fetchUserAndSettings(true);

      } else {
        // Rollback optimistic item on failure
        setDepositHistory((prev) => prev.filter((d) => d.id !== tempId));
        setStatusMessage({ type: 'error', text: data.message || data.error || 'Deposit submission failed.' });
      }
    } catch (err) {
      setDepositHistory((prev) => prev.filter((d) => d.id !== tempId));
      setStatusMessage({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const presetAmounts = [20, 50, 100, 200, 500];
  const activeTagName =
    selectedGateway?.tagName || selectedGateway?.accountDetails || selectedGateway?.tag || '';
  const compact = isEmbedded;

  const renderDepositMain = () => (
    <>
      {/* Center Content Body */}
      <main
        className={`max-w-7xl w-full mx-auto ${compact ? 'py-3 space-y-4' : 'py-6 space-y-6'} ${
          isEmbedded ? 'px-0 sm:px-1' : 'flex-1 px-4 sm:px-6 lg:px-8'
        }`}
      >
          {/* Header Banner */}
          <div
            className={`relative overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-[#0c102b] shadow-[0_0_40px_rgba(16,185,129,0.12)] ${
              compact ? 'rounded-2xl p-3 sm:p-4' : 'rounded-3xl p-6 sm:p-8'
            }`}
          >
            <div className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0">
                <h1
                  className={`font-heading font-black text-white tracking-tight ${
                    compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'
                  }`}
                >
                  {compact ? (
                    <>
                      <span className="text-emerald-400">Deposit</span> · 0% fee
                    </>
                  ) : (
                    <>
                      LOAD YOUR <span className="text-emerald-400">PLAYING BALANCE</span>
                    </>
                  )}
                </h1>
                {!compact && (
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                    Fund instantly via Cash App, crypto, or Zelle — bonus applied on verify.
                  </p>
                )}
              </div>

              <div
                className={`rounded-xl bg-slate-950/80 border border-emerald-500/40 flex flex-col items-end shrink-0 ${
                  compact ? 'p-2.5 min-w-[120px]' : 'p-4 min-w-[160px]'
                }`}
              >
                <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Balance</span>
                <span className={`font-mono font-black text-emerald-400 ${compact ? 'text-lg' : 'text-2xl sm:text-3xl'}`}>
                  ${Number(user?.balanceSC ?? user?.balance ?? 0).toFixed(2)}
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

          {/* Form — compact 2-column desktop */}
          <div className={compact ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
            <div className={compact ? 'space-y-4' : 'lg:col-span-12 xl:col-span-7 space-y-4'}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Step 1: Select Payment Gateway */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0d102b] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    Select Payment Gateway
                  </h3>
                  <span className="text-xs text-slate-400">0% Transaction Fee</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {loadingGateways && gateways.length === 0 ? (
                    [0, 1, 2].map((i) => (
                      <div
                        key={`gw-skel-${i}`}
                        className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse min-h-[72px]"
                      >
                        <div className="h-3 w-20 bg-slate-700 rounded mb-2" />
                        <div className="h-2 w-14 bg-slate-800 rounded" />
                      </div>
                    ))
                  ) : gateways.length === 0 ? (
                    <div className="col-span-full p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 text-amber-100 text-xs space-y-2">
                      <p>{gatewaysError || 'No deposit gateways configured.'}</p>
                      <button
                        type="button"
                        onClick={() => fetchGateways(false)}
                        className="text-[11px] font-bold text-amber-300 underline"
                      >
                        Retry loading gateways
                      </button>
                    </div>
                  ) : null}
                  {gateways.map((gw) => {
                    const isSelected = selectedGateway?.id === gw.id;
                    return (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedGateway(gw)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-heading font-bold text-white truncate">
                            {gw.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          Min ${gw.minDeposit || 10}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Checkout Desk — send payment to gateway */}
              {selectedGateway && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0d102b] border border-emerald-500/30 shadow-lg space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-black">
                        2
                      </span>
                      {selectedGateway.name} Checkout Desk
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                      LIVE DESK
                    </span>
                  </div>

                  {selectedGateway.paymentUrl && (
                    <a
                      href={selectedGateway.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--neon-cyan)] to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-heading font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>OPEN &amp; PAY VIA {selectedGateway.name.toUpperCase()}</span>
                      <ExternalLink size={16} />
                    </a>
                  )}

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
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-colors cursor-pointer"
                        >
                          {copiedField === 'gwTag' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedField === 'gwTag' ? 'Copied' : 'Copy Tag'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedGateway.qrCode && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setQrModalOpen(true)}
                        className="p-1 bg-white rounded-lg shrink-0"
                      >
                        <img
                          src={selectedGateway.qrCode}
                          alt="QR"
                          className="w-[72px] h-[72px] object-contain"
                        />
                      </button>
                      <input
                        type="button"
                        value="View / Save QR"
                        onClick={() => setQrModalOpen(true)}
                        className="flex-1 py-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 leading-snug">
                    {selectedGateway.instructions ||
                      'Pay exact amount, then submit proof below (verify ~1–3 min).'}
                  </p>
                </div>
              )}
              </div>

              {/* Steps 3–4: amount + proof */}
              <form
                onSubmit={handleSubmitDeposit}
                className="p-4 sm:p-5 rounded-2xl bg-[#0d102b] border border-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    Amount &amp; proof
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono" suppressHydrationWarning>
                    +{bonusPercent}% → ${totalSC.toFixed(2)} SC total
                  </span>
                </div>

                {/* Amount presets */}
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
                          ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      ${p}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="5"
                      step="1"
                      placeholder="Custom $"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0" suppressHydrationWarning>
                    ${finalAmount.toFixed(0)} + ${bonusSC.toFixed(0)} bonus
                  </span>
                </div>

                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2 pt-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black">
                    4
                  </span>
                  Game, tag &amp; proof
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Field: Target Game Platform */}
                  <div>
                    {(() => {
                      const displayGames = getAvailableGamePlatforms(adminGames, userGameAccounts);
                      const currentSelected = selectedGame || displayGames[0] || '';
                      const linkedAcc = findAccountForGame(userGameAccounts, currentSelected, adminGames);

                      return (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                              <Gamepad2 size={13} className="text-cyan-400" />
                              Select Target Game Platform *
                            </label>
                            {linkedAcc ? (
                              <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                                <CheckCircle2 size={10} className="text-emerald-400" />
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
                            value={selectedGame}
                            onChange={(e) => setSelectedGame(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-heading font-bold text-sm focus:outline-none focus:border-cyan-400"
                          >
                            {displayGames.map((g) => {
                              const match = findAccountForGame(userGameAccounts, g, adminGames);
                              return (
                                <option key={g} value={g} className="bg-slate-900 text-white">
                                  {g} {match ? `— (Username: @${match.username})` : '— (No account yet)'}
                                </option>
                              );
                            })}
                          </select>

                          {!linkedAcc && (
                            <p className="text-[10px] text-amber-300/90 mt-1">
                              No ID yet — finance will queue one after approve.
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
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Payment email *</label>
                    <input
                      type="email"
                      required
                      placeholder="Cash App / Zelle email"
                      value={playerPaymentEmail}
                      onChange={(e) => setPlayerPaymentEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Ref ID (optional)</label>
                    <input
                      type="text"
                      placeholder="Tx # / hash"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Upload Payment Proof Screenshot *
                    </label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-3 text-center cursor-pointer transition-colors bg-slate-900/40 relative">
                      <input
                        type="file"
                        accept="image/*"
                        required={!proofImage}
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                        <Upload size={22} className="text-emerald-400" />
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
                          <span className="text-xs font-mono text-emerald-400 font-bold">
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
                  className="w-full py-3 rounded-xl font-heading font-black text-sm tracking-wider bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {submitting
                    ? 'SUBMITTING REQUEST...'
                    : `SUBMIT $${finalAmount.toFixed(2)} DEPOSIT (RECEIVE ${totalSC.toFixed(2)} SC)`}
                </button>
              </form>
            </div>

            {!compact && (
              <div className="hidden xl:block xl:col-span-5">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1 sticky top-4">
                  <div className="font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    Verified 24/7 desk
                  </div>
                  <p>✓ Bonus on approve · ✓ Wallet top-up · ✓ Live support</p>
                </div>
              </div>
            )}
          </div>

          {/* Deposit history — collapsed by default to save scroll */}
          <div className="rounded-2xl bg-[#0d102b] border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-900/50 transition-colors"
            >
              <h3 className="text-sm font-heading font-black text-white flex items-center gap-2">
                <Clock size={15} className="text-emerald-400" />
                Deposit history
                {depositHistory.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-500">({depositHistory.length})</span>
                )}
              </h3>
              <span className="text-[10px] text-slate-400">{showHistory ? 'Hide' : 'Show'}</span>
            </button>

            {showHistory && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={fetchHistory}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw size={11} />
                Refresh
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
                              <span className="text-[10.5px] text-emerald-400 font-mono block">
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
                          <td className="py-3 px-3 text-emerald-400 font-black">
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
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
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
            )}
          </div>
        </main>

        {/* QR Code Zoom Modal */}
        {qrModalOpen && selectedGateway?.qrCode && (
          <div
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setQrModalOpen(false)}
          >
            <div
              className="relative bg-slate-950 border border-emerald-400/50 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl"
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
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Save to Device</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );

  if (isEmbedded) {
    return <div className="w-full">{renderDepositMain()}</div>;
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
          if (tab === 'withdraw') router.push('/withdraw');
          else router.push('/deposit');
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
            if (tab === 'withdraw') router.push('/withdraw');
            else router.push('/deposit');
          }}
          onOpenSpinWheel={() => setSpinWheelOpen(true)}
        />

        {renderDepositMain()}

        {/* Cyber Footer */}
        <CyberFooter />
      </div>

      {/* Daily Spin Wheel Modal */}
      <DailySpinWheelModal
        isOpen={spinWheelOpen}
        onClose={() => setSpinWheelOpen(false)}
        user={user}
        onBalanceUpdated={fetchUserAndSettings}
      />

      {/* Mobile Bottom Nav */}
      <CyberMobileBottomNav
        user={user}
        onOpenAuth={(mode) => router.push(`/${mode}`)}
        onOpenWallet={(tab) => {
          if (tab === 'withdraw') router.push('/withdraw');
          else router.push('/deposit');
        }}
        onOpenSpinWheel={() => setSpinWheelOpen(true)}
      />
    </div>
  );
}
