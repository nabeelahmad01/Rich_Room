'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Gamepad2,
  Activity,
  CreditCard,
  Coins,
  FileSpreadsheet,
  MessageSquare,
  ShieldCheck,
  Gift,
  Users,
  UserCheck,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  ChevronDown,
  X,
  Search,
  Download,
  Send,
  Eye,
  AlertCircle,
  RefreshCw,
  Key,
  Clock,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  DollarSign,
  UserMinus,
  Menu,
  ArrowLeft,
  Bell,
  Music,
  ExternalLink,
  Edit2,
  Upload,
  Power,
  ImageIcon,
  Smartphone,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  QrCode,
  Headphones,
  User,
  CheckCheck,
  Megaphone,
  Copy,
  Flame,
  Tag,
  Paperclip,
  Save,
  Zap,
  Receipt,
} from 'lucide-react';
import FinanceDepositsView from '@/components/admin/FinanceDepositsView';
import FinanceRedemptionsView from '@/components/admin/FinanceRedemptionsView';
import FinanceUnifiedDesk from '@/components/admin/FinanceUnifiedDesk';
import AccountRequestsView from '@/components/admin/AccountRequestsView';
import CoinOperationsDesk from '@/components/admin/CoinOperationsDesk';
import SoundSettingsModal from '@/components/admin/SoundSettingsModal';
import IncomingRequestToast from '@/components/admin/IncomingRequestToast';
import Player360ProfileModal from '@/components/admin/Player360ProfileModal';
import AffiliateManagementHub from '@/components/admin/AffiliateManagementHub';
import {
  playTune,
  unlockAudioContext,
  AVAILABLE_TUNES,
  updateFaviconBadge,
  sendDesktopNotification,
  requestDesktopNotificationPermission,
} from '@/lib/soundAlerts';
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';
import {
  mergeDepositsOptimistic,
  mergeRedemptionsOptimistic,
  mergeAccountRequestsOptimistic,
} from '@/lib/mergeAdminLists';

export default function AdminPortal({ initialTab }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Normalize initialTab
  const normalizeTab = (tab) => {
    if (!tab) return 'overview';
    if (tab === 'dashboard') return 'overview';
    if (tab === 'requests') return 'account_requests';
    if (tab === 'support') return 'chat';
    if (tab === 'coins' || tab === 'coins_allotment') return 'coins_allotment';
    return tab;
  };

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'admin' && parts[1]) {
        return normalizeTab(parts[1]);
      }
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam) return normalizeTab(tabParam);
    }
    return normalizeTab(initialTab);
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab]);

  // Audio Chime & Notifications State
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(true);
  const [alertTune, setAlertTune] = useState('chaching');
  const [alertVolume, setAlertVolume] = useState(0.7);
  const [soundModalOpen, setSoundModalOpen] = useState(false);
  const [activeAlertToast, setActiveAlertToast] = useState(null);
  const [refreshingFinance, setRefreshingFinance] = useState(false);

  // Load sound settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTune = localStorage.getItem('vegas_admin_alert_tune');
      if (savedTune) setAlertTune(savedTune);
      const savedVol = localStorage.getItem('vegas_admin_alert_volume');
      if (savedVol) setAlertVolume(parseFloat(savedVol));
      const savedEnabled = localStorage.getItem('vegas_admin_alert_enabled');
      if (savedEnabled !== null) setAudioAlertsEnabled(savedEnabled !== 'false');
    }
  }, []);

  const handleSelectTune = (tuneId) => {
    setAlertTune(tuneId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vegas_admin_alert_tune', tuneId);
    }
  };

  const handleChangeVolume = (vol) => {
    setAlertVolume(vol);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vegas_admin_alert_volume', vol.toString());
    }
  };

  const handleToggleSound = (enabled) => {
    setAudioAlertsEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vegas_admin_alert_enabled', enabled ? 'true' : 'false');
    }
  };

  const playAdminChime = (overrideTune = null) => {
    if (!audioAlertsEnabled || typeof window === 'undefined') return;
    try {
      unlockAudioContext();
      playTune(overrideTune || alertTune, alertVolume);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  // Player Accounts State (users tab)
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [adjustModal, setAdjustModal] = useState({ open: false, user: null, amount: '', reason: '' });
  const [resetPassModal, setResetPassModal] = useState({ open: false, user: null, newPass: '' });
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [playerFilter, setPlayerFilter] = useState('all');

  // URL synchronization
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      const currentPath = window.location.pathname;
      const targetPath = `/admin/${activeTab}`;
      if (currentPath !== targetPath && currentPath.startsWith('/admin')) {
        window.history.pushState({ tab: activeTab }, '', targetPath);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'admin' && parts[1]) {
        setActiveTab(normalizeTab(parts[1]));
      } else if (parts[0] === 'admin') {
        setActiveTab('overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Login form state if not authenticated as staff
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Overview Stats
  const [stats, setStats] = useState(null);

  // Games Tab state
  const [games, setGames] = useState([]);
  const [newGame, setNewGame] = useState({
    title: '',
    provider: 'Players Paradise Studio',
    thumbnail: '/images/vegas-777.svg',
    badge: 'HOT',
    url: '',
    isActive: true,
  });
  const [editingGame, setEditingGame] = useState(null);
  const [isSavingGame, setIsSavingGame] = useState(false);
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [isAddGatewayModalOpen, setIsAddGatewayModalOpen] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState(null);

  const handleGameImageFile = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
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
        const dataUrl = canvas.toDataURL('image/webp', 0.85);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Finance state
  const [financeSubTab, setFinanceSubTab] = useState('deposits');
  const [deposits, setDeposits] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [newMethod, setNewMethod] = useState({
    name: '',
    type: 'cashapp',
    tag: 'Instant',
    accountDetails: '',
    paymentUrl: '',
    qrCode: '',
    instructions: '',
    minDeposit: 10,
    maxDeposit: 2500,
  });
  const [editGatewayModal, setEditGatewayModal] = useState({ open: false, data: null });
  const [previewQrModal, setPreviewQrModal] = useState(null);
  const [cashoutMethods, setCashoutMethods] = useState([]);
  const [newCashoutMethod, setNewCashoutMethod] = useState({ name: '', placeholder: '', minCashout: 1 });

  // Players Ledger state
  const [ledgerRecords, setLedgerRecords] = useState([]);
  const [ledgerFilterUser, setLedgerFilterUser] = useState('');
  const [ledgerFilterType, setLedgerFilterType] = useState('all');
  const [previewProofImage, setPreviewProofImage] = useState(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState(null);

  // Live Chat state
  const [chatConversations, setChatConversations] = useState([]);
  const [activeChatConv, setActiveChatConv] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReplyText, setChatReplyText] = useState('');
  const [chatAttachedImage, setChatAttachedImage] = useState(null);
  const [isUploadingChatImage, setIsUploadingChatImage] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatFilterTab, setChatFilterTab] = useState('all');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatMessagesEndRef = useRef(null);
  const adminChatFileInputRef = useRef(null);
  const prevAdminChatMsgCountRef = useRef(0);
  const prevAdminChatConvIdRef = useRef(null);
  const [selectedChatImagePreview, setSelectedChatImagePreview] = useState(null);

  // Push Notifications & Omnichannel Broadcast state
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushStatus, setPushStatus] = useState(null);
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  const [isDispatchingPush, setIsDispatchingPush] = useState(false);

  // Affiliates state
  const [affiliates, setAffiliates] = useState([]);
  const [affiliateSummary, setAffiliateSummary] = useState(null);
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [affiliateFilter, setAffiliateFilter] = useState('all');
  const [selectedAffiliateNetwork, setSelectedAffiliateNetwork] = useState(null);
  const [isSettlingAffiliate, setIsSettlingAffiliate] = useState(false);

  // Staff Management state
  const [staffList, setStaffList] = useState([]);
  const [newStaff, setNewStaff] = useState({ username: '', email: '', password: '', role: 'financial_manager' });

  // System & Platform Settings state
  const [sysSettings, setSysSettings] = useState({
    geoRestrictionEnabled: false,
    welcomeBonusPercent: 300,
    welcomeBonusMax: 7500,
    welcomeBonusSpins: 150,
    welcomeBonusTitle: 'WELCOME BONUS',
    welcomeBonusSubtitle: 'Get a 300% bonus on your first deposit! Instant approval & fast cashouts.',
    welcomeBonusActive: true,
    regularBonusPercent: 50,
    regularBonusMax: 2500,
    regularBonusTitle: 'REGULAR BONUS',
    regularBonusSubtitle: 'Get a 50% reload bonus on every deposit you make! Boost your wallet balance anytime.',
    regularBonusActive: true,
    referralBonusPercent: 20,
    referralBonusActive: true,
    freeplayAmountSC: 5.0,
    freeplayActive: true,
  });
  const [savingBonusSettings, setSavingBonusSettings] = useState(false);
  const [bonusSaveMessage, setBonusSaveMessage] = useState(null);
  const settingsLoadedRef = useRef(false);

  // Live Promotions & Campaign Management state
  const [adminPromos, setAdminPromos] = useState([]);
  const [loadingAdminPromos, setLoadingAdminPromos] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [newPromoForm, setNewPromoForm] = useState({
    title: '',
    badge: 'HOT OFFER',
    description: '',
    matchPercent: 100,
    category: 'deposit',
  });

  // Custom editable deposit coin allotment state
  const [customDepositSC, setCustomDepositSC] = useState({});

  // Mobile navigation drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Profile dropdown menu state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [profileDropdownOpen]);

  // Admin chat mobile keyboard offset
  const [adminChatKeyboardOffset, setAdminChatKeyboardOffset] = useState(0);

  // Android Native Back Button support for mobile Admin
  useEffect(() => {
    const handlePopState = () => {
      if (activeChatConv) {
        setActiveChatConv(null);
      }
      if (mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeChatConv, mobileSidebarOpen]);

  // Handle mobile keyboard resize in Admin chat
  useEffect(() => {
    if (activeTab !== 'chat') {
      setAdminChatKeyboardOffset(0);
      return;
    }
    const updateOffset = () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setAdminChatKeyboardOffset(offset > 80 ? offset : 0);
      }
    };
    window.visualViewport?.addEventListener('resize', updateOffset);
    window.visualViewport?.addEventListener('scroll', updateOffset);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateOffset);
      window.visualViewport?.removeEventListener('scroll', updateOffset);
    };
  }, [activeTab]);

  const handleSaveBonusSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingBonusSettings(true);
    setBonusSaveMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeBonusPercent: Number(sysSettings?.welcomeBonusPercent ?? 300),
          welcomeBonusActive: sysSettings?.welcomeBonusActive !== false,
          welcomeBonusTitle: sysSettings?.welcomeBonusTitle || 'WELCOME BONUS',
          welcomeBonusSubtitle: sysSettings?.welcomeBonusSubtitle || 'Get a 300% bonus on your first deposit! Instant approval & fast cashouts.',
          regularBonusPercent: Number(sysSettings?.regularBonusPercent ?? 50),
          regularBonusActive: sysSettings?.regularBonusActive !== false,
          regularBonusTitle: sysSettings?.regularBonusTitle || 'REGULAR BONUS',
          regularBonusSubtitle: sysSettings?.regularBonusSubtitle || 'Get a 50% reload bonus on every deposit you make! Boost your wallet balance anytime.',
          referralBonusPercent: Number(sysSettings?.referralBonusPercent ?? 20),
          referralBonusActive: sysSettings?.referralBonusActive !== false,
          freeplayAmountSC: Number(sysSettings?.freeplayAmountSC ?? 5.0),
          freeplayActive: sysSettings?.freeplayActive !== false,
          minRedemptionSC: Number(sysSettings?.minRedemptionSC ?? 1),
          cashoutRules: sysSettings?.cashoutRules ?? '',
        }),
      });
      const data = await res.json();
      setSavingBonusSettings(false);
      if (data.success) {
        setBonusSaveMessage('Bonus configuration saved successfully!');
        if (data.settings) {
          setSysSettings(prev => ({ ...prev, ...data.settings }));
        }
        try {
          const settingsChan = new BroadcastChannel('paradise_settings_sync');
          settingsChan.postMessage({ type: 'SETTINGS_UPDATED', settings: data.settings, time: Date.now() });
          settingsChan.close();
        } catch {}
        try {
          localStorage.setItem('paradise_settings_sync', String(Date.now()));
        } catch {}
        fetchAdminPromotions();
        setTimeout(() => setBonusSaveMessage(null), 3500);
      } else {
        alert(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      setSavingBonusSettings(false);
      alert('Error saving settings: ' + err.message);
    }
  };

  const fetchAdminPromotions = async () => {
    setLoadingAdminPromos(true);
    try {
      const res = await fetch('/api/promotions?admin=true', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setAdminPromos(data.promotions || []);
      }
    } catch {}
    setLoadingAdminPromos(false);
  };

  const handleDeletePromotion = async (promoId, promoTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${promoTitle || 'this promotion'}" permanently from the website?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/promotions?id=${encodeURIComponent(promoId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setAdminPromos((prev) => prev.filter((p) => (p._id || p.id) !== promoId));
        alert('Promotion deleted successfully from the website!');
      } else {
        alert(data.error || 'Failed to delete promotion.');
      }
    } catch (err) {
      alert('Error deleting promotion: ' + err.message);
    }
  };

  const handleTogglePromoActive = async (promo) => {
    const promoId = promo._id || promo.id;
    const nextState = !promo.active;
    try {
      const res = await fetch('/api/promotions', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: promoId, active: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminPromos((prev) =>
          prev.map((p) => ((p._id || p.id) === promoId ? { ...p, active: nextState } : p))
        );
      } else {
        alert(data.error || 'Failed to update promotion status.');
      }
    } catch (err) {
      alert('Error updating promotion: ' + err.message);
    }
  };

  const handleCreatePromo = async (e) => {
    if (e) e.preventDefault();
    if (!newPromoForm.title.trim() || !newPromoForm.description.trim()) {
      alert('Please provide title and description.');
      return;
    }
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPromoForm,
          matchPercent: Number(newPromoForm.matchPercent || 0),
          active: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPromoModalOpen(false);
        setNewPromoForm({
          title: '',
          badge: 'HOT OFFER',
          description: '',
          matchPercent: 100,
          category: 'deposit',
        });
        fetchAdminPromotions();
        alert('New promotion launched on website successfully!');
      } else {
        alert(data.error || 'Failed to create promotion.');
      }
    } catch (err) {
      alert('Error creating promotion: ' + err.message);
    }
  };

  // Account Requests state (strictly ACCOUNT_CREATION)
  const [accountRequests, setAccountRequests] = useState([]);
  const [accountReqFilter, setAccountReqFilter] = useState('PENDING');
  const [approvalModal, setApprovalModal] = useState({ open: false, request: null, username: '', password: '' });
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Coin Load Requests state (strictly COIN_LOAD for Coins Allotment desk & badges)
  const [coinLoadRequests, setCoinLoadRequests] = useState([]);

  const fetchAccountRequests = () => {
    fetch(`/api/account-requests?type=ACCOUNT_CREATION&status=${accountReqFilter}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAccountRequests((prev) => mergeAccountRequestsOptimistic(prev, d.accountRequests || []));
        }
      })
      .catch(() => { });
  };

  const handleOpenApproveModal = (req) => {
    const cleanUser = (req.userName || req.userEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
    const randSuf = Math.floor(100 + Math.random() * 900);
    const randPass = 'Vegas' + Math.floor(1000 + Math.random() * 9000);
    setApprovalModal({
      open: true,
      request: req,
      username: `${cleanUser}${randSuf}`,
      password: randPass,
    });
  };

  const handleConfirmApproval = async () => {
    if (!approvalModal.request || !approvalModal.username || !approvalModal.password || submittingApproval) return;
    setSubmittingApproval(true);

    const targetReq = approvalModal.request;
    const u = approvalModal.username.trim();
    const p = approvalModal.password.trim();

    // 1. Optimistically update account requests state (0ms)
    setAccountRequests((prev) =>
      prev.map((r) =>
        r.id === targetReq.id
          ? { ...r, status: 'READY', gameAccountUsername: u, gameAccountPassword: p }
          : r
      )
    );

    // 2. Dismiss modal and toast immediately for instant 0ms user feedback
    setApprovalModal({ open: false, request: null, username: '', password: '' });
    setActiveAlertToast((curr) => (curr?.type === 'account' ? null : curr));

    try {
      const res = await fetch('/api/account-requests', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetReq.id,
          action: 'approve',
          username: u,
          password: p,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Failed to issue credentials');
        fetchAccountRequests();
      } else {
        syncRequestsAndAlerts();
      }
    } catch (e) {
      console.error(e);
      fetchAccountRequests();
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleCancelRequest = async (id) => {
    const reason = prompt('Enter rejection reason for player:', 'Temporary platform maintenance. Please contact 24/7 Concierge.');
    if (!reason) return;

    // Optimistically mark as rejected (0ms)
    setAccountRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'REJECTED', rejectionReason: reason } : r))
    );
    setActiveAlertToast((curr) => (curr?.type === 'account' ? null : curr));

    try {
      await fetch('/api/account-requests', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cancel', reason }),
      });
      syncRequestsAndAlerts();
    } catch (e) {
      console.error(e);
      fetchAccountRequests();
    }
  };

  // Coins Allotment state & handlers
  const [allotmentSearch, setAllotmentSearch] = useState('');
  const [allotmentPlayers, setAllotmentPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [allotmentAction, setAllotmentAction] = useState('credit'); // 'credit' | 'debit'
  const [allotmentCurrency, setAllotmentCurrency] = useState('SC'); // 'SC' | 'GC'
  const [allotmentAmount, setAllotmentAmount] = useState('');
  const [allotmentReason, setAllotmentReason] = useState('Deposit Match');
  const [allotmentLoading, setAllotmentLoading] = useState(false);
  const [allotmentSuccessMsg, setAllotmentSuccessMsg] = useState(null);
  const [allotmentErrorMsg, setAllotmentErrorMsg] = useState(null);
  const [allotmentHistory, setAllotmentHistory] = useState([]);
  const [allotmentLedgerFilter, setAllotmentLedgerFilter] = useState('all');

  const fetchAllotmentData = (searchQuery = allotmentSearch) => {
    fetch(`/api/coins/allotment?q=${encodeURIComponent(searchQuery)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const players = d.players || [];
          setAllotmentPlayers(players);
          setSelectedPlayer(prev => {
            if (prev) {
              const updated = players.find(p => p.id === prev.id);
              return updated || prev;
            }
            return players.length > 0 ? players[0] : null;
          });
        }
      })
      .catch(() => { });

    fetch('/api/coins/allotment?history=true', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setAllotmentHistory(d.history || []);
      })
      .catch(() => { });
  };

  const handleExecuteAllotment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPlayer) {
      setAllotmentErrorMsg('Please search and select a player first.');
      return;
    }
    const num = Number(allotmentAmount);
    if (!num || num <= 0) {
      setAllotmentErrorMsg('Please specify an amount greater than zero.');
      return;
    }
    if (!allotmentReason.trim()) {
      setAllotmentErrorMsg('Please provide an audit reason.');
      return;
    }

    setAllotmentLoading(true);
    setAllotmentSuccessMsg(null);
    setAllotmentErrorMsg(null);

    // Optimistic balance update for instant (0ms) UI feedback
    const prevPlayer = { ...selectedPlayer };
    const delta = allotmentAction === 'credit' ? num : -num;
    const currentBal = allotmentCurrency === 'SC' ? (selectedPlayer.balanceSC || 0) : (selectedPlayer.balanceGC || 0);
    const optimisticBal = Math.max(0, currentBal + delta);
    setSelectedPlayer(prev => prev ? {
      ...prev,
      [allotmentCurrency === 'SC' ? 'balanceSC' : 'balanceGC']: optimisticBal,
    } : null);

    try {
      const res = await fetch('/api/coins/allotment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          action: allotmentAction,
          currency: allotmentCurrency,
          amount: num,
          reason: allotmentReason.trim(),
        }),
      });
      const data = await res.json();
      setAllotmentLoading(false);
      if (data.success) {
        setAllotmentSuccessMsg(data.message || `Successfully executed ${allotmentAction} of ${num} ${allotmentCurrency}.`);
        setSelectedPlayer(prev => prev ? {
          ...prev,
          [allotmentCurrency === 'SC' ? 'balanceSC' : 'balanceGC']: data.newBalance,
        } : null);
        setAllotmentAmount('');
        fetchAllotmentData();
      } else {
        setSelectedPlayer(prevPlayer);
        setAllotmentErrorMsg(data.error || 'Failed to execute coin allotment.');
      }
    } catch (err) {
      setAllotmentLoading(false);
      setSelectedPlayer(prevPlayer);
      setAllotmentErrorMsg('Network error: ' + err.message);
    }
  };

  // Check current session
  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me?admin=true', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.authenticated && data.user && data.user.role !== 'player') {
        setUser(data.user);
        // Default starting tab based on role or URL initialTab
        if (initialTab) {
          setActiveTab(normalizeTab(initialTab));
        } else if (data.user.role === 'coin_manager') {
          setActiveTab('coins_allotment');
        } else if (data.user.role === 'chat_support') {
          setActiveTab('chat');
        } else {
          setActiveTab('overview');
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Browser Desktop & Chrome Push Notification State
  const [desktopNotifPerm, setDesktopNotifPerm] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const enableDesktopNotifications = async () => {
    unlockAudioContext();
    const perm = await requestDesktopNotificationPermission();
    setDesktopNotifPerm(perm);
    if (perm === 'granted') {
      playAdminChime();
      sendDesktopNotification(
        '🔔 Instant Alerts Enabled!',
        'You will now receive Chrome notifications with sound for all new game requests, deposits & chat messages.',
        '/admin'
      );
    }
  };

  useEffect(() => {
    fetchSession();
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setDesktopNotifPerm(Notification.permission);
      }
      // Auto-unlock audio on user interaction anywhere
      const unlockInteraction = () => unlockAudioContext();
      window.addEventListener('click', unlockInteraction);
      window.addEventListener('keydown', unlockInteraction);
      window.addEventListener('pointerdown', unlockInteraction);
      return () => {
        window.removeEventListener('click', unlockInteraction);
        window.removeEventListener('keydown', unlockInteraction);
        window.removeEventListener('pointerdown', unlockInteraction);
      };
    }
  }, []);

  // Persistent background sync: deposits, redemptions, game account requests, and live support chat
  // Monitored 24/7 so admins get instant chime + toast + Chrome push notifications regardless of active tab!
  const prevCountsRef = React.useRef({
    requests: 0,
    deposits: 0,
    redemptions: 0,
    coinLoads: 0,
    coinCashouts: 0,
    chat: 0,
  });
  const seenRequestIdsRef = React.useRef(new Set());
  const seenDepositIdsRef = React.useRef(new Set());
  const seenWithdrawIdsRef = React.useRef(new Set());
  const isInitialLoadRef = React.useRef(true);

  const syncRequestsAndAlerts = async () => {
    if (!user) return;
    try {
      const [depRes, withRes, reqRes, loadRes, chatRes] = await Promise.allSettled([
        fetch('/api/payments/deposit?status=all&lightweight=true', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/payments/withdraw?status=all&lightweight=true', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/account-requests?type=ACCOUNT_CREATION&status=all', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/account-requests?type=COIN_LOAD&status=all', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/chat?inbox=true', { credentials: 'include', cache: 'no-store' }),
      ]);

      const depData = depRes.status === 'fulfilled' ? await depRes.value.json().catch(() => ({})) : {};
      const withData = withRes.status === 'fulfilled' ? await withRes.value.json().catch(() => ({})) : {};
      const reqData = reqRes.status === 'fulfilled' ? await reqRes.value.json().catch(() => ({})) : {};
      const loadData = loadRes.status === 'fulfilled' ? await loadRes.value.json().catch(() => ({})) : {};
      const chatData = chatRes.status === 'fulfilled' ? await chatRes.value.json().catch(() => ({})) : {};

      if (depData.success) {
        diffSet(setDeposits, (prev) => mergeDepositsOptimistic(prev, depData.deposits || []));
      }
      if (withData.success) {
        diffSet(setRedemptions, (prev) => mergeRedemptionsOptimistic(prev, withData.redemptions || []));
      }
      if (reqData.success) {
        diffSet(setAccountRequests, (prev) => mergeAccountRequestsOptimistic(prev, reqData.accountRequests || []));
      }
      if (loadData.success) {
        diffSet(setCoinLoadRequests, (prev) => mergeAccountRequestsOptimistic(prev, loadData.accountRequests || []));
      }
      if (chatData.success && Array.isArray(chatData.conversations)) {
        diffSet(setChatConversations, chatData.conversations);
      }

      const pendingDeps = (depData.deposits || []).filter((d) => d.status === 'pending');
      const pendingWith = (withData.redemptions || []).filter((r) => r.status === 'pending');
      const pendingReqs = (reqData.accountRequests || []).filter((r) => (r.status || '').toUpperCase() === 'PENDING');
      const pendingCoinLoads = (loadData.accountRequests || []).filter((r) => (r.status || '').toUpperCase() === 'PENDING');
      const pendingCoinCashouts = (withData.redemptions || []).filter((r) => r.status === 'pending_coin' || r.stage === 'coin_verification');
      const unreadChatConvs = (chatData.conversations || []).filter((c) => (c.unreadCount || 0) > 0);
      const unreadChatCount = unreadChatConvs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

      // Update Chrome Badge, Dynamic Favicon Badge & Tab Title
      const totalPending =
        pendingDeps.length +
        pendingWith.length +
        pendingReqs.length +
        pendingCoinLoads.length +
        pendingCoinCashouts.length +
        unreadChatCount;

      if (typeof document !== 'undefined') {
        if (totalPending > 0) {
          document.title = `(${totalPending}) Rich Room | Admin Operations`;
          updateFaviconBadge(totalPending);
          if ('setAppBadge' in navigator) navigator.setAppBadge(totalPending).catch(() => {});
        } else {
          document.title = 'Rich Room | Admin Operations';
          updateFaviconBadge(0);
          if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
        }
      }

      if (isInitialLoadRef.current) {
        pendingDeps.forEach((d) => seenDepositIdsRef.current.add(d.id || d._id));
        pendingWith.forEach((r) => seenWithdrawIdsRef.current.add(r.id || r._id));
        pendingReqs.forEach((r) => seenRequestIdsRef.current.add(r.id || r._id));
        prevCountsRef.current = {
          deposits: pendingDeps.length,
          redemptions: pendingWith.length,
          requests: pendingReqs.length,
          coinLoads: pendingCoinLoads.length,
          coinCashouts: pendingCoinCashouts.length,
          chat: unreadChatCount,
        };

        // Alert on initial load if pending items are waiting (include sound — same as live updates)
        if (pendingDeps.length > 0) {
          const newest = pendingDeps[0];
          unlockAudioContext();
          playAdminChime();
          setActiveAlertToast({
            type: 'deposit',
            title: `💰 Pending Deposit ($${Number(newest?.amount || 0).toFixed(2)})`,
            message: `${newest?.username || 'Player'} awaiting approval`,
            subtext: `Via ${newest?.methodName || 'Payment'}`,
            targetTab: 'finance',
            targetSubTab: 'deposits',
          });
        } else if (pendingWith.length > 0) {
          const newest = pendingWith[0];
          unlockAudioContext();
          playAdminChime();
          setActiveAlertToast({
            type: 'redemption',
            title: `💸 Pending Cashout ($${Number(newest?.amount || 0).toFixed(2)})`,
            message: `${newest?.username || 'Player'} awaiting payout`,
            subtext: `Via ${newest?.payoutMethod || 'Direct'}`,
            targetTab: 'finance',
            targetSubTab: 'redemptions',
          });
        } else if (pendingReqs.length > 0) {
          const newest = pendingReqs[0];
          unlockAudioContext();
          playAdminChime();
          setActiveAlertToast({
            type: 'account',
            title: '🎯 Pending Game ID Request',
            message: `${newest?.gameTitle || 'Game'} request from ${newest?.userName || 'Player'}`,
            subtext: 'Tap to review & issue credentials',
            targetTab: 'account_requests',
          });
        }

        isInitialLoadRef.current = false;
        return;
      }

      // Check each category independently so no request is swallowed!

      // 1. Account creation request (Game ID request from "GET ID")
      const newPendingReqs = pendingReqs.filter((r) => !seenRequestIdsRef.current.has(r.id || r._id));
      if (newPendingReqs.length > 0 || pendingReqs.length > (prevCountsRef.current.requests || 0)) {
        pendingReqs.forEach((r) => seenRequestIdsRef.current.add(r.id || r._id));
        const newest = newPendingReqs[0] || pendingReqs[0];
        unlockAudioContext();
        playAdminChime();
        const alertTitle = '🎯 New Game ID Request!';
        const alertBody = `${newest?.gameTitle || 'Game'} ID requested by ${newest?.userName || 'Player'}`;
        sendDesktopNotification(alertTitle, alertBody, '/admin/account_requests');
        setActiveAlertToast({
          type: 'account',
          title: alertTitle,
          message: `${newest?.gameTitle || 'Game'} request from ${newest?.userName || 'Player'}`,
          subtext: 'Tap to review & issue credentials',
          targetTab: 'account_requests',
        });
      } else if (pendingReqs.length === 0) {
        setActiveAlertToast((curr) => (curr?.type === 'account' ? null : curr));
      }

      // 2. Incoming new deposits
      const newPendingDeps = pendingDeps.filter((d) => !seenDepositIdsRef.current.has(d.id || d._id));
      if (newPendingDeps.length > 0 || pendingDeps.length > (prevCountsRef.current.deposits || 0)) {
        pendingDeps.forEach((d) => seenDepositIdsRef.current.add(d.id || d._id));
        const newest = newPendingDeps[0] || pendingDeps[0];
        unlockAudioContext();
        playAdminChime();
        const alertTitle = '💰 New Deposit Request!';
        const alertBody = `$${Number(newest?.amount || 0).toFixed(2)} USD from ${newest?.username || 'Player'} via ${newest?.methodName || 'Payment'}`;
        sendDesktopNotification(alertTitle, alertBody, '/admin/finance');
        setActiveAlertToast({
          type: 'deposit',
          title: alertTitle,
          message: `$${Number(newest?.amount || 0).toFixed(2)} USD from ${newest?.username || 'Player'}`,
          subtext: `Via ${newest?.methodName || 'Payment'}${newest?.senderNote ? ` • ${newest.senderNote}` : ''}`,
          targetTab: 'finance',
          targetSubTab: 'deposits',
        });
      } else if (pendingDeps.length === 0) {
        setActiveAlertToast((curr) => (curr?.type === 'deposit' ? null : curr));
      }

      // 3. Incoming new redemptions / cashouts
      const newPendingWith = pendingWith.filter((r) => !seenWithdrawIdsRef.current.has(r.id || r._id));
      if (newPendingWith.length > 0 || pendingWith.length > (prevCountsRef.current.redemptions || 0)) {
        pendingWith.forEach((r) => seenWithdrawIdsRef.current.add(r.id || r._id));
        const newest = newPendingWith[0] || pendingWith[0];
        unlockAudioContext();
        playAdminChime();
        const alertTitle = '💸 New Cashout Request!';
        const alertBody = `$${Number(newest?.amount || 0).toFixed(2)} SC for ${newest?.username || 'Player'} via ${newest?.payoutMethod || 'Direct'}`;
        sendDesktopNotification(alertTitle, alertBody, '/admin/finance');
        setActiveAlertToast({
          type: 'redemption',
          title: alertTitle,
          message: `$${Number(newest?.amount || 0).toFixed(2)} SC for ${newest?.username || 'Player'}`,
          subtext: `Payout via ${newest?.payoutMethod || 'Direct'}: ${newest?.destinationAddress || ''}`,
          targetTab: 'finance',
          targetSubTab: 'redemptions',
        });
      } else if (pendingWith.length === 0) {
        setActiveAlertToast((curr) => (curr?.type === 'redemption' ? null : curr));
      }

      // 4. Incoming coin load / freeplay allotment requests
      if (pendingCoinLoads.length > (prevCountsRef.current.coinLoads || 0)) {
        const newest = pendingCoinLoads[0];
        const isFp = Boolean(newest?.isFreeplay || newest?.freeplayPending);
        unlockAudioContext();
        playAdminChime();
        const alertTitle = isFp ? '🎁 New Freeplay Allotment Request!' : '⚡ New Coin Load Request!';
        const alertBody = isFp
          ? `$${Number(newest?.transferAmount || 0).toFixed(2)} SC Freeplay for ${newest?.gameTitle || 'Game'} from ${newest?.userName || 'Player'}`
          : `$${Number(newest?.transferAmount || 0).toFixed(2)} SC load for ${newest?.gameTitle || 'Game'} from ${newest?.userName || 'Player'}`;
        sendDesktopNotification(alertTitle, alertBody, '/admin/coins_allotment');
        setActiveAlertToast({
          type: 'coin_load',
          title: alertTitle,
          message: isFp
            ? `🎁 $${Number(newest?.transferAmount || 0).toFixed(2)} SC Freeplay for ${newest?.gameTitle || 'Game'}`
            : `$${Number(newest?.transferAmount || 0).toFixed(2)} SC load for ${newest?.gameTitle || 'Game'}`,
          subtext: isFp
            ? `From ${newest?.userName || 'Player'} • Inbox Proof Attached`
            : `From ${newest?.userName || 'Player'} • Escrow Frozen in Wallet`,
          targetTab: 'coins_allotment',
          targetSubTab: 'loads',
        });
      } else if (pendingCoinLoads.length === 0) {
        setActiveAlertToast((curr) => (curr?.type === 'coin_load' ? null : curr));
      }

      // 5. Incoming coin cashout proof verifications
      if (pendingCoinCashouts.length > (prevCountsRef.current.coinCashouts || 0)) {
        const newest = pendingCoinCashouts[0];
        unlockAudioContext();
        playAdminChime();
        const alertTitle = '🎮 New Cashout Verification (Coins Desk)!';
        const alertBody = `$${Number(newest?.amount || 0).toFixed(2)} SC for ${newest?.username || 'Player'} - ${newest?.gameTitle || 'Game'}`;
        sendDesktopNotification(alertTitle, alertBody, '/admin/coins_allotment');
        setActiveAlertToast({
          type: 'coin_verification',
          title: alertTitle,
          message: `$${Number(newest?.amount || 0).toFixed(2)} SC for ${newest?.username || 'Player'}`,
          subtext: `${newest?.gameTitle || 'Game'} winning proof uploaded • Stage 1 Inspection`,
          targetTab: 'coins_allotment',
          targetSubTab: 'cashouts',
        });
      } else if (pendingCoinCashouts.length === 0) {
        setActiveAlertToast((curr) => (curr?.type === 'coin_verification' ? null : curr));
      }

      // 6. Incoming Live Support Chat messages
      if (unreadChatCount > (prevCountsRef.current.chat || 0)) {
        const newestChat = unreadChatConvs[0];
        const sender = newestChat?.username || 'Player';
        const snippet = newestChat?.lastMessage ? newestChat.lastMessage.slice(0, 80) : 'New inquiry received';
        const alertTitle = `💬 Support Message: ${sender}`;
        const alertBody = snippet;
        unlockAudioContext();
        playAdminChime();
        sendDesktopNotification(alertTitle, alertBody, `/admin/chat?cid=${newestChat?._id || ''}`);
        setActiveAlertToast({
          type: 'chat',
          title: alertTitle,
          message: alertBody,
          subtext: 'Tap to open & reply directly',
          targetTab: 'chat',
          cid: newestChat?._id || '',
          username: sender,
        });

        if (activeTab === 'chat' && activeChatConv?._id) {
          fetch(`/api/chat?conversationId=${encodeURIComponent(activeChatConv._id)}`, { credentials: 'include', cache: 'no-store' })
            .then((r) => r.json())
            .then((d) => {
              if (d.success) setChatMessages(d.messages);
            })
            .catch(() => {});
        }
      } else if (unreadChatCount === 0) {
        setActiveAlertToast((curr) => (curr?.type === 'chat' ? null : curr));
      }

      prevCountsRef.current = {
        deposits: pendingDeps.length,
        redemptions: pendingWith.length,
        requests: pendingReqs.length,
        coinLoads: pendingCoinLoads.length,
        coinCashouts: pendingCoinCashouts.length,
        chat: unreadChatCount,
      };
    } catch (err) {
      console.warn('Background sync error:', err);
    }
  };

  // Real-time zero-delay cross-tab listener for instant admin chime & Chrome alerts!
  useEffect(() => {
    if (!user) return;

    const handleIncomingAlert = (payload) => {
      if (!payload || !payload.type) return;

      if (payload.type === 'NEW_REQUEST') {
        unlockAudioContext();
        playAdminChime();
        const gTitle = payload.gameTitle || 'Game';
        const uName = payload.userName || 'Player';
        setActiveAlertToast({
          type: 'account',
          title: '🎯 New Game ID Request!',
          message: `${gTitle} requested by ${uName}`,
          subtext: 'Tap to review & issue credentials',
          targetTab: 'account_requests',
        });
        syncRequestsAndAlerts();
      } else if (payload.type === 'NEW_FINANCE_REDEMPTION') {
        unlockAudioContext();
        playAdminChime();
        const amt = Number(payload.amount || 0).toFixed(2);
        const uName = payload.username || payload.userName || 'Player';
        const gTitle = payload.gameTitle || 'Game';
        const alertTitle = '💸 Cashout Passed to Finance!';
        const alertBody = `$${amt} SC for ${uName} (${gTitle}) verified by Coin Desk!`;
        sendDesktopNotification(alertTitle, alertBody, '/admin/finance');
        setActiveAlertToast({
          type: 'redemption',
          title: alertTitle,
          message: alertBody,
          subtext: 'Tap to review & dispatch payout',
          targetTab: 'finance',
          targetSubTab: 'redemptions',
        });
        syncRequestsAndAlerts();
      } else if (payload.type === 'NEW_COIN_CASHOUT') {
        unlockAudioContext();
        playAdminChime();
        const amt = Number(payload.amount || 0).toFixed(2);
        const uName = payload.username || payload.userName || 'Player';
        const gTitle = payload.gameTitle || 'Game';
        const alertTitle = '🎮 New Cashout Verification (Coins Desk)!';
        const alertBody = `$${amt} SC for ${uName} (${gTitle}) submitted!`;
        sendDesktopNotification(alertTitle, alertBody, '/admin/coins_allotment');
        setActiveAlertToast({
          type: 'coin_verification',
          title: alertTitle,
          message: alertBody,
          subtext: 'Tap to inspect score screenshot & verify',
          targetTab: 'coins_allotment',
          targetSubTab: 'cashouts',
        });
        syncRequestsAndAlerts();
      } else if (payload.type === 'NEW_CHAT_MESSAGE') {
        unlockAudioContext();
        playAdminChime();
        const uName = payload.username || 'Player';
        const msgSnippet = (payload.text || 'New message attachment').slice(0, 80);
        const alertTitle = `💬 Support Message: ${uName}`;
        const alertBody = msgSnippet;
        sendDesktopNotification(alertTitle, alertBody, `/admin/chat?cid=${payload.conversationId || ''}`);
        setActiveAlertToast({
          type: 'chat',
          title: alertTitle,
          message: alertBody,
          subtext: 'Tap to open & reply directly',
          targetTab: 'chat',
          cid: payload.conversationId || '',
          username: uName,
        });

        // Fast zero-delay inbox refresh (do NOT mark conversation read in background so unread badge stays visible!)
        fetch('/api/chat?inbox=true', { credentials: 'include', cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => {
            if (d.success) diffSet(setChatConversations, d.conversations || []);
          })
          .catch(() => {});

        syncRequestsAndAlerts();
      }
    };

    let channel = null;
    try {
      channel = new BroadcastChannel('paradise_staff_alerts');
      channel.onmessage = (event) => {
        handleIncomingAlert(event.data);
      };
    } catch {}

    const handleStorage = (e) => {
      if (e.key === 'paradise_staff_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingAlert(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  // Run persistent poller every 1.2 seconds for lightning-fast responsiveness!
  useEffect(() => {
    if (!user) return;
    syncRequestsAndAlerts();
    const interval = setInterval(() => {
      syncRequestsAndAlerts();
    }, 1200);

    const handleFocus = () => {
      syncRequestsAndAlerts();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user]);

  // Fetch data for specific active tabs
  useEffect(() => {
    if (!user) return;

    const loadData = () => {
      if (document.hidden) return;
      if (activeTab === 'overview') {
        fetch('/api/admin/stats', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setStats, d.stats); });
      } else if (activeTab === 'games') {
        fetch('/api/games?all=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => {
          if (d.success && d.games) {
            const cleanList = d.games.map(g => ({ ...g, title: cleanGameTitle(g.title || '') }));
            diffSet(setGames, cleanList);
          }
        });
      } else if (activeTab === 'finance') {
        fetch('/api/payments/methods?all=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setPaymentMethods, d.methods || []); });
        fetch('/api/payments/cashout-methods?all=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setCashoutMethods, d.methods || []); });
        fetch('/api/payments/deposit?status=all&lightweight=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setDeposits, (prev) => mergeDepositsOptimistic(prev, d.deposits || [])); });
        fetch('/api/payments/withdraw?status=all&lightweight=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setRedemptions, (prev) => mergeRedemptionsOptimistic(prev, d.redemptions || [])); });
      } else if (activeTab === 'ledger') {
        fetch(`/api/ledger?username=${encodeURIComponent(ledgerFilterUser)}&type=${ledgerFilterType}`, { credentials: 'include', cache: 'no-store' })
          .then(r => r.json())
          .then(d => { if (d.success) diffSet(setLedgerRecords, d.records || []); });
      } else if (activeTab === 'chat') {
        fetch('/api/chat?inbox=true', { credentials: 'include', cache: 'no-store' })
          .then(r => r.json())
          .then(d => {
            if (d.success) {
              diffSet(setChatConversations, d.conversations || []);
              if (typeof window !== 'undefined') {
                const sp = new URLSearchParams(window.location.search);
                const cid = sp.get('cid');
                if (cid && !activeChatConv) {
                  const found = (d.conversations || []).find(c => c._id === cid);
                  if (found) setActiveChatConv(found);
                  else setActiveChatConv({ _id: cid, username: 'Player', userId: cid });
                }
              }
            }
          });
      } else if (activeTab === 'promos') {
        fetch('/api/notifications?admin=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setBroadcastLogs, d.broadcasts || []); });
        fetchAdminPromotions();
      } else if (activeTab === 'affiliates' || activeTab === 'affiliate_commissions') {
        fetch('/api/affiliates?mode=admin', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => {
          if (d.success) {
            diffSet(setAffiliates, d.affiliates || []);
            diffSet(setAffiliateSummary, d.summary || null);
          }
        });
      } else if (activeTab === 'staff') {
        fetch('/api/admin/staff', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setStaffList, d.staff || []); });
      } else if (activeTab === 'account_requests') {
        fetchAccountRequests();
      } else if (activeTab === 'coins_allotment') {
        fetchAllotmentData();
      } else if (activeTab === 'users') {
        fetch(`/api/users?search=${encodeURIComponent(userSearchQuery)}`, { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setUsersList, d.users || []); });
      } else if (activeTab === 'gateways') {
        fetch('/api/payments/methods?all=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setPaymentMethods, d.methods || []); });
      } else if (activeTab === 'tx_search') {
        fetch(`/api/ledger?username=${encodeURIComponent(ledgerFilterUser)}&type=${ledgerFilterType}`, { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) diffSet(setLedgerRecords, d.records || []); });
      } else if (activeTab === 'settings') {
        if (!settingsLoadedRef.current) {
          settingsLoadedRef.current = true;
          fetch('/api/admin/settings', { credentials: 'include', cache: 'no-store' })
            .then(r => r.json())
            .then(d => { if (d.success && d.settings) diffSet(setSysSettings, d.settings); });
          fetchAdminPromotions();
        }
      } else {
        settingsLoadedRef.current = false;
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);

    const handleFocus = () => {
      if (!document.hidden) loadData();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user, activeTab, ledgerFilterUser, ledgerFilterType, accountReqFilter, userSearchQuery, allotmentSearch]);

  // Load chat messages when active conversation selected AND admin is on chat tab
  useEffect(() => {
    if (!activeChatConv || activeTab !== 'chat') return;
    const fetchChatMsgs = () => {
      fetch(`/api/chat?conversationId=${encodeURIComponent(activeChatConv._id)}&admin=true&markRead=true`, { credentials: 'include', cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            diffSet(setChatMessages, d.messages || []);
            // Clear unread badge in local state once opened
            setChatConversations(prev =>
              prev.map(c =>
                c._id === activeChatConv._id && ((c.unreadCount || 0) > 0 || c.unreadStaff)
                  ? { ...c, unreadCount: 0, unreadStaff: false }
                  : c
              )
            );
          }
        })
        .catch(() => {});
    };
    fetchChatMsgs();
    const interval = setInterval(fetchChatMsgs, 1200);
    return () => clearInterval(interval);
  }, [activeChatConv, activeTab]);

  // Auto-scroll chat messages to bottom ONLY on new message or conversation change
  useEffect(() => {
    if (activeTab === 'chat' && activeChatConv) {
      const convChanged = prevAdminChatConvIdRef.current !== activeChatConv._id;
      const hasNew = (chatMessages || []).length > prevAdminChatMsgCountRef.current;
      prevAdminChatConvIdRef.current = activeChatConv._id;
      prevAdminChatMsgCountRef.current = (chatMessages || []).length;

      if (convChanged || hasNew) {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: convChanged ? 'auto' : 'smooth' });
      }
    }
  }, [chatMessages, activeChatConv, activeTab]);

  // Handle Admin Staff Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginId, password: loginPassword, isAdminLogin: true }),
      });
      const data = await res.json();
      if (data.success && data.user.role !== 'player') {
        setUser(data.user);
      } else {
        setLoginError(data.error || 'Access Denied: Not authorized for administration.');
      }
    } catch {
      setLoginError('Login failed.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdminLogout: true }),
    });
    setUser(null);
  };

  // Staff Permissions check (Winning Heaven RBAC matching)
  const isAllowed = (tabId) => {
    if (!user) return false;
    const r = (user.role || '').toLowerCase();

    // Super Admin / Boss has full unrestricted access
    if (r === 'super_admin' || r === 'admin') return true;

    // Operations Manager (operation_admin) has access to ALL tabs EXCEPT staff and settings
    if (r === 'operation_admin') {
      return !['staff', 'settings'].includes(tabId);
    }

    // Financial Manager (financial_manager / financial_admin)
    if (r === 'financial_manager' || r === 'financial_admin') {
      return ['overview', 'finance', 'coins_allotment', 'ledger', 'gateways', 'tx_search', 'affiliate_commissions'].includes(tabId);
    }

    // Coins Staff (coin_manager / coins_admin)
    if (r === 'coin_manager' || r === 'coins_admin') {
      return ['overview', 'account_requests', 'coins_allotment', 'tx_search'].includes(tabId);
    }

    // Live Support Staff (chat_support / support_admin)
    if (r === 'chat_support' || r === 'support_admin') {
      return ['overview', 'chat'].includes(tabId);
    }

    return false;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#070514', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F8FAFC', fontFamily: 'Lexend, sans-serif', fontWeight: 800 }}>
        Loading Rich Room Staff Portal...
      </div>
    );
  }

  // Not Logged In as Staff Form
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#070514', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Lexend, sans-serif' }}>
        <div style={{ maxWidth: '420px', width: '100%', backgroundColor: '#0E0A24', border: '1px solid rgba(0, 240, 255, 0.35)', borderRadius: '20px', padding: '32px 28px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 240, 255, 0.16)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img
              src="/images/logo.png"
              alt="Rich Room"
              style={{
                height: '84px',
                width: 'auto',
                maxHeight: '90px',
                objectFit: 'contain',
                marginBottom: '14px',
                filter: 'drop-shadow(0 0 16px rgba(0, 240, 255, 0.5)) drop-shadow(0 0 25px rgba(224, 38, 216, 0.4))',
              }}
            />
            <h2 style={{ fontFamily: 'Lexend, sans-serif', fontSize: '20px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 4px 0' }}>
              Staff Management Terminal
            </h2>
            <p style={{ fontSize: '12px', color: '#A69FB3', margin: 0 }}>
              Sovereign Role-Based Access Control
            </p>
          </div>

          {loginError && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#FCA5A5', fontSize: '11.5px', textAlign: 'center', fontWeight: 700 }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#C8C1D4', marginBottom: '4px', letterSpacing: '0.04em' }}>
                STAFF USERNAME OR EMAIL
              </label>
              <input
                type="text"
                placeholder="superadmin, finance, coins, or support"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
                style={{ width: '100%', backgroundColor: '#070514', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '10px', padding: '10px 14px', color: '#FFFFFF', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#C8C1D4', marginBottom: '4px', letterSpacing: '0.04em' }}>
                PASSWORD
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                style={{ width: '100%', backgroundColor: '#070514', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '10px', padding: '10px 14px', color: '#FFFFFF', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              className="btn-sovereign-coral"
              style={{ width: '100%', padding: '12px 0', fontSize: '12px', fontWeight: 900, marginTop: '6px', letterSpacing: '0.04em' }}
            >
              AUTHENTICATE STAFF
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0, 240, 255, 0.12)', textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: '12px', color: '#00F0FF', textDecoration: 'none', transition: 'color 0.2s', fontWeight: 700 }}>
              ← Return to Casino Lobby
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Permitted Tabs (Streamlined Core Architecture)
  const allTabs = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard, category: 'Operations' },
    {
      id: 'account_requests',
      label: 'Account Requests',
      icon: Key,
      badge: (accountRequests || []).filter(r => (r.status || '').toUpperCase() === 'PENDING').length,
      category: 'Operations',
    },
    {
      id: 'coins_allotment',
      label: 'Coins Allotment',
      icon: Coins,
      badge: (
        (redemptions || []).filter(r => r.status === 'pending_coin' || r.stage === 'coin_verification').length +
        (coinLoadRequests || []).filter(r => (r.status || '').toUpperCase() === 'PENDING').length
      ),
      category: 'Operations',
    },
    {
      id: 'finance',
      label: 'Finance & Cashier',
      icon: CreditCard,
      badge: (deposits.filter(d => d.status === 'pending').length + redemptions.filter(r => r.status === 'pending').length),
      category: 'Operations',
    },
    {
      id: 'chat',
      label: 'Live Support Desk',
      icon: MessageSquare,
      badge: chatConversations.reduce((acc, c) => acc + Number(c.unreadCount || (c.unreadStaff ? 1 : 0)), 0),
      category: 'Operations',
    },
    { id: 'games', label: 'Games Library', icon: Gamepad2, category: 'Catalog & Players' },
    { id: 'users', label: 'Player Accounts', icon: Users, category: 'Catalog & Players' },
    { id: 'tx_search', label: 'Transaction Logs', icon: FileSpreadsheet, category: 'Catalog & Players' },
    { id: 'promos', label: 'Push & Broadcasts', icon: Megaphone, category: 'Growth & Promos' },
    { id: 'affiliates', label: 'Affiliates 50%', icon: Users, category: 'Growth & Promos' },
    { id: 'affiliate_commissions', label: 'Affiliate Commissions', icon: DollarSign, category: 'Growth & Promos' },
    { id: 'gateways', label: 'Payment Gateways', icon: SlidersHorizontal, category: 'System & Security' },
    { id: 'staff', label: 'Staff Management', icon: UserCheck, category: 'System & Security' },
    { id: 'settings', label: 'System & Geo Access', icon: Settings, category: 'System & Security' },
  ];

  const visibleTabs = allTabs.filter(t => isAllowed(t.id));
  const totalPendingBadges = visibleTabs.reduce((acc, t) => acc + (t.badge || 0), 0);
  const currentTabObj = allTabs.find(t => t.id === activeTab);

  return (
    <div style={{ height: '100dvh', maxHeight: '100dvh', backgroundColor: 'var(--bg-deep)', color: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', overflow: 'hidden' }} className="admin-portal-root font-body">
      {/* Top Staff Navbar */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--chrome-border)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.7), 0 0 20px var(--neon-cyan-glow)',
          zIndex: 40,
        }}
        className="px-2.5 sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 relative min-h-[64px] sm:min-h-[82px] py-2.5 sm:py-0"
      >
        {/* Left Section: Official Logo (always in top header) + Staff Console Pill */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 min-w-0 flex-1">
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <img
              src="/logo.png"
              alt="Rich Room VIP Admin"
              className="vegas-navbar-logo hover:scale-105 transition-transform h-9 sm:h-[46px] w-auto object-contain"
            />
          </Link>

          {/* Desktop Left: Staff Console Badge */}
          <div
            className="hidden sm:inline-flex items-center gap-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--chrome-border)',
              padding: '7px 18px',
              borderRadius: '9999px',
              boxShadow: '0 0 15px var(--neon-cyan-glow)',
            }}
          >
            <Flame size={14} color="var(--neon-cyan)" />
            <span style={{ color: '#FFFFFF', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              RICH ROOM VIP CONSOLE
            </span>
          </div>

          {/* Breadcrumb Indicator */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--chrome-border)]/50 shrink-0">
            <span className="text-[10.5px] text-[#9A91A8] font-bold uppercase tracking-wider font-sub">
              {currentTabObj?.category || 'Console'}
            </span>
            <span className="text-white/30 text-xs">/</span>
            <span className="text-xs font-black text-[var(--neon-cyan)] font-sub">
              {currentTabObj?.label || 'Dashboard'}
            </span>
          </div>
        </div>

        {/* Right Section: Telemetry Capsule, Player Lobby Button, Audio Alert, Avatar Circle */}
        <div className="flex flex-wrap items-center justify-end sm:justify-end gap-1.5 sm:gap-2.5 shrink-0 w-full sm:w-auto">

          {/* Player Lobby Button (matches DEPOSIT button gradient in screenshot) */}
          <Link
            href="/"
            className="btn-coral"
            style={{
              borderRadius: '9999px',
              padding: '8px 20px',
              fontSize: '11.5px',
              fontWeight: 900,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0, 240, 255, 0.35), 0 0 25px rgba(224, 38, 216, 0.25)',
            }}
          >
            <ExternalLink size={13} color="#FFFFFF" />
            <span className="hidden xs:inline">PLAYER LOBBY</span>
            <span className="xs:hidden">LOBBY</span>
          </Link>

          {/* Luxury Audio Alert Hub */}
          <div
            className="admin-header-audio-pill"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--chrome-border)',
              borderRadius: '9999px',
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <button
              onClick={() => {
                unlockAudioContext();
                setSoundModalOpen(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#F59E0B',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
              title="Alert tune settings"
            >
              <span>{AVAILABLE_TUNES.find(t => t.id === alertTune)?.icon || '🔔'}</span>
              <span className="hidden lg:inline text-[11px] text-gray-300">
                {Math.round(alertVolume * 100)}%
              </span>
            </button>

            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

            <button
              onClick={() => {
                const next = !audioAlertsEnabled;
                handleToggleSound(next);
                if (next) playAdminChime();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: audioAlertsEnabled ? '#10B981' : '#F43F5E',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
              }}
              title={audioAlertsEnabled ? 'Audio Alert ON' : 'Audio Alert MUTED'}
            >
              {audioAlertsEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>

            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

            {/* Chrome Desktop Push Notification Button */}
            <button
              onClick={enableDesktopNotifications}
              style={{
                background: desktopNotifPerm === 'granted' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.25)',
                border: `1px solid ${desktopNotifPerm === 'granted' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.7)'}`,
                color: desktopNotifPerm === 'granted' ? '#34D399' : '#FBBF24',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                boxShadow: desktopNotifPerm !== 'granted' ? '0 0 10px rgba(245, 158, 11, 0.3)' : 'none',
              }}
              title={
                desktopNotifPerm === 'granted'
                  ? 'Chrome Push Notifications Active (Click to test)'
                  : 'Click to Enable Chrome Desktop Push Notifications'
              }
            >
              <Bell size={12} className={desktopNotifPerm !== 'granted' ? 'animate-pulse' : ''} />
              <span className="hidden md:inline">
                {desktopNotifPerm === 'granted' ? 'Chrome Alerts ON' : 'Turn On Chrome Alerts'}
              </span>
            </button>
          </div>

          {/* Staff Profile Avatar Circle */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                border: '1.5px solid var(--neon-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--neon-cyan)',
                fontWeight: 900,
                fontSize: '13px',
                boxShadow: '0 0 14px var(--neon-cyan-glow)',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label="Staff Profile Menu"
              title={user.username}
            >
              {user.username?.substring(0, 2).toUpperCase() || 'SU'}
            </button>

            {/* Dropdown Menu Panel */}
            {profileDropdownOpen && (
              <div
                className="vegas-profile-dropdown w-64 p-3 animate-in fade-in zoom-in-95 duration-150 font-body"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '10px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--chrome-border)',
                  borderRadius: '18px',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.95), 0 0 25px var(--neon-cyan-glow)',
                  zIndex: 99999,
                  fontFamily: 'var(--font-body)',
                }}
              >
                <div className="p-3 bg-[var(--bg-deep)] rounded-xl border border-[var(--chrome-border)]/40 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[var(--bg-surface)] border border-[var(--neon-cyan)]/50 flex items-center justify-center text-[var(--neon-cyan)] font-black text-sm uppercase shrink-0">
                      {user.username?.substring(0, 2).toUpperCase() || 'SU'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="m-0 text-sm font-black text-white truncate font-sub">{user.username}</p>
                      <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md bg-[var(--neon-cyan)]/15 border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] text-[9.5px] font-black uppercase tracking-wider font-mono">
                        {user.role?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs font-bold text-gray-200">
                  <Link
                    href="/"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 hover:text-white transition text-decoration-none group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ExternalLink size={15} className="text-[var(--neon-cyan)]" />
                      <span>Player Casino Lobby</span>
                    </div>
                    <span className="text-[10px] text-gray-400 group-hover:text-[var(--neon-cyan)]">↗</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      unlockAudioContext();
                      setSoundModalOpen(true);
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 hover:text-white transition cursor-pointer text-left bg-transparent border-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <SlidersHorizontal size={15} className="text-[var(--neon-cyan)]" />
                      <span>Audio Alert Settings</span>
                    </div>
                    <span className="text-[10px] font-mono font-black text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/20 px-1.5 py-0.5 rounded">
                      {Math.round(alertVolume * 100)}%
                    </span>
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition cursor-pointer text-left bg-transparent border-none"
                  >
                    <LogOut size={15} />
                    <span>Sign Out of Console</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Drawer Hamburger Button (strictly hidden on desktop >= 768px) */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="admin-mobile-hamburger items-center justify-center w-10 h-10 rounded-xl text-[var(--neon-cyan)] bg-[var(--bg-card)] border border-[var(--chrome-border)] shrink-0 transition relative cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            {totalPendingBadges > 0 && !mobileSidebarOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center border-2 border-[var(--bg-deep)] animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)] font-mono">
                {totalPendingBadges > 9 ? '9+' : totalPendingBadges}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/85 z-40 backdrop-blur-md animate-in fade-in"
          />
        )}

        {/* Left Admin Navigation */}
        <aside
          className={`transition-all duration-300 z-50 md:static ${mobileSidebarOpen
            ? 'fixed inset-y-0 left-0 flex shadow-[0_0_60px_rgba(0,0,0,0.95)] border-r border-[var(--chrome-border)]'
            : 'hidden md:flex'
            }`}
          style={{
            width: '280px',
            minWidth: '280px',
            maxWidth: '85vw',
            height: '100%',
            maxHeight: '100dvh',
            backgroundColor: 'var(--bg-surface)',
            borderRight: '1px solid var(--chrome-border)',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--font-body)',
          }}
        >
          {/* Mobile Drawer Top Bar (strictly mobile only, desktop logo lives in the top header) */}
          <div
            className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--chrome-border)]/50 bg-[var(--bg-deep)] flex-shrink-0"
            style={{
              paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
            }}
          >
            <span className="text-xs font-black uppercase tracking-wider text-[var(--neon-cyan)] flex items-center gap-2 font-heading">
              <ShieldCheck size={14} />
              Navigation Menu
            </span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Categorized Navigation Links - using exact .vegas-sidebar-nav-btn and .vegas-sidebar-section-header */}
          <div
            className="modal-scrollable"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              padding: '14px 10px',
            }}
          >
            {['Operations', 'Catalog & Players', 'Growth & Promos', 'System & Security'].map((category, secIdx) => {
              const categoryTabs = visibleTabs.filter(t => t.category === category);
              if (categoryTabs.length === 0) return null;
              return (
                <div key={secIdx} style={{ marginBottom: '14px' }}>
                  <div className="vegas-sidebar-section-header">
                    <span>{category}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {categoryTabs.map(tab => {
                      const Icon = tab.icon;
                      const isSelected = activeTab === tab.id;
                      const hasBadge = Boolean(tab.badge && tab.badge > 0);

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={`vegas-sidebar-nav-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setMobileSidebarOpen(false);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="vegas-sidebar-icon-box">
                              <Icon
                                size={16}
                                color={isSelected ? '#00F0FF' : '#9A91A8'}
                              />
                            </div>
                            <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 800 : 600 }}>
                              {tab.label}
                            </span>
                          </div>

                          {hasBadge && (
                            <span
                              className="vegas-sidebar-badge"
                              style={{
                                backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.2)' : 'rgba(224, 38, 216, 0.15)',
                                color: isSelected ? '#00F0FF' : '#E026D8',
                                borderColor: isSelected ? 'rgba(0, 240, 255, 0.4)' : 'rgba(224, 38, 216, 0.35)',
                              }}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Luxury Support & Trust Footer - Exactly matching VegasSidebar.jsx in screenshot */}
          <div
            className="vegas-sidebar-footer-box flex-shrink-0"
            style={{
              padding: '14px 16px',
              paddingBottom: 'max(24px, calc(16px + env(safe-area-inset-bottom, 0px)))',
              borderTop: '1px solid rgba(0, 240, 255, 0.14)',
              backgroundColor: '#070514',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#140E33',
                border: '1px solid rgba(0, 240, 255, 0.35)',
                borderRadius: '12px',
                padding: '11px 14px',
                color: '#00F0FF',
                fontFamily: 'Lexend, sans-serif',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 240, 255, 0.1)',
                transition: 'all 0.2s ease',
              }}
            >
              <Headphones size={15} color="#00F0FF" />
              <span>24/7 VIP LIVE SUPPORT</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '10px', opacity: 0.7 }}>
              <ShieldCheck size={12} color="#10B981" />
              <span style={{ fontSize: '9.5px', color: '#9A91A8', fontFamily: 'Lexend, sans-serif' }}>
                100% Legal US Sweepstakes
              </span>
            </div>
          </div>
        </aside>

        {/* Tab Content Display */}
        <main
          className={`flex-1 flex flex-col min-h-0 bg-[var(--bg-deep)] w-full max-w-full overflow-x-hidden ${activeTab === 'chat' ? 'p-2 sm:p-4 overflow-hidden' : 'p-2.5 sm:p-6 overflow-y-auto'
            }`}
          style={{ flex: 1 }}
        >
          {/* TAB 1: OVERVIEW (COMMAND CENTER) - Ultra-Luxurious Players Paradise Marquee Architecture */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6 sm:gap-8 w-full" style={{ fontFamily: 'var(--font-lexend, Lexend), sans-serif' }}>
              {/* Header Hero Card matching casino theme */}
              <div
                className="p-6 sm:p-7 sm:py-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6 shadow-2xl"
                style={{
                  backgroundColor: '#0E0A24',
                  background: 'linear-gradient(135deg, #0E0A24 0%, #140E33 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.28)',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 240, 255, 0.12)',
                }}
              >
                <div className="flex items-center gap-5 sm:gap-6">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(224, 38, 216, 0.2) 100%)',
                      border: '1.5px solid rgba(0, 240, 255, 0.5)',
                      boxShadow: '0 0 25px rgba(0, 240, 255, 0.35)',
                      color: '#00F0FF',
                    }}
                  >
                    <Flame size={32} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                      <h1 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                        Command Center &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#A855F7] to-[#E026D8]">Live Telemetry</span>
                      </h1>
                      <span
                        className="text-[10.5px] px-3 py-1 rounded-full font-black tracking-wider whitespace-nowrap shadow-sm"
                        style={{
                          backgroundColor: 'rgba(0, 240, 255, 0.12)',
                          color: '#00F0FF',
                          border: '1px solid rgba(0, 240, 255, 0.35)',
                          boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)',
                        }}
                      >
                        DIRECT PLATFORM ACCESS • 24/7
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-[#9A91A8] mt-1.5 leading-relaxed m-0 font-medium">
                      Real-time Players Paradise cashier velocity, player liquidity, and sweepstakes platform activity overview
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
                  <div
                    className="px-4 py-2.5 rounded-xl text-xs font-black font-mono flex items-center gap-2 shadow-lg"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#10B981',
                      boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]" />
                    <span>SYSTEM ONLINE • INSTANT LOAD ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* 4 Premium Metric Hero Cards with Glassmorphic Gradient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* 1. Players Card */}
                <div
                  className="p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.95) 0%, rgba(14, 10, 36, 0.98) 100%)',
                    border: '1px solid rgba(0, 240, 255, 0.35)',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 25px rgba(0, 240, 255, 0.12)',
                  }}
                  onClick={() => setActiveTab('users')}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9A91A8] uppercase tracking-wider">
                      TOTAL REGISTERED PLAYERS
                    </span>
                    <div className="w-11 h-11 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/50 flex items-center justify-center text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                      <Users size={20} />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black mt-4 mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-[#00F0FF]">
                    {stats?.totalPlayers || 0}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#00F0FF]">
                    <Sparkles size={13} />
                    <span>VIP accounts directory</span>
                  </div>
                </div>

                {/* 2. Deposits Card */}
                <div
                  className="p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.95) 0%, rgba(14, 10, 36, 0.98) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 25px rgba(16, 185, 129, 0.12)',
                  }}
                  onClick={() => { setActiveTab('finance'); setFinanceSubTab('deposits'); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9A91A8] uppercase tracking-wider">
                      APPROVED DEPOSITS
                    </span>
                    <div className="w-11 h-11 rounded-xl bg-[#10B981]/15 border border-[#10B981]/50 flex items-center justify-center text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <ArrowDownLeft size={20} />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-[#10B981] mt-4 mb-2 tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                    ${Number(stats?.totalDeposited || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
                    <span>Total verified inflow</span>
                  </div>
                </div>

                {/* 3. Redemptions Card */}
                <div
                  className="p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.95) 0%, rgba(14, 10, 36, 0.98) 100%)',
                    border: '1px solid rgba(224, 38, 216, 0.4)',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 25px rgba(224, 38, 216, 0.12)',
                  }}
                  onClick={() => { setActiveTab('finance'); setFinanceSubTab('redemptions'); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9A91A8] uppercase tracking-wider">
                      DISPATCHED REDEMPTIONS
                    </span>
                    <div className="w-11 h-11 rounded-xl bg-[#E026D8]/15 border border-[#E026D8]/50 flex items-center justify-center text-[#E026D8] shadow-[0_0_15px_rgba(224,38,216,0.3)]">
                      <ArrowUpRight size={20} />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-[#E026D8] mt-4 mb-2 tracking-tight drop-shadow-[0_0_15px_rgba(224,38,216,0.35)]">
                    ${Number(stats?.totalRedeemed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#E026D8]">
                    <span>Settled player cashouts</span>
                  </div>
                </div>

                {/* 4. Net House Margin Card */}
                <div
                  className="p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.95) 0%, rgba(14, 10, 36, 0.98) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 25px rgba(245, 158, 11, 0.12)',
                  }}
                  onClick={() => setActiveTab('tx_search')}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9A91A8] uppercase tracking-wider">
                      NET HOUSE MARGIN (NGR)
                    </span>
                    <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/50 flex items-center justify-center text-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                      <DollarSign size={20} />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-[#F59E0B] mt-4 mb-2 tracking-tight drop-shadow-[0_0_15px_rgba(245,158,11,0.35)]">
                    ${Number(stats?.netGGR || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#F59E0B]">
                    <span>Net gross casino hold</span>
                  </div>
                </div>
              </div>

              {/* Action Queues Hub - Luminous Sovereign Card */}
              <div
                className="p-6 sm:p-8 rounded-2xl shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(14, 10, 36, 0.98) 0%, rgba(7, 5, 20, 0.98) 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.28)',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(0, 240, 255, 0.1)',
                }}
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2.5 m-0">
                    <Flame size={18} color="#00F0FF" />
                    <span>PENDING OPERATIONAL ACTION QUEUES</span>
                  </h3>
                  <span className="text-xs font-bold text-[#00F0FF] bg-[#00F0FF]/15 border border-[#00F0FF]/35 px-3.5 py-1.5 rounded-full shadow-sm">
                    Live Dispatch Queue
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Queue 1: Deposits */}
                  <div className="bg-[#140E33] border border-amber-500/35 hover:border-amber-400 p-5 rounded-2xl flex items-center justify-between transition-all shadow-xl group">
                    <div>
                      <p className="text-[11px] text-[#9A91A8] font-black uppercase tracking-wider m-0">Pending Deposits</p>
                      <p className="text-3xl font-black text-[#F59E0B] mt-2 mb-0">{stats?.pendingDeposits || 0}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('finance'); setFinanceSubTab('deposits'); }}
                      className="px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5 text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 shadow-amber-500/20"
                    >
                      <span>Review Cashier</span>
                    </button>
                  </div>

                  {/* Queue 2: Redemptions */}
                  <div className="bg-[#140E33] border border-fuchsia-500/35 hover:border-fuchsia-400 p-5 rounded-2xl flex items-center justify-between transition-all shadow-xl group">
                    <div>
                      <p className="text-[11px] text-[#9A91A8] font-black uppercase tracking-wider m-0">Pending Redemptions</p>
                      <p className="text-3xl font-black text-[#E026D8] mt-2 mb-0">{stats?.pendingRedemptions || 0}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('finance'); setFinanceSubTab('redemptions'); }}
                      className="px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5 text-white bg-gradient-to-r from-[#E026D8] via-[#A855F7] to-[#00F0FF] hover:brightness-110 shadow-[0_0_15px_rgba(224,38,216,0.3)]"
                    >
                      <span>Review Cashouts</span>
                    </button>
                  </div>

                  {/* Queue 3: Account Requests */}
                  <div className="bg-[#140E33] border border-cyan-500/35 hover:border-cyan-400 p-5 rounded-2xl flex items-center justify-between transition-all shadow-xl group">
                    <div>
                      <p className="text-[11px] text-[#9A91A8] font-black uppercase tracking-wider m-0">Account Requests</p>
                      <p className="text-3xl font-black text-[#00F0FF] mt-2 mb-0">
                        {accountRequests.filter(r => (r.status || '').toUpperCase() === 'PENDING').length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('account_requests')}
                      className="px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5 text-black bg-gradient-to-r from-[#00F0FF] to-cyan-300 hover:brightness-110 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                    >
                      <span>Fulfill IDs</span>
                    </button>
                  </div>

                  {/* Queue 4: Support */}
                  <div className="bg-[#140E33] border border-rose-500/35 hover:border-rose-400 p-5 rounded-2xl flex items-center justify-between transition-all shadow-xl group">
                    <div>
                      <p className="text-[11px] text-[#9A91A8] font-black uppercase tracking-wider m-0">Unread Live Chat</p>
                      <p className="text-3xl font-black text-rose-400 mt-2 mb-0">
                        {chatConversations.filter(c => Boolean(c.unreadStaff || (c.unreadCount && c.unreadCount > 0))).length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('chat')}
                      className="px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5 text-white bg-gradient-to-r from-rose-500 via-pink-600 to-[#E026D8] hover:brightness-110 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                    >
                      <span>Open Live Desk</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Fast Operations Launchpad (Instant Access Shortcuts for Admin Staff) */}
              <div
                className="p-6 sm:p-8 rounded-2xl shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #0E0A24 0%, #070514 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 m-0">
                    <SlidersHorizontal size={16} color="#00F0FF" />
                    <span>STAFF OPERATIONAL QUICK-ACTIONS</span>
                  </h3>
                  <span className="text-xs text-[#9A91A8]">1-Tap Fast Launch</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('account_requests')}
                    className="p-4 rounded-xl bg-[#140E33] hover:bg-[#1D144A] border border-white/10 hover:border-[#00F0FF]/40 text-left transition flex flex-col gap-2 cursor-pointer shadow-md hover:scale-[1.02]"
                  >
                    <Key size={20} className="text-[#00F0FF]" />
                    <span className="text-xs font-black text-white">Issue Game ID</span>
                    <span className="text-[11px] text-[#9A91A8]">Credentials queue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('coins_allotment')}
                    className="p-4 rounded-xl bg-[#140E33] hover:bg-[#1D144A] border border-white/10 hover:border-[#00F0FF]/40 text-left transition flex flex-col gap-2 cursor-pointer shadow-md hover:scale-[1.02]"
                  >
                    <Coins size={20} className="text-[#00F0FF]" />
                    <span className="text-xs font-black text-white">Allot Coins</span>
                    <span className="text-[11px] text-[#9A91A8]">1 SC ($) Balance load</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('finance'); setFinanceSubTab('deposits'); }}
                    className="p-4 rounded-xl bg-[#140E33] hover:bg-[#1D144A] border border-white/10 hover:border-[#10B981]/40 text-left transition flex flex-col gap-2 cursor-pointer shadow-md hover:scale-[1.02]"
                  >
                    <ArrowDownLeft size={18} className="text-[#10B981]" />
                    <span className="text-xs font-black text-white">Cashier Review</span>
                    <span className="text-[10px] text-[#9A91A8]">Incoming deposits</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('finance'); setFinanceSubTab('redemptions'); }}
                    className="p-3 rounded-xl bg-[#140E33] hover:bg-[#1D144A] border border-white/10 hover:border-[#E026D8]/40 text-left transition flex flex-col gap-1.5 cursor-pointer"
                  >
                    <ArrowUpRight size={18} className="text-[#E026D8]" />
                    <span className="text-xs font-black text-white">Cashout Payouts</span>
                    <span className="text-[10px] text-[#9A91A8]">Verified redemptions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddGameModalOpen(true)}
                    className="p-3 rounded-xl bg-[#140E33] hover:bg-[#1D144A] border border-white/10 hover:border-amber-400/40 text-left transition flex flex-col gap-1.5 cursor-pointer"
                  >
                    <Plus size={18} className="text-amber-400" />
                    <span className="text-xs font-black text-white">Add New Game</span>
                    <span className="text-[10px] text-[#9A91A8]">Upload cover & link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('promos')}
                    className="p-3 rounded-xl bg-[#140E33] hover:bg-[#1D144A] border border-white/10 hover:border-violet-400/40 text-left transition flex flex-col gap-1.5 cursor-pointer"
                  >
                    <Megaphone size={18} className="text-violet-400" />
                    <span className="text-xs font-black text-white">Push Broadcast</span>
                    <span className="text-[10px] text-[#9A91A8]">Player alerts</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT REQUESTS (Sweepstakes Platform Fulfillment) */}
          {activeTab === 'account_requests' && (
            <div className="flex flex-col gap-6 sm:gap-8 w-full" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
              {/* Header Toolbar matching luxury casino theme */}
              <div
                className="p-6 sm:p-7 sm:py-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6"
                style={{
                  backgroundColor: '#0E0A24',
                  background: 'linear-gradient(135deg, #0E0A24 0%, #140E33 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.28)',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 240, 255, 0.12)',
                }}
              >
                <div className="flex items-center gap-5 sm:gap-6">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(245, 158, 11, 0.2) 100%)',
                      border: '1.5px solid rgba(0, 240, 255, 0.5)',
                      boxShadow: '0 0 25px rgba(0, 240, 255, 0.35)',
                      color: '#00F0FF',
                    }}
                  >
                    <Key size={30} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                      <h2 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight" style={{ fontFamily: 'Lexend, sans-serif' }}>
                        Player Game Account Requests
                      </h2>
                      <span
                        className="text-[10.5px] px-3 py-1 rounded-full font-black tracking-wider whitespace-nowrap shadow-sm"
                        style={{
                          backgroundColor: 'rgba(255, 215, 0, 0.14)',
                          color: '#FFD700',
                          border: '1px solid rgba(255, 215, 0, 0.45)',
                          boxShadow: '0 0 12px rgba(255, 215, 0, 0.25)',
                        }}
                      >
                        SWEEPSTAKES FULFILLMENT
                      </span>
                      <span
                        className="text-[11px] px-3 py-1 rounded-full font-bold flex items-center gap-1.5 font-mono shadow-sm"
                        style={{
                          backgroundColor: 'rgba(0, 240, 255, 0.12)',
                          color: '#00F0FF',
                          border: '1px solid rgba(0, 240, 255, 0.35)',
                        }}
                      >
                        <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_#00F0FF]" />
                        <span>Pending: {accountRequests.filter(r => (r.status || '').toUpperCase() === 'PENDING').length}</span>
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-[#9A91A8] mt-1.5 leading-relaxed m-0" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      Approve and issue credentials for Juwa, Fire Kirin, Game Vault, Orion Stars, and Sweepstakes platforms
                    </p>
                  </div>
                </div>

                {/* Instant Sync */}
                <div className="flex items-center self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      fetchAccountRequests();
                      syncRequestsAndAlerts();
                    }}
                    className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97]"
                    style={{
                      background: 'linear-gradient(135deg, #00F0FF 0%, #00d0e8 40%, #E026D8 100%)',
                      color: '#070514',
                      boxShadow: '0 0 25px rgba(0, 240, 255, 0.45)',
                      border: 'none',
                      fontFamily: 'Lexend, sans-serif',
                    }}
                  >
                    <RefreshCw size={14} strokeWidth={2.5} />
                    <span>Sync Requests</span>
                  </button>
                </div>
              </div>

              <AccountRequestsView
                requests={accountRequests}
                filter={accountReqFilter}
                onFilterChange={(f) => {
                  setAccountReqFilter(f);
                  fetchAccountRequests();
                }}
                onOpenApproveModal={handleOpenApproveModal}
                onCancelRequest={handleCancelRequest}
                onRefresh={() => {
                  fetchAccountRequests();
                  syncRequestsAndAlerts();
                }}
              />

              {/* Modal for Approving & Customizing Random Credentials */}
              {approvalModal.open && approvalModal.request && (
                <div
                  className="vegas-modal-overlay"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(5, 3, 15, 0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    fontFamily: 'Lexend, -apple-system, sans-serif',
                  }}
                >
                  <div
                    className="vegas-modal-card rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95"
                    style={{
                      backgroundColor: '#0E0A24',
                      background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.45)',
                      boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.25)',
                    }}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <h3 className="font-heading font-black text-lg text-white m-0">
                          Fulfill {approvalModal.request.gameTitle}
                        </h3>
                        <p className="text-xs text-[#9A91A8] mt-0.5">
                          Player: <strong className="text-white">{approvalModal.request.userName}</strong> ({approvalModal.request.userEmail})
                        </p>
                      </div>
                      <button
                        onClick={() => setApprovalModal({ open: false, request: null, username: '', password: '' })}
                        className="text-gray-400 hover:text-white cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-gray-300 block mb-1">
                          Game Platform Username
                        </label>
                        <input
                          type="text"
                          value={approvalModal.username}
                          onChange={(e) => setApprovalModal({ ...approvalModal, username: e.target.value })}
                          className="w-full bg-[#140E33] border border-[#00F0FF]/40 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-[#00F0FF] outline-none focus:border-[#00F0FF]"
                          placeholder="Username"
                          required
                          style={{ fontFamily: 'Lexend, monospace' }}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-300 block mb-1">
                          Game Platform Password
                        </label>
                        <input
                          type="text"
                          value={approvalModal.password}
                          onChange={(e) => setApprovalModal({ ...approvalModal, password: e.target.value })}
                          className="w-full bg-[#140E33] border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
                          placeholder="Password"
                          required
                          style={{ fontFamily: 'Lexend, monospace' }}
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-[#140E33] border border-amber-500/30 text-[11px] text-amber-300">
                        ⚡ Random credentials generated automatically. You can confirm them or type custom ones before issuing to the player.
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setApprovalModal({ open: false, request: null, username: '', password: '' })}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={submittingApproval}
                        onClick={handleConfirmApproval}
                        className="btn-coral py-2.5 px-5 text-xs font-black uppercase flex items-center gap-2 shadow-lg cursor-pointer"
                      >
                        {submittingApproval ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Issuing...</span>
                          </>
                        ) : (
                          <>
                            <Check size={15} />
                            <span>Confirm &amp; Issue Credentials</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: COINS ALLOTMENT & OPERATIONS DESK */}
          {activeTab === 'coins_allotment' && (
            <CoinOperationsDesk sessionUser={user} />
          )}

          {/* TAB 2: GAMES CONTROL */}
          {activeTab === 'games' && (() => {
            const filteredGamesList = games.filter(g => {
              if (!gameSearchQuery.trim()) return true;
              const q = gameSearchQuery.toLowerCase();
              return (g.title && g.title.toLowerCase().includes(q)) || (g.provider && g.provider.toLowerCase().includes(q));
            });

            return (
              <div className="space-y-6" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
                {/* Header & Action Controls */}
                <div className="bg-[#0E0A24] border border-[#00F0FF]/25 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 to-[#0E0A24] border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-lg shadow-[#00F0FF]/15 shrink-0">
                          <Gamepad2 size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide m-0">
                              Games Catalog Control
                            </h2>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 whitespace-nowrap">
                              Sweepstakes Portals
                            </span>
                          </div>
                          <p className="text-xs text-[#9A91A8] mt-0.5">
                            Manage sweepstakes portals, upload covers, control ON/OFF visibility, and assign badges
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Header Action Button: + Add New Game */}
                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                      <button
                        type="button"
                        onClick={() => setIsAddGameModalOpen(true)}
                        style={{
                          background: 'linear-gradient(135deg, #00F0FF 0%, #00d0e8 40%, #E026D8 100%)',
                          color: '#070514',
                          boxShadow: '0 0 25px rgba(0, 240, 255, 0.45)',
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                      >
                        <Plus size={16} strokeWidth={3} color="#070514" />
                        <span>Add New Game</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter & Metric Bar */}
                  <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-bold font-mono">
                        {games.filter(g => g.isActive !== false).length} Active Online
                      </span>
                      <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/35 text-rose-400 text-xs font-bold font-mono">
                        {games.filter(g => g.isActive === false).length} Inactive (OFF)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-bold font-mono">
                        {games.length} Total in Catalog
                      </span>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search catalog games..."
                        value={gameSearchQuery}
                        onChange={(e) => setGameSearchQuery(e.target.value)}
                        className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition"
                      />
                      {gameSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setGameSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* MODAL: ADD NEW GAME */}
                {isAddGameModalOpen && (
                  <div
                    className="vegas-modal-overlay"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      width: '100vw',
                      height: '100vh',
                      backgroundColor: 'rgba(5, 3, 15, 0.92)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      zIndex: 999999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                    }}
                    onClick={() => setIsAddGameModalOpen(false)}
                  >
                    <div
                      className="vegas-modal-card w-full max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-scrollable relative space-y-4"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: '#0E0A24',
                        background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.45)',
                        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.25)',
                        borderRadius: '20px',
                        fontFamily: 'Lexend, -apple-system, sans-serif',
                      }}
                    >
                      {/* Modal Header */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#00F0FF]"
                            style={{
                              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(224, 38, 216, 0.15) 100%)',
                              border: '1px solid rgba(0, 240, 255, 0.4)',
                              boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
                            }}
                          >
                            <Plus size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-white m-0 tracking-wide">Add New Game / Sweepstakes Portal</h3>
                            <p className="text-[11px] text-gray-400 m-0">Configure title, provider, custom cover and external portal link</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddGameModalOpen(false)}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Modal Form */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newGame.title.trim()) return alert('Game title is required');

                          // 1. Optimistic game item (0ms)
                          const tempId = 'temp-' + Date.now();
                          const optimisticGame = { ...newGame, id: tempId, isActive: true };
                          setGames(prev => [optimisticGame, ...prev]);

                          // 2. Dismiss modal immediately in 0ms!
                          setIsAddGameModalOpen(false);
                          const gameToSubmit = { ...newGame };
                          setNewGame({
                            title: '',
                            provider: 'Players Paradise Studio',
                            thumbnail: '/images/vegas-777.svg',
                            badge: 'HOT',
                            url: '',
                            isActive: true,
                          });

                          // 3. Fire API in background
                          try {
                            const res = await fetch('/api/games', {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(gameToSubmit),
                            });
                            const d = await res.json();
                            if (d.success && d.game) {
                              setGames(prev => prev.map(g => g.id === tempId ? (d.game || { ...gameToSubmit, id: d.gameId }) : g));
                            } else if (!d.success) {
                              alert(d.error || 'Failed to add game');
                              setGames(prev => prev.filter(g => g.id !== tempId));
                            }
                          } catch (err) {
                            console.error('Failed to add game', err);
                          }
                        }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Game Title *</label>
                            <input
                              type="text"
                              placeholder="e.g. Orion Stars 777"
                              value={newGame.title}
                              onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                              required
                              className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all"
                              style={{
                                backgroundColor: '#070514',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                              }}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Provider / Studio</label>
                            <input
                              type="text"
                              placeholder="e.g. Orion Stars, Juwa, Players Paradise"
                              value={newGame.provider}
                              onChange={(e) => setNewGame({ ...newGame, provider: e.target.value })}
                              className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all"
                              style={{
                                backgroundColor: '#070514',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Badge System</label>
                            <select
                              value={newGame.badge}
                              onChange={(e) => setNewGame({ ...newGame, badge: e.target.value })}
                              className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all font-bold cursor-pointer"
                              style={{
                                backgroundColor: '#070514',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                              }}
                            >
                              <option value="HOT">🔥 HOT</option>
                              <option value="NEW">✨ NEW</option>
                              <option value="POPULAR">⭐ POPULAR</option>
                              <option value="EXCLUSIVE">💎 EXCLUSIVE</option>
                              <option value="">No Badge</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Launch URL (Optional)</label>
                            <input
                              type="text"
                              placeholder="https://... (Optional)"
                              value={newGame.url}
                              onChange={(e) => setNewGame({ ...newGame, url: e.target.value })}
                              className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all"
                              style={{
                                backgroundColor: '#070514',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                              }}
                            />
                          </div>
                        </div>

                        {/* Cover Image Upload & Live Preview */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Cover Image (Choose File)</label>
                          <div className="flex items-center gap-3">
                            <label
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all"
                              style={{
                                backgroundColor: '#140E33',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                color: '#00F0FF',
                              }}
                            >
                              <Upload size={14} />
                              <span>Upload / Choose Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleGameImageFile(file, (dataUrl) => setNewGame({ ...newGame, thumbnail: dataUrl }));
                                }}
                                className="hidden"
                              />
                            </label>
                            {newGame.thumbnail && (
                              <div
                                className="relative w-14 h-12 rounded-xl overflow-hidden shrink-0 shadow-md"
                                style={{
                                  border: '1px solid rgba(0, 240, 255, 0.5)',
                                  boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)',
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={newGame.thumbnail} alt="Cover Preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Toggle Switch in Add Modal */}
                        <div
                          className="flex items-center justify-between p-3.5 rounded-xl"
                          style={{
                            backgroundColor: '#070514',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div>
                            <div className="text-xs font-bold text-white">Initial Visibility Status</div>
                            <div className="text-[11px] text-gray-400">Can be switched ON/OFF anytime from catalog list</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewGame({ ...newGame, isActive: !newGame.isActive })}
                            className="px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer"
                            style={
                              newGame.isActive
                                ? {
                                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                  color: '#6ee7b7',
                                  border: '1px solid rgba(16, 185, 129, 0.45)',
                                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)',
                                }
                                : {
                                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                  color: '#fca5a5',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                }
                            }
                          >
                            <span className={`w-2 h-2 rounded-full ${newGame.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                            <span>{newGame.isActive ? 'ON (Active)' : 'OFF (Hidden)'}</span>
                          </button>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setIsAddGameModalOpen(false)}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingGame}
                            className="py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              background: 'linear-gradient(135deg, #00F0FF 0%, #00d0e8 40%, #E026D8 100%)',
                              color: '#070514',
                              boxShadow: '0 0 25px rgba(0, 240, 255, 0.45)',
                              border: 'none',
                            }}
                          >
                            {isSavingGame ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Saving Game...</span>
                              </>
                            ) : (
                              <>
                                <Plus size={14} strokeWidth={3} />
                                <span>Add Game to Catalog</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Games Table & Mobile Cards */}
                <div
                  className="rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    backgroundColor: '#0E0A24',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 240, 255, 0.1)',
                  }}
                >
                  <div
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    style={{
                      backgroundColor: '#070514',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background: '#00F0FF',
                          boxShadow: '0 0 8px #00F0FF',
                        }}
                      />
                      <span className="text-xs font-black text-white uppercase tracking-wider">All Catalog Games</span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono"
                        style={{
                          backgroundColor: 'rgba(0, 240, 255, 0.12)',
                          color: '#00F0FF',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                        }}
                      >
                        {filteredGamesList.length} of {games.length}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                      <span className="text-amber-400">⚡</span>
                      <span>Click status switch to toggle game online/offline instantly</span>
                    </span>
                  </div>

                  {/* Mobile Cards View (Visible on small screens) */}
                  <div className="block sm:hidden divide-y divide-white/5">
                    {filteredGamesList.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs font-bold">
                        No games matching search.
                      </div>
                    ) : (
                      filteredGamesList.map(g => {
                        const isOnline = g.isActive !== false;
                        const badgeUpper = (g.badge || (g.isHot ? 'HOT' : '')).toUpperCase();
                        return (
                          <div
                            key={g.id || g._id}
                            className="p-4 space-y-3"
                            style={{ backgroundColor: 'rgba(14, 10, 36, 0.6)' }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="relative w-14 h-12 rounded-xl overflow-hidden shrink-0 shadow-md"
                                style={{
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  backgroundColor: '#000000',
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={g.thumbnail || '/images/vegas-777.svg'}
                                  alt={g.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white text-sm truncate">{g.title}</span>
                                  {badgeUpper === 'HOT' && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[9.5px] font-black"
                                      style={{
                                        backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                        color: '#fda4af',
                                        border: '1px solid rgba(244, 63, 94, 0.4)',
                                        boxShadow: '0 0 8px rgba(244, 63, 94, 0.25)',
                                      }}
                                    >
                                      🔥 HOT
                                    </span>
                                  )}
                                  {badgeUpper === 'NEW' && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[9.5px] font-black"
                                      style={{
                                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                        color: '#6ee7b7',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.25)',
                                      }}
                                    >
                                      ✨ NEW
                                    </span>
                                  )}
                                  {badgeUpper === 'POPULAR' && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[9.5px] font-black"
                                      style={{
                                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                        color: '#fcd34d',
                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                        boxShadow: '0 0 8px rgba(245, 158, 11, 0.25)',
                                      }}
                                    >
                                      ⭐ POPULAR
                                    </span>
                                  )}
                                  {badgeUpper === 'EXCLUSIVE' && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[9.5px] font-black"
                                      style={{
                                        backgroundColor: 'rgba(0, 240, 255, 0.15)',
                                        color: '#67e8f9',
                                        border: '1px solid rgba(0, 240, 255, 0.4)',
                                        boxShadow: '0 0 8px rgba(0, 240, 255, 0.25)',
                                      }}
                                    >
                                      💎 EXCLUSIVE
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 mt-0.5">{g.provider || 'Players Paradise Studio'}</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">Plays: {g.playsCount?.toLocaleString() || 0}</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextStatus = !isOnline;
                                  setGames(prev => prev.map(item => (item.id === g.id ? { ...item, isActive: nextStatus } : item)));
                                  try {
                                    await fetch('/api/games', {
                                      method: 'PUT',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: g.id, isActive: nextStatus }),
                                    });
                                  } catch (err) {
                                    console.error('Failed to toggle game status', err);
                                  }
                                }}
                                className="py-1.5 px-3.5 rounded-full text-xs font-black flex items-center gap-2 border transition-all cursor-pointer"
                                style={
                                  isOnline
                                    ? {
                                      backgroundColor: 'rgba(16, 185, 129, 0.18)',
                                      color: '#6ee7b7',
                                      border: '1px solid rgba(16, 185, 129, 0.45)',
                                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
                                    }
                                    : {
                                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                      color: '#fca5a5',
                                      border: '1px solid rgba(239, 68, 68, 0.4)',
                                    }
                                }
                              >
                                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                                <span>{isOnline ? 'ON (Available)' : 'OFF (Hidden)'}</span>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingGame({
                                    id: g.id || g._id,
                                    title: g.title || '',
                                    provider: g.provider || 'Players Paradise Studio',
                                    thumbnail: g.thumbnail || '/images/vegas-777.svg',
                                    badge: g.badge || (g.isHot ? 'HOT' : ''),
                                    url: g.url || '',
                                    isActive: g.isActive !== false,
                                  })}
                                  className="p-2 rounded-xl transition-all cursor-pointer"
                                  style={{
                                    backgroundColor: 'rgba(0, 240, 255, 0.12)',
                                    color: '#00F0FF',
                                    border: '1px solid rgba(0, 240, 255, 0.35)',
                                  }}
                                  title="Edit Game"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Remove ${g.title} from catalog?`)) {
                                      setGames(prev => prev.filter(item => item.id !== g.id));
                                      fetch(`/api/games?id=${g.id}`, { method: 'DELETE', credentials: 'include' }).catch(err => console.error(err));
                                    }
                                  }}
                                  className="p-2 rounded-xl transition-all cursor-pointer"
                                  style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                    color: '#fca5a5',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                  }}
                                  title="Delete Game"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Desktop Table View (Hidden on mobile) */}
                  <div className="hidden sm:block overflow-x-auto w-full">
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <colgroup>
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '18%' }} />
                      </colgroup>
                      <thead
                        style={{
                          backgroundColor: '#070514',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#8E8A9F',
                        }}
                        className="uppercase font-bold text-[10.5px] tracking-wider"
                      >
                        <tr>
                          <th className="py-3.5 px-4">Cover</th>
                          <th className="py-3.5 px-4">Title &amp; Provider</th>
                          <th className="py-3.5 px-4">Badge</th>
                          <th className="py-3.5 px-4">Game Status</th>
                          <th className="py-3.5 px-4">Plays</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredGamesList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                              No games matching search.
                            </td>
                          </tr>
                        ) : (
                          filteredGamesList.map(g => {
                            const isOnline = g.isActive !== false;
                            const badgeUpper = (g.badge || (g.isHot ? 'HOT' : '')).toUpperCase();
                            return (
                              <tr
                                key={g.id || g._id}
                                className="transition-colors hover:bg-white/[0.04]"
                              >
                                <td className="py-3 px-4">
                                  <div
                                    className="relative w-12 h-9 rounded-lg overflow-hidden shadow"
                                    style={{
                                      border: '1px solid rgba(255, 255, 255, 0.12)',
                                      backgroundColor: '#000000',
                                    }}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={g.thumbnail || '/images/vegas-777.svg'}
                                      alt={g.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-white text-sm hover:text-[#00F0FF] transition-colors">{g.title}</div>
                                  <div className="text-[11px] text-gray-400 mt-0.5">{g.provider || 'Players Paradise Studio'}</div>
                                </td>
                                <td className="py-3 px-4">
                                  {badgeUpper === 'HOT' && (
                                    <span
                                      className="px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1"
                                      style={{
                                        backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                        color: '#fda4af',
                                        border: '1px solid rgba(244, 63, 94, 0.4)',
                                        boxShadow: '0 0 10px rgba(244, 63, 94, 0.2)',
                                      }}
                                    >
                                      🔥 HOT
                                    </span>
                                  )}
                                  {badgeUpper === 'NEW' && (
                                    <span
                                      className="px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1"
                                      style={{
                                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                        color: '#6ee7b7',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)',
                                      }}
                                    >
                                      ✨ NEW
                                    </span>
                                  )}
                                  {badgeUpper === 'POPULAR' && (
                                    <span
                                      className="px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1"
                                      style={{
                                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                        color: '#fcd34d',
                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)',
                                      }}
                                    >
                                      ⭐ POPULAR
                                    </span>
                                  )}
                                  {badgeUpper === 'EXCLUSIVE' && (
                                    <span
                                      className="px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1"
                                      style={{
                                        backgroundColor: 'rgba(0, 240, 255, 0.15)',
                                        color: '#67e8f9',
                                        border: '1px solid rgba(0, 240, 255, 0.4)',
                                        boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)',
                                      }}
                                    >
                                      💎 EXCLUSIVE
                                    </span>
                                  )}
                                  {!['HOT', 'NEW', 'POPULAR', 'EXCLUSIVE'].includes(badgeUpper) && (
                                    <span className="text-gray-500 text-xs font-semibold">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const nextStatus = !isOnline;
                                      setGames(prev => prev.map(item => (item.id === g.id ? { ...item, isActive: nextStatus } : item)));
                                      try {
                                        await fetch('/api/games', {
                                          method: 'PUT',
                                          credentials: 'include',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ id: g.id, isActive: nextStatus }),
                                        });
                                      } catch (err) {
                                        console.error('Failed to toggle game status', err);
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-full text-[11px] font-black flex items-center gap-2 border transition-all cursor-pointer"
                                    style={
                                      isOnline
                                        ? {
                                          backgroundColor: 'rgba(16, 185, 129, 0.18)',
                                          color: '#6ee7b7',
                                          border: '1px solid rgba(16, 185, 129, 0.45)',
                                          boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)',
                                        }
                                        : {
                                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                          color: '#fca5a5',
                                          border: '1px solid rgba(239, 68, 68, 0.4)',
                                        }
                                    }
                                    title="Click to toggle game ON / OFF"
                                  >
                                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                                    <span>{isOnline ? 'ON (Available)' : 'OFF (Hidden)'}</span>
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-gray-300 font-bold font-mono">
                                  {g.playsCount?.toLocaleString() || 0}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingGame({
                                        id: g.id || g._id,
                                        title: g.title || '',
                                        provider: g.provider || 'Players Paradise Studio',
                                        thumbnail: g.thumbnail || '/images/vegas-777.svg',
                                        badge: g.badge || (g.isHot ? 'HOT' : ''),
                                        url: g.url || '',
                                        isActive: g.isActive !== false,
                                      })}
                                      className="p-2 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                                      style={{
                                        backgroundColor: 'rgba(0, 240, 255, 0.12)',
                                        color: '#00F0FF',
                                        border: '1px solid rgba(0, 240, 255, 0.35)',
                                        boxShadow: '0 0 10px rgba(0, 240, 255, 0.15)',
                                      }}
                                      title="Edit Game"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm(`Remove ${g.title} from catalog?`)) {
                                          await fetch(`/api/games?id=${g.id}`, { method: 'DELETE', credentials: 'include' });
                                          setGames(games.filter(item => item.id !== g.id));
                                        }
                                      }}
                                      className="p-2 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                                      style={{
                                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                        color: '#fca5a5',
                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)',
                                      }}
                                      title="Delete Game"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit Game Modal */}
                {editingGame && (
                  <div
                    className="vegas-modal-overlay"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      width: '100vw',
                      height: '100vh',
                      backgroundColor: 'rgba(5, 3, 15, 0.92)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      zIndex: 999999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                    }}
                    onClick={() => setEditingGame(null)}
                  >
                    <div
                      className="vegas-modal-card w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-scrollable relative space-y-4"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: '#0E0A24',
                        background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.45)',
                        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.25)',
                        borderRadius: '20px',
                        fontFamily: 'Lexend, -apple-system, sans-serif',
                      }}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#00F0FF]"
                            style={{
                              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(224, 38, 216, 0.15) 100%)',
                              border: '1px solid rgba(0, 240, 255, 0.4)',
                              boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
                            }}
                          >
                            <Edit2 size={16} />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-white m-0 tracking-wide">Edit Game: {editingGame.title}</h3>
                            <p className="text-[11px] text-gray-400 m-0">Update title, studio provider, badge and availability</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingGame(null)}
                          className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!editingGame.title.trim()) return alert('Game title is required');

                          const updatedGame = { ...editingGame };
                          // 1. Optimistic update (0ms)
                          setGames(prev => prev.map(item => item.id === updatedGame.id ? { ...item, ...updatedGame } : item));
                          // 2. Dismiss modal immediately in 0ms!
                          setEditingGame(null);

                          // 3. Fire API in background
                          try {
                            const res = await fetch('/api/games', {
                              method: 'PUT',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updatedGame),
                            });
                            const d = await res.json();
                            if (!d.success) {
                              alert(d.error || 'Failed to update game');
                            }
                          } catch (err) {
                            console.error('Failed to update game', err);
                          }
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Game Title *</label>
                          <input
                            type="text"
                            value={editingGame.title}
                            onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                            required
                            className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all"
                            style={{
                              backgroundColor: '#070514',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Provider / Studio</label>
                            <input
                              type="text"
                              value={editingGame.provider}
                              onChange={(e) => setEditingGame({ ...editingGame, provider: e.target.value })}
                              className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all"
                              style={{
                                backgroundColor: '#070514',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                              }}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Badge System</label>
                            <select
                              value={editingGame.badge || ''}
                              onChange={(e) => setEditingGame({ ...editingGame, badge: e.target.value })}
                              className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all font-bold cursor-pointer"
                              style={{
                                backgroundColor: '#070514',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                              }}
                            >
                              <option value="HOT">🔥 HOT</option>
                              <option value="NEW">✨ NEW</option>
                              <option value="POPULAR">⭐ POPULAR</option>
                              <option value="EXCLUSIVE">💎 EXCLUSIVE</option>
                              <option value="">No Badge</option>
                            </select>
                          </div>
                        </div>

                        {/* Image Choose / Upload */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Cover Image</label>
                          <div className="flex items-center gap-3">
                            <div
                              className="relative w-14 h-12 rounded-xl overflow-hidden shrink-0 shadow-md"
                              style={{
                                border: '1px solid rgba(0, 240, 255, 0.5)',
                                boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)',
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={editingGame.thumbnail || '/images/vegas-777.svg'} alt="Cover Preview" className="w-full h-full object-cover" />
                            </div>
                            <label
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all"
                              style={{
                                backgroundColor: '#140E33',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                color: '#00F0FF',
                              }}
                            >
                              <Upload size={14} />
                              <span>Change / Upload New Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleGameImageFile(file, (dataUrl) => setEditingGame({ ...editingGame, thumbnail: dataUrl }));
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Launch URL */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider">Launch URL (Optional)</label>
                          <input
                            type="text"
                            value={editingGame.url || ''}
                            onChange={(e) => setEditingGame({ ...editingGame, url: e.target.value })}
                            placeholder="https://..."
                            className="w-full rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all"
                            style={{
                              backgroundColor: '#070514',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                            }}
                          />
                        </div>

                        {/* Status Toggle in Modal */}
                        <div
                          className="flex items-center justify-between p-3.5 rounded-xl"
                          style={{
                            backgroundColor: '#070514',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div>
                            <div className="text-xs font-bold text-white">Game Availability (ON / OFF)</div>
                            <div className="text-[11px] text-gray-400">When OFF, game is hidden completely from players</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingGame({ ...editingGame, isActive: !editingGame.isActive })}
                            className="px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer"
                            style={
                              editingGame.isActive
                                ? {
                                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                  color: '#6ee7b7',
                                  border: '1px solid rgba(16, 185, 129, 0.45)',
                                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)',
                                }
                                : {
                                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                  color: '#fca5a5',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                }
                            }
                          >
                            <span className={`w-2 h-2 rounded-full ${editingGame.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                            <span>{editingGame.isActive ? 'ON (Active)' : 'OFF (Hidden)'}</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setEditingGame(null)}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingGame}
                            className="py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              background: 'linear-gradient(135deg, #00F0FF 0%, #00d0e8 40%, #E026D8 100%)',
                              color: '#070514',
                              boxShadow: '0 0 25px rgba(0, 240, 255, 0.45)',
                              border: 'none',
                            }}
                          >
                            {isSavingGame ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Saving Changes...</span>
                              </>
                            ) : (
                              <>
                                <Check size={14} strokeWidth={3} />
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 3: FINANCE & PAYMENTS */}
          {activeTab === 'finance' && (
            <FinanceUnifiedDesk
              deposits={deposits}
              redemptions={redemptions}
              paymentMethods={paymentMethods}
              customDepositSC={customDepositSC}
              setCustomDepositSC={setCustomDepositSC}
              isRefreshing={refreshingFinance}
              onRefresh={() => {
                setRefreshingFinance(true);
                syncRequestsAndAlerts().finally(() => setRefreshingFinance(false));
              }}
              onApproveDeposit={async (depositId, scToCredit) => {
                setActiveAlertToast((curr) => (curr?.type === 'deposit' ? null : curr));
                // Optimistic UI update: immediately mark deposit as approved (0ms)
                setDeposits((prev) =>
                  prev.map((item) =>
                    item.id === depositId
                      ? { ...item, status: 'approved', creditedSC: Number(scToCredit) }
                      : item
                  )
                );

                try {
                  const res = await fetch('/api/payments/deposit', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ depositId, action: 'approve', customSC: Number(scToCredit) }),
                  });
                  const data = await res.json();
                  if (!data.success) {
                    alert(data.error || 'Failed to approve deposit');
                    syncRequestsAndAlerts();
                  } else {
                    syncRequestsAndAlerts();
                  }
                } catch (e) {
                  console.error(e);
                  syncRequestsAndAlerts();
                }
              }}
              onRejectDeposit={async (depositId, reason) => {
                setActiveAlertToast((curr) => (curr?.type === 'deposit' ? null : curr));
                // Optimistic UI update: immediately mark deposit as rejected (0ms)
                setDeposits((prev) =>
                  prev.map((item) => (item.id === depositId ? { ...item, status: 'rejected' } : item))
                );

                try {
                  const res = await fetch('/api/payments/deposit', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ depositId, action: 'reject', rejectReason: reason }),
                  });
                  const data = await res.json();
                  if (!data.success) {
                    alert(data.error || 'Failed to reject deposit');
                    syncRequestsAndAlerts();
                  } else {
                    syncRequestsAndAlerts();
                  }
                } catch (e) {
                  console.error(e);
                  syncRequestsAndAlerts();
                }
              }}
              onApproveRedemption={async (redemptionId) => {
                setActiveAlertToast((curr) => (curr?.type === 'redemption' ? null : curr));
                // Optimistic UI update: immediately mark redemption as approved & dispatched (0ms)
                setRedemptions((prev) =>
                  prev.map((item) =>
                    item.id === redemptionId ? { ...item, status: 'approved', stage: 'completed' } : item
                  )
                );

                try {
                  const res = await fetch('/api/payments/withdraw', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ redemptionId, action: 'approve' }),
                  });
                  const data = await res.json();
                  if (!data.success) {
                    alert(data.error || 'Failed to dispatch redemption');
                    syncRequestsAndAlerts();
                  } else {
                    syncRequestsAndAlerts();
                    // Broadcast instant balance deduction to player windows (Zero Page Refresh)
                    try {
                      const balanceChan = new BroadcastChannel('paradise_balance_sync');
                      balanceChan.postMessage({ type: 'BALANCE_UPDATED', time: Date.now() });
                      balanceChan.close();
                    } catch {}
                    localStorage.setItem('paradise_user_balance_sync', String(Date.now()));
                  }
                } catch (e) {
                  console.error(e);
                  syncRequestsAndAlerts();
                }
              }}
              onRejectRedemption={async (redemptionId, reason) => {
                setActiveAlertToast((curr) => (curr?.type === 'redemption' ? null : curr));
                // Optimistic UI update: immediately mark redemption as rejected (0ms)
                setRedemptions((prev) =>
                  prev.map((item) => (item.id === redemptionId ? { ...item, status: 'rejected', stage: 'rejected' } : item))
                );

                try {
                  const res = await fetch('/api/payments/withdraw', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ redemptionId, action: 'reject', rejectReason: reason }),
                  });
                  const data = await res.json();
                  if (!data.success) {
                    alert(data.error || 'Failed to reject redemption');
                    syncRequestsAndAlerts();
                  } else {
                    syncRequestsAndAlerts();
                    // Broadcast instant unfreeze of balance to player windows (Zero Page Refresh)
                    try {
                      const balanceChan = new BroadcastChannel('paradise_balance_sync');
                      balanceChan.postMessage({ type: 'BALANCE_UPDATED', time: Date.now() });
                      balanceChan.close();
                    } catch {}
                    localStorage.setItem('paradise_user_balance_sync', String(Date.now()));
                  }
                } catch (e) {
                  console.error(e);
                  syncRequestsAndAlerts();
                }
              }}
            />
          )}

          {/* TAB 4: PLAYERS LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Immutable Players Ledger</h2>
                  <p className="text-xs text-gray-400">Complete double-entry audit trail of all coin transactions</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Filter username..."
                    value={ledgerFilterUser}
                    onChange={(e) => setLedgerFilterUser(e.target.value)}
                    className="py-1.5 px-3 text-xs w-full xs:max-w-[180px] bg-[#070514] border border-white/10 rounded-xl text-white"
                  />
                  <select
                    value={ledgerFilterType}
                    onChange={(e) => setLedgerFilterType(e.target.value)}
                    className="py-1.5 px-3 text-xs w-full xs:max-w-[160px] bg-[#070514] border border-white/10 rounded-xl text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="deposit">Deposits</option>
                    <option value="redemption">Cashouts / Redemptions</option>
                    <option value="bonus">Deposit & Welcome Bonuses</option>
                    <option value="daily_spin">Daily Spin Bonuses</option>
                    <option value="referral_bonus">Referral Bonuses</option>
                    <option value="game_bet">Bets</option>
                    <option value="game_win">Wins</option>
                    <option value="admin_allotment">Allotments (+)</option>
                    <option value="admin_deduction">Deductions (-)</option>
                  </select>
                  <a
                    href={`/api/ledger?format=csv&username=${encodeURIComponent(ledgerFilterUser)}&type=${ledgerFilterType}`}
                    className="btn-gold py-2 px-3 text-xs font-bold flex items-center gap-1.5 w-full xs:w-auto justify-center"
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </a>
                </div>
              </div>

              <div className="bg-[#0E0A24] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-[#070514] text-gray-400 uppercase border-b border-white/5">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Player</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Before</th>
                        <th className="p-3">After</th>
                        <th className="p-3">Auditor / System</th>
                        <th className="p-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {ledgerRecords.map(r => (
                        <tr key={r.id} className="hover:bg-white/5">
                          <td className="p-3 text-gray-400">{new Date(r.createdAt).toLocaleString()}</td>
                          <td className="p-3 font-bold text-white">{r.username}</td>
                          <td className="p-3 uppercase text-[10px] font-black text-purple-300">{r.displayType || r.type.replace(/_/g, ' ')}</td>
                          <td className={`p-3 font-bold ${r.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {r.amount >= 0 ? `+$${Number(r.amount).toFixed(2)}` : `-$${Math.abs(Number(r.amount)).toFixed(2)}`} {r.currency || 'SC'}
                          </td>
                          <td className="p-3 text-gray-400">{r.balanceBefore?.toFixed(2) ?? '—'}</td>
                          <td className="p-3 text-white font-semibold">{r.balanceAfter?.toFixed(2) ?? '—'}</td>
                          <td className="p-3 text-amber-400 font-semibold">{r.performedBy}</td>
                          <td className="p-3 text-gray-400 max-w-xs truncate">{r.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: LIVE CHAT ACTIVITY */}
          {activeTab === 'chat' && (() => {
            const formatChatTime = (dateStr) => {
              if (!dateStr) return '';
              const d = new Date(dateStr);
              const now = new Date();
              const diffMs = now - d;
              const diffMins = Math.floor(diffMs / 60000);
              if (diffMins < 1) return 'Just now';
              if (diffMins < 60) return `${diffMins}m ago`;
              const diffHours = Math.floor(diffMins / 60);
              if (diffHours < 24) return `${diffHours}h ago`;
              return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
            };

            const totalUnreadChat = chatConversations.reduce((acc, c) => acc + Number(c.unreadCount || (c.unreadStaff ? 1 : 0)), 0);

            const filteredChatConvs = chatConversations
              .filter(c => {
                const q = chatSearchQuery.trim().toLowerCase();
                const matchesSearch = !q ||
                  (c.username && c.username.toLowerCase().includes(q)) ||
                  (c.lastMessage && c.lastMessage.toLowerCase().includes(q));
                if (chatFilterTab === 'unread') {
                  return matchesSearch && ((c.unreadCount || 0) > 0 || Boolean(c.unreadStaff));
                }
                return matchesSearch;
              })
              .sort((a, b) => {
                const aUnread = (a.unreadCount || 0) > 0 || Boolean(a.unreadStaff);
                const bUnread = (b.unreadCount || 0) > 0 || Boolean(b.unreadStaff);
                if (aUnread !== bUnread) return aUnread ? -1 : 1;
                return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
              });

            const cannedReplies = [
              "👋 Hello! How may Rich Room Concierge assist you today?",
              "✅ Your deposit has been confirmed and credited to your wallet!",
              "⏳ Your withdrawal request is currently being reviewed by finance.",
              "📸 Please provide a clear screenshot receipt of your transfer.",
              "🎉 A VIP loyalty bonus has been awarded to your account!",
            ];

            const handleSendChatMessage = async (e, directText) => {
              if (e && e.preventDefault) e.preventDefault();
              const text = (directText !== undefined ? directText : chatReplyText).trim();
              const imagePayload = directText !== undefined ? null : chatAttachedImage;
              if ((!text && !imagePayload) || !activeChatConv || isSendingChat) return;

              setIsSendingChat(true);
              const optimisticMsg = {
                id: `temp_${Date.now()}`,
                conversationId: activeChatConv._id,
                userId: activeChatConv.userId,
                username: user?.username || 'Rich Room Support',
                senderRole: 'staff',
                text: text,
                imageUrl: imagePayload || null,
                read: true,
                createdAt: new Date().toISOString(),
              };
              setChatMessages(prev => [...prev, optimisticMsg]);
              setChatReplyText('');
              setChatAttachedImage(null);

              try {
                await fetch('/api/chat', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    conversationId: activeChatConv._id,
                    targetUserId: activeChatConv.userId,
                    targetUsername: activeChatConv.username,
                    text: text,
                    imageUrl: imagePayload || null,
                    isStaffReply: true,
                  }),
                });
                const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(activeChatConv._id)}&admin=true&markRead=true`, { credentials: 'include', cache: 'no-store' });
                const d = await res.json();
                if (d.success) setChatMessages(d.messages);
                const cRes = await fetch('/api/chat?inbox=true', { credentials: 'include', cache: 'no-store' });
                const cD = await cRes.json();
                if (cD.success) setChatConversations(cD.conversations);

                // Instant cross-tab broadcast to player widget & /chat
                try {
                  const pChannel = new BroadcastChannel('paradise_player_chat_sync');
                  pChannel.postMessage({
                    type: 'STAFF_CHAT_REPLY',
                    conversationId: activeChatConv._id,
                    time: Date.now(),
                  });
                  pChannel.close();
                } catch {}
                try {
                  localStorage.setItem(
                    'paradise_player_chat_event',
                    JSON.stringify({
                      type: 'STAFF_CHAT_REPLY',
                      conversationId: activeChatConv._id,
                      time: Date.now(),
                    })
                  );
                } catch {}
              } catch (err) {
                console.error('Failed to send chat message:', err);
              } finally {
                setIsSendingChat(false);
              }
            };

            return (
              <div
                className="flex-1 h-full min-h-0 flex flex-col space-y-3"
                style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}
              >
                {/* Top Luxury Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/25 via-purple-600/30 to-amber-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                      <Headphones size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                          Live Support Concierge
                        </h2>
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Live Socket Desk
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        24/7 Real-Time VIP Player Inquiries & Hospitality Assistance
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-xs font-bold text-amber-300">
                      <ShieldCheck size={14} className="text-amber-400" />
                      <span>Strict Compliance: Immutable Chat Audit</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        fetch('/api/chat?inbox=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) setChatConversations(d.conversations); });
                        if (activeChatConv) {
                          fetch(`/api/chat?conversationId=${encodeURIComponent(activeChatConv._id)}&admin=true&markRead=true`, { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) setChatMessages(d.messages); });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition"
                      title="Refresh Inbox"
                    >
                      <RefreshCw size={13} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Main Chat Workspace */}
                <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 overflow-hidden relative">
                  {/* Left: Active Inquiries List */}
                  <div className={`${activeChatConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 h-full bg-gradient-to-b from-[#0f0c29]/90 to-[#070518]/90 border border-white/10 rounded-2xl flex-col overflow-hidden shadow-2xl backdrop-blur-xl shrink-0`}>
                    {/* Inbox Header & Search */}
                    <div className="p-3.5 border-b border-white/10 space-y-3 bg-[#0a071c]/70">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={15} className="text-cyan-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">
                            Active Inquiries
                          </span>
                        </div>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {chatConversations.length} Open
                        </span>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          placeholder="Search player or keyword..."
                          className="w-full bg-[#141033] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/80 transition"
                        />
                        {chatSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setChatSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setChatFilterTab('all')}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition ${chatFilterTab === 'all'
                            ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                          All ({chatConversations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatFilterTab('unread')}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition flex items-center justify-center gap-1.5 ${chatFilterTab === 'unread'
                            ? 'bg-red-500/25 text-red-300 border border-red-400/50 shadow-sm'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                          <span>Unread</span>
                          {totalUnreadChat > 0 && (
                            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                              {totalUnreadChat}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* List of Conversations */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-white/[0.04]">
                      {filteredChatConvs.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
                          <MessageSquare size={32} className="text-gray-600 mb-2" />
                          <p className="text-xs font-bold text-gray-400">No inquiries found</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            {chatSearchQuery ? 'Try clearing your search query' : 'Queue is clear. No pending inquiries.'}
                          </p>
                        </div>
                      ) : (
                        filteredChatConvs.map((c) => {
                          const isSelected = activeChatConv?._id === c._id;
                          const unreadNum = Number(c.unreadCount || (c.unreadStaff ? 1 : 0));
                          const hasUnread = unreadNum > 0;
                          return (
                            <div
                              key={c._id}
                              onClick={() => setActiveChatConv(c)}
                              className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border relative ${isSelected
                                ? 'bg-gradient-to-r from-cyan-950/60 via-[#191444] to-[#120f35] border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/30'
                                : hasUnread
                                  ? 'bg-gradient-to-r from-rose-950/70 via-[#24123b] to-[#160f30] hover:from-rose-900/70 border-rose-500/70 shadow-[0_0_18px_rgba(244,63,94,0.28)] ring-1 ring-rose-500/40'
                                  : 'bg-white/[0.02] hover:bg-white/[0.06] border-transparent'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm uppercase shadow-sm border ${
                                    hasUnread
                                      ? 'bg-gradient-to-tr from-rose-600/60 via-amber-500/40 to-purple-600/40 border-rose-400/70'
                                      : 'bg-gradient-to-tr from-purple-600/40 via-cyan-500/20 to-amber-500/20 border-white/20'
                                  }`}>
                                    {c.username ? c.username.charAt(0) : 'P'}
                                  </div>
                                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0e0a24] ${
                                    hasUnread ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                                  }`} />
                                  {hasUnread && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-[#0e0a24]" />
                                  )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`text-xs font-black truncate ${
                                        isSelected ? 'text-cyan-300' : hasUnread ? 'text-rose-200' : 'text-white'
                                      }`}>
                                        {c.username || 'Anonymous'}
                                      </span>
                                      {hasUnread && (
                                        <span className="shrink-0 px-1.5 py-0.2 rounded bg-rose-500/30 border border-rose-400/50 text-rose-200 font-black text-[8px] uppercase tracking-wider animate-pulse">
                                          NEW MSG
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-[10px] shrink-0 font-bold ${hasUnread ? 'text-rose-300' : 'text-gray-500'}`}>
                                      {formatChatTime(c.updatedAt)}
                                    </span>
                                  </div>
                                  <p className={`text-[11px] truncate leading-tight ${
                                    hasUnread ? 'text-white font-bold' : 'text-gray-400'
                                  }`}>
                                    {c.lastSenderRole === 'staff' ? (
                                      <span className="text-cyan-400 font-semibold">You: </span>
                                    ) : null}
                                    {c.lastMessage || 'Active inquiry'}
                                  </p>
                                </div>

                                {/* Unread Pill */}
                                {hasUnread && (
                                  <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-bounce">
                                    {unreadNum}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right: Active Chat View OR Concierge Welcome Hub */}
                  <div className={`${activeChatConv ? 'flex' : 'hidden md:flex'} flex-1 h-full min-h-0 bg-gradient-to-b from-[#0f0c29]/95 to-[#070518]/95 border border-white/10 rounded-2xl flex-col overflow-hidden shadow-2xl backdrop-blur-xl relative`}>
                    {activeChatConv ? (
                      <>
                        {/* Active Chat Header */}
                        <div className="p-3.5 bg-[#0a071c]/90 border-b border-white/10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Mobile Back Button */}
                            <button
                              type="button"
                              onClick={() => setActiveChatConv(null)}
                              className="md:hidden px-2.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 flex items-center gap-1 text-xs font-bold transition shrink-0"
                            >
                              <ArrowLeft size={14} />
                              <span>Back</span>
                            </button>

                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-purple-600/30 border border-cyan-400/40 flex items-center justify-center text-white font-black text-sm uppercase">
                                {activeChatConv.username ? activeChatConv.username.charAt(0) : 'P'}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0e0a24]" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-white text-sm truncate">
                                  {activeChatConv.username}
                                </p>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                  Online
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-mono truncate">
                                Player ID: {activeChatConv.userId}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons in Header */}
                          <div className="flex items-center gap-2 shrink-0">
                            {activeChatConv.userId && (
                              <button
                                type="button"
                                onClick={() => setSelectedPlayerId(activeChatConv.userId)}
                                className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/35 text-purple-300 hover:bg-purple-500/25 flex items-center gap-1.5 text-xs font-bold transition shadow-sm"
                                title="Open Player Profile"
                              >
                                <User size={13} />
                                <span className="hidden sm:inline">Player Profile</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                fetch(`/api/chat?conversationId=${activeChatConv._id}`, { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) setChatMessages(d.messages); });
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition"
                              title="Refresh Chat"
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveChatConv(null)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-300 border border-white/10 text-gray-400 transition hidden md:block"
                              title="Close Chat"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Chat Messages Stream */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#070518]/60">
                          {/* Session Notice */}
                          <div className="flex items-center justify-center my-1">
                            <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] text-gray-400 font-medium flex items-center gap-1.5">
                              <ShieldCheck size={12} className="text-cyan-400" />
                              Immutable Rich Room Support Session
                            </span>
                          </div>

                          {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs text-center py-12">
                              <MessageSquare size={32} className="text-gray-600 mb-2" />
                              <p className="font-bold text-gray-400">No messages in this inquiry yet.</p>
                              <p className="text-[11px] text-gray-600 mt-1">
                                Send a message or choose a quick response below.
                              </p>
                            </div>
                          ) : (
                            chatMessages.map((m) => {
                              const isStaff = m.senderRole === 'staff';
                              return (
                                <div
                                  key={m.id}
                                  className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                                >
                                  <div className={`flex items-start gap-2 max-w-[85%] sm:max-w-[75%] ${isStaff ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar icon */}
                                    <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black uppercase mt-1 border shadow-sm">
                                      {isStaff ? (
                                        <div className="w-full h-full rounded-lg bg-gradient-to-tr from-cyan-400 to-cyan-600 text-black flex items-center justify-center font-black">
                                          PP
                                        </div>
                                      ) : (
                                        <div className="w-full h-full rounded-lg bg-gradient-to-tr from-purple-600/50 to-pink-600/40 text-purple-200 border-white/20 flex items-center justify-center font-black">
                                          {m.username ? m.username.charAt(0) : 'P'}
                                        </div>
                                      )}
                                    </div>

                                    {/* Bubble */}
                                    <div>
                                      <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-lg ${isStaff
                                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-semibold rounded-tr-none shadow-[0_4px_15px_rgba(0,240,255,0.2)]'
                                        : 'bg-[#181238] text-gray-100 border border-white/10 rounded-tl-none shadow-md'
                                        }`}>
                                        {m.imageUrl && (
                                          <div className="mb-2 overflow-hidden rounded-xl">
                                            <img
                                              src={m.imageUrl}
                                              alt="Attachment"
                                              onClick={() => setSelectedChatImagePreview(m.imageUrl)}
                                              className="max-h-60 max-w-full rounded-xl object-cover cursor-pointer hover:opacity-90 border border-white/20 shadow-md transition"
                                            />
                                          </div>
                                        )}
                                        {m.text && <p className="break-words">{m.text}</p>}
                                      </div>
                                      <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 font-mono ${isStaff ? 'justify-end' : 'justify-start'}`}>
                                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {isStaff && (
                                          <span className="text-cyan-400 font-bold flex items-center gap-0.5">
                                            <CheckCheck size={12} />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <div ref={chatMessagesEndRef} />
                        </div>

                        {/* Canned Quick Replies */}
                        <div className="px-3.5 py-2 bg-[#09071c] border-t border-white/5 overflow-x-auto flex items-center gap-2 no-scrollbar">
                          <span className="text-[10px] font-black uppercase text-gray-400 shrink-0 flex items-center gap-1">
                            <Sparkles size={11} className="text-amber-400" /> Quick Replies:
                          </span>
                          {cannedReplies.map((reply, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendChatMessage(null, reply)}
                              disabled={isSendingChat}
                              className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-gray-300 hover:text-cyan-200 text-[11px] font-medium transition active:scale-95 disabled:opacity-50"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>

                        {/* Pending Image Attachment in Admin */}
                        {chatAttachedImage && (
                          <div className="px-3 py-2 bg-[#0c0820] border-t border-cyan-500/20 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={chatAttachedImage}
                                alt="Attachment preview"
                                className="w-10 h-10 rounded-lg object-cover border border-cyan-400 shrink-0"
                              />
                              <span className="text-[11px] text-slate-300 truncate font-mono">
                                Image ready to send to {activeChatConv.username}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setChatAttachedImage(null)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition"
                              title="Remove attachment"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}

                        {/* Hidden Admin Chat File Input */}
                        <input
                          type="file"
                          accept="image/*"
                          ref={adminChatFileInputRef}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingChatImage(true);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new window.Image();
                              img.onload = () => {
                                const maxDim = 1200;
                                let w = img.width;
                                let h = img.height;
                                if (w > maxDim || h > maxDim) {
                                  if (w > h) {
                                    h = Math.round((h * maxDim) / w);
                                    w = maxDim;
                                  } else {
                                    w = Math.round((w * maxDim) / h);
                                    h = maxDim;
                                  }
                                }
                                const canvas = document.createElement('canvas');
                                canvas.width = w;
                                canvas.height = h;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0, w, h);
                                setChatAttachedImage(canvas.toDataURL('image/jpeg', 0.82));
                                setIsUploadingChatImage(false);
                              };
                              img.onerror = () => {
                                setChatAttachedImage(event.target.result);
                                setIsUploadingChatImage(false);
                              };
                              img.src = event.target.result;
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />

                        {/* Reply Input Form */}
                        <form
                          onSubmit={handleSendChatMessage}
                          style={{
                            paddingBottom: adminChatKeyboardOffset > 0 ? `${adminChatKeyboardOffset + 10}px` : undefined,
                          }}
                          className="p-3 bg-[#0a071c] border-t border-white/10 flex items-center gap-2 transition-all duration-150"
                        >
                          <button
                            type="button"
                            onClick={() => adminChatFileInputRef.current?.click()}
                            disabled={isUploadingChatImage || isSendingChat}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-cyan-300 border border-white/10 transition shrink-0"
                            title="Attach screenshot or photo"
                          >
                            {isUploadingChatImage ? (
                              <RefreshCw size={15} className="animate-spin text-cyan-400" />
                            ) : (
                              <Paperclip size={15} />
                            )}
                          </button>

                          <input
                            type="text"
                            placeholder={`Reply to ${activeChatConv.username}...`}
                            value={chatReplyText}
                            onChange={(e) => setChatReplyText(e.target.value)}
                            className="flex-1 py-2.5 px-4 text-xs bg-[#141033] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/80 transition"
                          />
                          <button
                            type="submit"
                            disabled={(!chatReplyText.trim() && !chatAttachedImage) || isSendingChat}
                            className="btn-gold py-2.5 px-5 text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-50 transition shrink-0"
                          >
                            {isSendingChat ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Send size={13} />
                            )}
                            <span>Send</span>
                          </button>
                        </form>
                      </>
                    ) : (
                      /* Concierge Command Welcome Hub (replaces the empty void) */
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
                        {/* Ambient background glows */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 max-w-md flex flex-col items-center">
                          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/25 via-purple-600/30 to-amber-500/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_35px_rgba(0,240,255,0.25)] mb-5">
                            <Headphones size={36} className="text-cyan-300" />
                          </div>

                          <h3 className="text-2xl font-black text-white tracking-wide mb-2">
                            Rich Room Concierge Terminal
                          </h3>
                          <p className="text-xs text-gray-400 leading-relaxed mb-6">
                            Select an active player inquiry from the left to start live messaging, review tickets, or view player 360° profiles.
                          </p>

                          {/* Quick KPI stats */}
                          <div className="grid grid-cols-3 gap-3 w-full mb-6">
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                              <p className="text-[10px] uppercase font-bold text-gray-400">Total Inquiries</p>
                              <p className="text-lg font-black text-cyan-300 mt-0.5">{chatConversations.length}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                              <p className="text-[10px] uppercase font-bold text-gray-400">Unread</p>
                              <p className={`text-lg font-black mt-0.5 ${totalUnreadChat > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {totalUnreadChat}
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                              <p className="text-[10px] uppercase font-bold text-gray-400">Policy</p>
                              <p className="text-xs font-black text-amber-300 mt-1.5 flex items-center justify-center gap-1">
                                <ShieldCheck size={12} /> Append-Only
                              </p>
                            </div>
                          </div>

                          {chatConversations.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const target = chatConversations.find(c => (c.unreadCount || 0) > 0) || chatConversations[0];
                                setActiveChatConv(target);
                              }}
                              className="btn-gold px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:scale-105 transition"
                            >
                              <MessageSquare size={15} />
                              <span>Open Latest Player Inquiry</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Chat Fullscreen Lightbox Modal */}
                  {selectedChatImagePreview && (
                    <div
                      className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
                      onClick={() => setSelectedChatImagePreview(null)}
                    >
                      <div
                        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedChatImagePreview(null)}
                          className="absolute -top-12 right-0 p-2 rounded-full bg-slate-800/90 hover:bg-red-600 text-white border border-white/20 shadow-xl transition"
                          title="Close"
                        >
                          <X size={20} />
                        </button>
                        <img
                          src={selectedChatImagePreview}
                          alt="Enlarged Attachment"
                          className="max-h-[80vh] max-w-full rounded-2xl object-contain border border-cyan-400 shadow-[0_0_50px_rgba(0,240,255,0.35)]"
                        />
                        <div className="mt-3.5 flex items-center gap-3">
                          <a
                            href={selectedChatImagePreview}
                            download="chat-attachment.jpg"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black text-xs transition flex items-center gap-1.5 shadow-lg hover:scale-105 active:scale-95"
                          >
                            <span>Download / Save Image</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setSelectedChatImagePreview(null)}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 9: PUSH NOTIFICATIONS & BROADCASTS */}
          {activeTab === 'promos' && (() => {
            const handleDispatchBroadcast = async (e) => {
              e.preventDefault();
              if (!pushTitle.trim() || !pushBody.trim()) {
                alert('Please provide both headline and message body.');
                return;
              }

              setIsDispatchingPush(true);
              const channel = document.getElementById('promoChannel')?.value || 'all';
              const segment = document.getElementById('promoSegment')?.value || 'all';
              const actionUrl = document.getElementById('promoActionUrl')?.value || '/';

              try {
                const res = await fetch('/api/notifications', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: pushTitle,
                    message: pushBody,
                    channel,
                    segment,
                    url: actionUrl,
                    target: segment === 'all' ? 'all' : 'active',
                  }),
                });
                const d = await res.json();
                if (d.success) {
                  setPushStatus(`✓ Broadcast sent via [${channel.toUpperCase()}] to [${segment.toUpperCase()}]!`);
                  setPushTitle('');
                  setPushBody('');
                  // Refresh logs
                  const logsRes = await fetch('/api/notifications?admin=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json());
                  if (logsRes.success) setBroadcastLogs(logsRes.broadcasts || []);
                  setTimeout(() => setPushStatus(null), 6000);
                } else {
                  alert(d.error || 'Failed to dispatch broadcast.');
                }
              } catch (err) {
                alert(err.message || 'Error dispatching broadcast.');
              } finally {
                setIsDispatchingPush(false);
              }
            };

            return (
              <div className="space-y-6" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
                {/* Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/25 via-blue-600/30 to-purple-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                      <Megaphone size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                          Push Notifications &amp; Omnichannel Broadcasts
                        </h2>
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Live Socket Engine
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Dispatch real-time player push notifications, email alerts, in-app banners, and Facebook community drops.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        fetch('/api/notifications?admin=true', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then(d => { if (d.success) setBroadcastLogs(d.broadcasts || []); });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition"
                      title="Refresh Dispatch History"
                    >
                      <RefreshCw size={13} />
                      <span>Refresh Logs</span>
                    </button>
                  </div>
                </div>

                {/* KPI Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#120d2b] to-[#0a0718] border border-cyan-500/25 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                      Total Dispatches
                    </p>
                    <p className="text-2xl font-black text-white mt-1">
                      {broadcastLogs.length} <span className="text-xs text-gray-400 font-bold">Campaigns</span>
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#120d2b] to-[#0a0718] border border-white/10 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Delivery Channels
                    </p>
                    <p className="text-2xl font-black text-purple-300 mt-1">5 Channels</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#120d2b] to-[#0a0718] border border-white/10 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Delivery Success
                    </p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">99.8%</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#120d2b] to-[#0a0718] border border-white/10 shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Engine Status
                    </p>
                    <p className="text-xs font-black text-emerald-400 mt-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      FCM &amp; WebPush Live
                    </p>
                  </div>
                </div>

                {/* Main Workspace (2-Column Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left: Broadcast Composer (7 cols) */}
                  <div className="lg:col-span-7 bg-[#0e0a24] border border-cyan-500/30 p-6 rounded-2xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Megaphone size={16} className="text-cyan-400" />
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">
                          Omnichannel Dispatcher
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const r = await fetch('/api/notifications/test', { method: 'POST', credentials: 'include' });
                              const d = await r.json();
                              if (d.success) {
                                setPushStatus('✓ Instant test alert sent to Chrome & In-App!');
                                const logsRes = await fetch('/api/notifications?admin=true', { credentials: 'include', cache: 'no-store' }).then(res => res.json());
                                if (logsRes.success) setBroadcastLogs(logsRes.broadcasts || []);
                                setTimeout(() => setPushStatus(null), 5000);
                              }
                            } catch (e) {
                              alert('Test error: ' + e.message);
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25 text-[11px] font-bold flex items-center gap-1 transition-all"
                          title="Send instant test alert to test Chrome & In-App notifications"
                        >
                          <Zap size={13} className="text-cyan-400" />
                          <span>Send Test Notification</span>
                        </button>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Live Engine
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleDispatchBroadcast} className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1">
                            Broadcast Target Channel
                          </label>
                          <select
                            className="w-full bg-[#141033] border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                            id="promoChannel"
                            defaultValue="all"
                          >
                            <option value="all">🌐 Omnichannel (Push + Email + In-App)</option>
                            <option value="push">📱 Mobile Push Notifications Only</option>
                            <option value="email">📧 Player Email Broadcast Only</option>
                            <option value="in_app">🔔 In-App Notification Banner Only</option>
                            <option value="facebook">🔵 Facebook VIP Community Drop Announcement</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1">
                            Target Player Segment
                          </label>
                          <select
                            className="w-full bg-[#141033] border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                            id="promoSegment"
                            defaultValue="all"
                          >
                            <option value="all">👥 All Registered Players</option>
                            <option value="active">💳 Active Depositors Only</option>
                            <option value="vip">👑 Tier II &amp; VIP Players Only</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick Tag Buttons */}
                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1.5">
                          Broadcast Headline
                        </label>
                        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 no-scrollbar">
                          <span className="text-[10px] font-bold text-gray-500 shrink-0">Quick Tag:</span>
                          {[
                            '⚡ FLASH DROP:',
                            '🎁 FREE BONUS:',
                            '🔥 300% BOOST:',
                            '🎰 JACKPOT ALERT:',
                            '👑 VIP DROP:',
                            '📢 SYSTEM NOTICE:',
                          ].map((tagText, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPushTitle(prev => (prev ? `${tagText} ${prev}` : `${tagText} `))}
                              className="shrink-0 px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-gray-300 hover:text-white text-[10px] font-bold transition"
                            >
                              {tagText}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. ⚡ FLASH DROP: Free $10 SC Drop on Facebook Group!"
                          value={pushTitle}
                          onChange={(e) => setPushTitle(e.target.value)}
                          className="w-full bg-[#141033] border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1">
                          Message Body &amp; Details
                        </label>
                        <textarea
                          rows="3"
                          placeholder="e.g. Log in now to claim your exclusive VIP loyalty bonus or follow our Facebook VIP group for the drop announcement!..."
                          value={pushBody}
                          onChange={(e) => setPushBody(e.target.value)}
                          className="w-full bg-[#141033] border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1">
                          Deep Link / Action URL
                        </label>
                        <input
                          type="text"
                          id="promoActionUrl"
                          defaultValue="/wallet"
                          placeholder="e.g. /wallet, /promotions, or https://facebook.com/groups/..."
                          className="w-full bg-[#141033] border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition font-mono"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-3">
                        <button
                          type="submit"
                          disabled={isDispatchingPush || !pushTitle.trim() || !pushBody.trim()}
                          className="btn-purple py-3 px-6 text-xs font-black uppercase flex items-center gap-2 shadow-lg hover:scale-105 transition disabled:opacity-50"
                        >
                          {isDispatchingPush ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                          <span>Dispatch Multi-Channel Broadcast</span>
                        </button>
                        {pushStatus && (
                          <p className="text-xs text-emerald-400 font-bold animate-in fade-in">
                            {pushStatus}
                          </p>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Right: Live Mobile Push Notification Preview (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-[#130d2d] to-[#070518] border border-white/10 shadow-xl">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Smartphone size={16} className="text-cyan-400" />
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                            Player Mobile Lockscreen Preview
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">Live Simulation</span>
                      </div>

                      {/* Phone Notification Card Mockup */}
                      <div className="p-4 rounded-2xl bg-[#1e173e]/90 border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-[10px] font-black text-black">
                              RR
                            </div>
                            <span className="text-[11px] font-bold text-gray-300">RICH ROOM VIP</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">now</span>
                        </div>
                        <div>
                          <p className="text-xs font-black text-white line-clamp-1">
                            {pushTitle || '⚡ FLASH DROP: Free $10 SC on Rich Room!'}
                          </p>
                          <p className="text-[11px] text-gray-300 line-clamp-3 leading-relaxed mt-0.5">
                            {pushBody || 'Log in now to claim your exclusive VIP loyalty bonus. Tap here to open your player wallet!'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        💡 <strong>Omnichannel Delivery</strong> automatically fires through Web Push, SMS/Email queues, in-app notifications banner, and logs an announcement for official Facebook player communities.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom: Recent Broadcast Dispatch History (Audit Log Table) */}
                <div className="bg-[#0e0a24] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 bg-[#0a071c] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-cyan-400" />
                      <h3 className="text-xs font-black uppercase text-white tracking-wider">
                        Recent Dispatch History (Audit Log)
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400">
                      {broadcastLogs.length} Records
                    </span>
                  </div>

                  {broadcastLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      No broadcast records sent yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full min-w-[650px] text-left text-xs">
                        <thead className="bg-[#070514] text-gray-400 uppercase text-[10px] font-black tracking-wider border-b border-white/5">
                          <tr>
                            <th className="p-3.5">Timestamp</th>
                            <th className="p-3.5">Headline &amp; Message</th>
                            <th className="p-3.5">Channel</th>
                            <th className="p-3.5">Segment</th>
                            <th className="p-3.5">Sent By</th>
                            <th className="p-3.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {broadcastLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.02] transition">
                              <td className="p-3.5 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                                {new Date(log.createdAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="p-3.5 max-w-sm">
                                <p className="font-bold text-white truncate">{log.title}</p>
                                <p className="text-[11px] text-gray-400 truncate">{log.message}</p>
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase">
                                  {log.channel || 'all'}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase">
                                  {log.segment || 'all'}
                                </span>
                              </td>
                              <td className="p-3.5 font-bold text-gray-300 font-mono text-[11px]">
                                {log.sentBy}
                              </td>
                              <td className="p-3.5 text-right">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                                  Delivered ✓
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 10: AFFILIATES */}
          {activeTab === 'affiliates' && (
            <AffiliateManagementHub
              activeTab="affiliates"
              affiliates={affiliates}
              summary={affiliateSummary}
              onRefresh={() => {
                fetch('/api/affiliates?mode=admin', { credentials: 'include', cache: 'no-store' })
                  .then(r => r.json())
                  .then(d => {
                    if (d.success) {
                      setAffiliates(d.affiliates || []);
                      setAffiliateSummary(d.summary || null);
                    }
                  });
              }}
              onOpenPlayerProfile={(uid) => setSelectedPlayerId(uid)}
            />
          )}

          {activeTab === 'staff' && user.role === 'super_admin' && (
            <div className="space-y-6" style={{ fontFamily: 'Lexend, sans-serif' }}>
              {/* Header & Action Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />
                    Role-Based Staff Access Control (RBAC)
                  </h2>
                  <p className="text-xs text-[#9A91A8] mt-1">
                    Create staff accounts, assign granular module permissions, and manage active internal credentials
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#E026D8] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                >
                  <Plus size={15} className="text-black stroke-[3]" />
                  <span>Create Staff Officer</span>
                </button>
              </div>

              {/* Staff Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0E0A24] border border-[#00F0FF]/25 p-4 rounded-xl shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Staff Officers</span>
                    <UserCheck size={16} className="text-[#00F0FF]" />
                  </div>
                  <span className="text-2xl font-black text-white mt-1 block font-mono">{staffList.length}</span>
                  <span className="text-[11px] text-[#00F0FF] mt-0.5 block">Configured staff accounts</span>
                </div>

                <div className="bg-[#0E0A24] border border-emerald-500/30 p-4 rounded-xl shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Active On-Duty</span>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">
                    {staffList.filter(s => !s.isBanned).length}
                  </span>
                  <span className="text-[11px] text-emerald-400/80 mt-0.5 block">Full portal credentials active</span>
                </div>

                <div className="bg-[#0E0A24] border border-rose-500/30 p-4 rounded-xl shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Suspended Staff</span>
                    <X size={16} className="text-rose-400" />
                  </div>
                  <span className="text-2xl font-black text-rose-400 mt-1 block font-mono">
                    {staffList.filter(s => s.isBanned).length}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-0.5 block">Access blocked</span>
                </div>
              </div>

              {/* MODAL: CREATE NEW STAFF OFFICER */}
              {isAddStaffModalOpen && (
                <div
                  className="vegas-modal-overlay"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(5, 3, 15, 0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                  onClick={() => setIsAddStaffModalOpen(false)}
                >
                  <div
                    className="vegas-modal-card w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-scrollable relative space-y-4"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backgroundColor: '#0E0A24',
                      background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.45)',
                      boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.25)',
                      borderRadius: '20px',
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
                          <Plus size={16} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white m-0">Create New Staff Officer</h3>
                          <p className="text-[11px] text-gray-400 m-0">Instant role delegation with session tokens</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddStaffModalOpen(false)}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const res = await fetch('/api/admin/staff', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(newStaff),
                        });
                        const d = await res.json();
                        if (d.success) {
                          alert(d.message);
                          setStaffList([...staffList, { ...newStaff, id: d.id, isBanned: false }]);
                          setNewStaff({ username: '', email: '', password: '', role: 'financial_manager' });
                          setIsAddStaffModalOpen(false);
                        } else {
                          alert(d.error);
                        }
                      }}
                      className="space-y-3.5"
                    >
                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Username *</label>
                        <input
                          type="text"
                          placeholder="e.g. officer_alex"
                          value={newStaff.username}
                          onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Staff Email *</label>
                        <input
                          type="email"
                          placeholder="staff@playersparadisehub.com"
                          value={newStaff.email}
                          onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Password *</label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={newStaff.password}
                          onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Assigned Role *</label>
                        <select
                          value={newStaff.role}
                          onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer transition"
                        >
                          <option value="operation_admin">Operations Manager</option>
                          <option value="financial_manager">Financial Manager</option>
                          <option value="coin_manager">Coin Allotment Officer</option>
                          <option value="chat_support">Live Chat Support Agent</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setIsAddStaffModalOpen(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-sovereign-coral py-2.5 px-6 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                        >
                          <span>Create &amp; Assign Role</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Staff List Table */}
              <div className="bg-[#0E0A24] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="bg-[#070514] text-gray-400 uppercase border-b border-white/10 font-bold text-[10.5px]">
                      <tr>
                        <th className="p-3.5">Staff Officer</th>
                        <th className="p-3.5">Email</th>
                        <th className="p-3.5">Assigned Role</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {staffList.map(s => (
                        <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="p-3.5 font-bold text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-[#00F0FF]/20 border border-white/10 flex items-center justify-center text-white font-black text-xs uppercase">
                                {s.username?.substring(0, 2) || 'ST'}
                              </div>
                              <span>{s.username}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-300 font-mono">{s.email}</td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[11px] capitalize">
                              {s.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.isBanned
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                              {s.isBanned ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                              {/* Edit Staff Officer */}
                              <button
                                type="button"
                                onClick={() => setEditingStaff({
                                  id: s.id,
                                  username: s.username,
                                  email: s.email,
                                  role: s.role,
                                  isBanned: s.isBanned,
                                  newPassword: '',
                                })}
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/30 cursor-pointer hover:scale-105 active:scale-95"
                                title="Edit staff profile & role"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>

                              {/* Suspend / Reactivate */}
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch('/api/admin/staff', {
                                      method: 'PUT',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ staffId: s.id, isBanned: !s.isBanned }),
                                    });
                                    const d = await res.json();
                                    if (d.success) {
                                      setStaffList(staffList.map(item => item.id === s.id ? { ...item, isBanned: !s.isBanned } : item));
                                    } else {
                                      alert(d.error || 'Failed to update status');
                                    }
                                  } catch (err) {
                                    alert('Network error while updating status');
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition border cursor-pointer hover:scale-105 active:scale-95 ${s.isBanned
                                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-300'
                                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-300'
                                  }`}
                                title={s.isBanned ? 'Reactivate staff access' : 'Suspend staff access'}
                              >
                                {s.isBanned ? '✓ Activate' : '✕ Suspend'}
                              </button>

                              {/* Delete Staff Officer */}
                              <button
                                type="button"
                                disabled={deletingStaffId === s.id || s.username === user.username}
                                onClick={async () => {
                                  if (s.username === user.username) {
                                    alert('Security Notice: You cannot delete your own Super Admin account.');
                                    return;
                                  }
                                  if (!confirm(`Are you sure you want to permanently delete staff officer @${s.username}? This will remove all their system credentials permanently.`)) {
                                    return;
                                  }
                                  setDeletingStaffId(s.id);
                                  try {
                                    const res = await fetch('/api/admin/staff', {
                                      method: 'DELETE',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ staffId: s.id }),
                                    });
                                    const d = await res.json();
                                    if (d.success) {
                                      setStaffList(staffList.filter(item => item.id !== s.id));
                                      alert(d.message || 'Staff officer deleted successfully');
                                    } else {
                                      alert(d.error || 'Failed to delete staff officer');
                                    }
                                  } catch (err) {
                                    alert('Network error while deleting staff officer');
                                  } finally {
                                    setDeletingStaffId(null);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition border flex items-center gap-1 cursor-pointer ${
                                  s.username === user.username
                                    ? 'opacity-30 cursor-not-allowed bg-gray-500/10 border-gray-500/20 text-gray-500'
                                    : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/35 text-rose-300 hover:scale-105 active:scale-95'
                                }`}
                                title={s.username === user.username ? 'Cannot delete yourself' : 'Permanently Delete Staff Officer'}
                              >
                                <Trash2 size={13} />
                                <span>{deletingStaffId === s.id ? 'Deleting...' : 'Delete'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODAL: EDIT STAFF OFFICER */}
              {editingStaff && (
                <div
                  className="vegas-modal-overlay"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(5, 3, 15, 0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                  onClick={() => setEditingStaff(null)}
                >
                  <div
                    className="vegas-modal-card w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto modal-scrollable relative space-y-4"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backgroundColor: '#0E0A24',
                      background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.45)',
                      boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.25)',
                      borderRadius: '20px',
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
                          <Edit2 size={16} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white m-0">Edit Staff Officer: @{editingStaff.username}</h3>
                          <p className="text-[11px] text-gray-400 m-0">Update credentials, role permissions, or reset password</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingStaff(null)}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsUpdatingStaff(true);
                        try {
                          const res = await fetch('/api/admin/staff', {
                            method: 'PUT',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              staffId: editingStaff.id,
                              username: editingStaff.username,
                              email: editingStaff.email,
                              role: editingStaff.role,
                              isBanned: editingStaff.isBanned,
                              newPassword: editingStaff.newPassword || undefined,
                            }),
                          });
                          const d = await res.json();
                          if (d.success) {
                            alert(d.message || 'Staff officer updated successfully!');
                            setStaffList(staffList.map(item => item.id === editingStaff.id ? {
                              ...item,
                              username: editingStaff.username,
                              email: editingStaff.email,
                              role: editingStaff.role,
                              isBanned: editingStaff.isBanned,
                            } : item));
                            setEditingStaff(null);
                          } else {
                            alert(d.error || 'Failed to update staff officer');
                          }
                        } catch (err) {
                          alert('Network error while updating staff');
                        } finally {
                          setIsUpdatingStaff(false);
                        }
                      }}
                      className="space-y-3.5"
                    >
                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Username *</label>
                        <input
                          type="text"
                          value={editingStaff.username}
                          onChange={(e) => setEditingStaff({ ...editingStaff, username: e.target.value })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Staff Email *</label>
                        <input
                          type="email"
                          value={editingStaff.email}
                          onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">
                          Reset Password <span className="text-[10px] text-gray-400 normal-case font-normal">(Leave blank to keep current)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Enter new password (optional)"
                          value={editingStaff.newPassword || ''}
                          onChange={(e) => setEditingStaff({ ...editingStaff, newPassword: e.target.value })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Assigned Role *</label>
                        <select
                          value={editingStaff.role}
                          onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer transition"
                        >
                          <option value="operation_admin">Operations Manager</option>
                          <option value="financial_manager">Financial Manager</option>
                          <option value="coin_manager">Coin Allotment Officer</option>
                          <option value="chat_support">Live Chat Support Agent</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Account Access Status *</label>
                        <select
                          value={editingStaff.isBanned ? 'banned' : 'active'}
                          onChange={(e) => setEditingStaff({ ...editingStaff, isBanned: e.target.value === 'banned' })}
                          className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer transition"
                        >
                          <option value="active">Active (Full Credentials On-Duty)</option>
                          <option value="banned">Suspended (Access Blocked)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setEditingStaff(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingStaff}
                          className="py-2.5 px-6 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer bg-gradient-to-r from-[#00F0FF] to-[#E026D8] text-black shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:scale-[1.02] active:scale-[0.98] transition"
                        >
                          <span>{isUpdatingStaff ? 'Saving...' : 'Update Staff Officer'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 12: SYSTEM SETTINGS */}
          {activeTab === 'settings' && user.role === 'super_admin' && (
            <div className="space-y-6 w-full" style={{ fontFamily: 'Lexend, sans-serif' }}>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_12px_#00F0FF]" />
                    System Settings &amp; USA Compliance
                  </h2>
                  <p className="text-xs text-[#9A91A8] mt-1">
                    Federal sweepstakes compliance, geo-blocking controls, minimum cashout limits &amp; real-time bonus parameters
                  </p>
                </div>
                {bonusSaveMessage && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <span>✓</span>
                    <span>{bonusSaveMessage}</span>
                  </div>
                )}
              </div>

              {/* Top Operational & Security Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                {/* 1. Minimum Redemption Payout */}
                <div className="bg-[#0E0A24] border border-emerald-500/25 p-5 sm:p-6 rounded-2xl shadow-xl space-y-3 flex flex-col justify-between hover:border-emerald-500/40 transition">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                        Minimum Cashout Threshold
                      </span>
                      <DollarSign size={18} className="text-emerald-400" />
                    </div>
                    <p className="text-2xl text-emerald-400 font-mono font-black mt-2">50.00 SC <span className="text-xs font-bold text-emerald-400/70">($50 USD)</span></p>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed m-0 pt-1 border-t border-white/5">
                    Default threshold verified against standard 1x coin rollover playthrough requirements before withdrawal.
                  </p>
                </div>

                {/* 2. Security & Fraud Protection */}
                <div className="bg-[#0E0A24] border border-purple-500/25 p-5 sm:p-6 rounded-2xl shadow-xl space-y-3 flex flex-col justify-between hover:border-purple-500/40 transition">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-400 uppercase tracking-wider block">
                        Fraud Defense &amp; Device Lock
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono font-black text-xs">
                        ACTIVE SHIELD
                      </span>
                      <span className="text-xs text-slate-300 font-bold">1-Device Binding</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed m-0 pt-1 border-t border-white/5">
                    Multi-accounting prevention &amp; automatic ledger reconciliation active across all player sessions.
                  </p>
                </div>
              </div>

              {/* Dynamic Bonus Configuration (Welcome Pack, Regular Reload & Referral) */}
              <div className="bg-[#0E0A24] border border-cyan-500/25 p-6 sm:p-7 rounded-2xl shadow-2xl space-y-6 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                      <Gift size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white m-0 tracking-wide">
                        Dynamic Player Bonus Engine
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                        Configure first-deposit welcome boost, reload match, and friend referral rewards in real-time.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-3 py-1 rounded-full font-mono font-bold bg-cyan-500/10 border border-cyan-500/25 text-[#00F0FF]">
                      REAL-TIME CALCULATIONS
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSaveBonusSettings} className="space-y-6">
                  {/* 4 Full-Width Equal-Height Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
                    {/* 1. Welcome Bonus Card */}
                    <div className="bg-[#070514] border border-cyan-500/35 p-5 sm:p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-lg">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                            1. Welcome Pack (First Deposit)
                          </span>
                          <button
                            type="button"
                            onClick={() => setSysSettings(prev => ({ ...prev, welcomeBonusActive: prev.welcomeBonusActive === false ? true : false }))}
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase whitespace-nowrap border cursor-pointer transition ${
                              sysSettings?.welcomeBonusActive !== false
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-red-500/20 border-red-500/40 text-red-300 line-through'
                            }`}
                            title="Toggle active or disable this bonus"
                          >
                            {sysSettings?.welcomeBonusActive !== false ? '● ACTIVE' : '✕ OFF / HIDDEN'}
                          </button>
                        </div>

                        {/* Match % */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                            Bonus Match Percentage
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={sysSettings?.welcomeBonusPercent ?? ''}
                              onChange={(e) => setSysSettings(prev => ({ ...prev, welcomeBonusPercent: e.target.value }))}
                              className="w-full bg-[#0E0A24] border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white font-black text-sm pr-9 outline-none transition"
                              required
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-black text-cyan-400">%</span>
                          </div>
                        </div>

                        {/* Banner Title */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                            Banner Display Title
                          </label>
                          <input
                            type="text"
                            value={sysSettings?.welcomeBonusTitle || 'WELCOME BONUS'}
                            onChange={(e) => setSysSettings(prev => ({ ...prev, welcomeBonusTitle: e.target.value }))}
                            className="w-full bg-[#0E0A24] border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white font-bold text-xs outline-none transition"
                            required
                          />
                        </div>

                        {/* Banner Subtitle / Description */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                            Banner Subtitle / Description
                          </label>
                          <textarea
                            rows={3}
                            value={sysSettings?.welcomeBonusSubtitle || 'Get a 300% bonus on your first deposit! Instant approval & fast cashouts.'}
                            onChange={(e) => setSysSettings(prev => ({ ...prev, welcomeBonusSubtitle: e.target.value }))}
                            className="w-full bg-[#0E0A24] border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white text-xs leading-relaxed outline-none transition resize-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Simulation Tag */}
                      <div className="pt-3 border-t border-cyan-500/15">
                        <div className="rounded-xl p-3 bg-[#0E0A24] border border-cyan-500/20 text-[11px] text-cyan-300 space-y-1">
                          <span className="font-bold text-white block">💡 Live Simulation:</span>
                          <p className="text-[10.5px] text-slate-300 leading-relaxed m-0 font-mono">
                            Player deposits $100 ➔ Receives 100 SC + <strong className="text-cyan-400">{(Number(sysSettings?.welcomeBonusPercent ?? 300))} SC Bonus</strong> = {100 + Number(sysSettings?.welcomeBonusPercent ?? 300)} SC Total
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Regular Reload Bonus Card */}
                    <div className="bg-[#070514] border border-purple-500/35 p-5 sm:p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-lg">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-purple-400 uppercase tracking-wider">
                            2. Regular Reload (Subsequent)
                          </span>
                          <button
                            type="button"
                            onClick={() => setSysSettings(prev => ({ ...prev, regularBonusActive: prev.regularBonusActive === false ? true : false }))}
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase whitespace-nowrap border cursor-pointer transition ${
                              sysSettings?.regularBonusActive !== false
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-red-500/20 border-red-500/40 text-red-300 line-through'
                            }`}
                            title="Toggle active or disable this reload bonus"
                          >
                            {sysSettings?.regularBonusActive !== false ? '● ACTIVE' : '✕ OFF / HIDDEN'}
                          </button>
                        </div>

                        {/* Match % */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                            Reload Match Percentage
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={sysSettings?.regularBonusPercent ?? ''}
                              onChange={(e) => setSysSettings(prev => ({ ...prev, regularBonusPercent: e.target.value }))}
                              className="w-full bg-[#0E0A24] border border-purple-500/20 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-white font-black text-sm pr-9 outline-none transition"
                              required
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-black text-purple-400">%</span>
                          </div>
                        </div>

                        {/* Banner Title */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                            Banner Display Title
                          </label>
                          <input
                            type="text"
                            value={sysSettings?.regularBonusTitle || 'REGULAR BONUS'}
                            onChange={(e) => setSysSettings(prev => ({ ...prev, regularBonusTitle: e.target.value }))}
                            className="w-full bg-[#0E0A24] border border-purple-500/20 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-white font-bold text-xs outline-none transition"
                            required
                          />
                        </div>

                        {/* Banner Subtitle / Description */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                            Banner Subtitle / Description
                          </label>
                          <textarea
                            rows={3}
                            value={sysSettings?.regularBonusSubtitle || 'Get a 50% reload bonus on every deposit you make! Boost your wallet balance anytime.'}
                            onChange={(e) => setSysSettings(prev => ({ ...prev, regularBonusSubtitle: e.target.value }))}
                            className="w-full bg-[#0E0A24] border border-purple-500/20 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-white text-xs leading-relaxed outline-none transition resize-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Simulation Tag */}
                      <div className="pt-3 border-t border-purple-500/15">
                        <div className="rounded-xl p-3 bg-[#0E0A24] border border-purple-500/20 text-[11px] text-purple-300 space-y-1">
                          <span className="font-bold text-white block">💡 Live Simulation:</span>
                          <p className="text-[10.5px] text-slate-300 leading-relaxed m-0 font-mono">
                            Player reloads $100 ➔ Receives 100 SC + <strong className="text-purple-400">{(Number(sysSettings?.regularBonusPercent ?? 50))} SC Reload</strong> = {100 + Number(sysSettings?.regularBonusPercent ?? 50)} SC Total
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Referral Bonus Card */}
                    <div className="bg-[#070514] border border-amber-500/35 p-5 sm:p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-lg">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                            3. Referral Bonus (Friend 1st Deposit)
                          </span>
                          <button
                            type="button"
                            onClick={() => setSysSettings(prev => ({ ...prev, referralBonusActive: prev.referralBonusActive === false ? true : false }))}
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase whitespace-nowrap border cursor-pointer transition ${
                              sysSettings?.referralBonusActive !== false
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-red-500/20 border-red-500/40 text-red-300 line-through'
                            }`}
                            title="Toggle active or disable referral commission"
                          >
                            {sysSettings?.referralBonusActive !== false ? '● ACTIVE' : '✕ OFF / HIDDEN'}
                          </button>
                        </div>

                        {/* Match % */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                            Referral Commission Match %
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={sysSettings?.referralBonusPercent ?? ''}
                              onChange={(e) => setSysSettings(prev => ({ ...prev, referralBonusPercent: e.target.value }))}
                              className="w-full bg-[#0E0A24] border border-amber-500/20 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white font-black text-sm pr-9 outline-none transition"
                              required
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-black text-amber-400">%</span>
                          </div>
                          <p className="text-[10.5px] text-gray-400 mt-1.5 leading-relaxed">
                            Credited straight to the inviter&apos;s wallet balance when their invited friend makes their first deposit.
                          </p>
                        </div>

                        {/* Notification & Ledger Audit features */}
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 space-y-1.5">
                          <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                            <Bell size={13} className="text-amber-400" />
                            <span>Instant Notification &amp; Ledger Audit</span>
                          </div>
                          <p className="text-[10.5px] text-amber-200/80 leading-relaxed m-0">
                            The inviter receives an immediate in-app celebration notification, and the transaction is recorded into the double-entry ledger.
                          </p>
                        </div>
                      </div>

                      {/* Simulation Tag */}
                      <div className="pt-3 border-t border-amber-500/15">
                        <div className="rounded-xl p-3 bg-[#0E0A24] border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                          <span className="font-bold text-white block">💡 Live Simulation:</span>
                          <p className="text-[10.5px] text-slate-300 leading-relaxed m-0 font-mono">
                            Friend deposits $100 ➔ Inviter gets <strong className="text-amber-400">{Number(sysSettings?.referralBonusPercent ?? 20)} SC ($ {Number(sysSettings?.referralBonusPercent ?? 20)})</strong> instant wallet bonus
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4. Lobby Freeplay Bonus Card */}
                    <div className="bg-[#070514] border border-emerald-500/35 p-5 sm:p-6 rounded-2xl space-y-4 flex flex-col justify-between shadow-lg">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                            4. Lobby Freeplay ($ SC)
                          </span>
                          <button
                            type="button"
                            onClick={() => setSysSettings(prev => ({ ...prev, freeplayActive: prev.freeplayActive === false ? true : false }))}
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase whitespace-nowrap border cursor-pointer transition ${
                              sysSettings?.freeplayActive !== false
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-red-500/20 border-red-500/40 text-red-300 line-through'
                            }`}
                            title="Toggle active or disable freeplay button"
                          >
                            {sysSettings?.freeplayActive !== false ? '● ACTIVE' : '✕ OFF / HIDDEN'}
                          </button>
                        </div>

                        {/* Freeplay Amount */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                            Freeplay Amount ($ SC)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              value={sysSettings?.freeplayAmountSC ?? ''}
                              onChange={(e) => setSysSettings(prev => ({ ...prev, freeplayAmountSC: e.target.value }))}
                              className="w-full bg-[#0E0A24] border border-emerald-500/20 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white font-black text-sm pr-9 outline-none transition"
                              required
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-black text-emerald-400">SC</span>
                          </div>
                          <p className="text-[10.5px] text-gray-400 mt-1.5 leading-relaxed">
                            Amount awarded when player clicks &quot;GET FREEPLAY&quot; in hero lobby. Each player can claim once.
                          </p>
                        </div>

                        {/* Audit Details */}
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-200/90 space-y-1.5">
                          <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                            <Gift size={13} className="text-emerald-400" />
                            <span>Manual Lobby Claim</span>
                          </div>
                          <p className="text-[10.5px] text-emerald-200/80 leading-relaxed m-0">
                            Automatic signup bonus is 0 SC. Players claim this configured Freeplay manually.
                          </p>
                        </div>
                      </div>

                      {/* Simulation Tag */}
                      <div className="pt-3 border-t border-emerald-500/15">
                        <div className="rounded-xl p-3 bg-[#0E0A24] border border-emerald-500/20 text-[11px] text-emerald-300 space-y-1">
                          <span className="font-bold text-white block">💡 Live Simulation:</span>
                          <p className="text-[10.5px] text-slate-300 leading-relaxed m-0 font-mono">
                            Player clicks &apos;GET FREEPLAY&apos; ➔ Receives <strong className="text-emerald-400">${Number(sysSettings?.freeplayAmountSC ?? 5.0).toFixed(2)} SC</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Official Cashout & Redemption Rules Editor */}
                  <div className="bg-[#070514] border border-cyan-500/35 p-5 sm:p-6 rounded-2xl space-y-4 shadow-lg w-full">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-cyan-400" />
                        <h4 className="text-sm font-black text-white uppercase tracking-wider m-0">
                          Official Cashout &amp; Redemption Rules (Displayed on /rules &amp; Menu)
                        </h4>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        LIVE SYNC
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase tracking-wider">
                        Cashout Rules Content (Supports multi-line text)
                      </label>
                      <textarea
                        rows={5}
                        value={sysSettings?.cashoutRules ?? ''}
                        onChange={(e) => setSysSettings(prev => ({ ...prev, cashoutRules: e.target.value }))}
                        placeholder="Write your cashout and redemption rules here. Players can view them by clicking 'Cashout Rules' in the 3-lines menu."
                        className="w-full bg-[#0E0A24] border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white text-xs leading-relaxed outline-none transition"
                      />
                      <p className="text-[10.5px] text-gray-400 mt-1 leading-relaxed">
                        These rules appear directly on the website when players click &quot;Cashout Rules&quot; above Refer &amp; Earn in the sidebar.
                      </p>
                    </div>
                  </div>

                  {/* Save Action Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400 m-0">
                      Changes take effect instantly across all deposit calculators, player banners, and affiliate referrals.
                    </p>
                    <button
                      type="submit"
                      disabled={savingBonusSettings}
                      className="py-3 px-8 rounded-xl cyber-btn-cyan text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition"
                    >
                      {savingBonusSettings ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          <span>SAVE BONUS CONFIGURATION</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Site Promotions & Campaigns Manager */}
              <div className="bg-[#0E0A24] border border-cyan-500/25 p-6 sm:p-7 rounded-2xl shadow-2xl space-y-6 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white m-0 tracking-wide flex items-center gap-2">
                        <span>Live Site Promotions &amp; Campaigns</span>
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30">
                          {adminPromos.length} RUNNING
                        </span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                        Control all promotions running on /promotions and website banners. Delete or pause any promo in 1-click.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPromoModalOpen(true)}
                      className="cyber-btn-cyan py-2.5 px-4 text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>CREATE NEW PROMOTION</span>
                    </button>
                  </div>
                </div>

                {loadingAdminPromos ? (
                  <div className="text-center py-8 text-gray-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-cyan-400" />
                    <span>Loading active site promotions...</span>
                  </div>
                ) : adminPromos.length === 0 ? (
                  <div className="text-center py-10 bg-[#070514] rounded-xl border border-white/5 space-y-2">
                    <Tag size={28} className="mx-auto text-gray-600" />
                    <p className="text-sm font-bold text-gray-300">No active promotions in database.</p>
                    <p className="text-xs text-gray-500">Click &quot;CREATE NEW PROMOTION&quot; above to launch a promotion on the site.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {adminPromos.map((p) => {
                      const promoId = p._id || p.id;
                      return (
                        <div
                          key={promoId}
                          className="bg-[#070514] border border-cyan-500/25 hover:border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg transition"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono uppercase tracking-wider">
                                {p.badge || 'PROMO'}
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  p.active !== false
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                    : 'bg-red-500/15 border-red-500/40 text-red-400 line-through'
                                }`}
                              >
                                {p.active !== false ? '● LIVE' : 'PAUSED'}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-black text-white m-0 tracking-wide">
                                {p.title}
                              </h4>
                              {p.matchPercent > 0 && (
                                <span className="text-xs font-mono font-bold text-amber-400 block mt-0.5">
                                  +{p.matchPercent}% Extra Bonus
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 m-0">
                              {p.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePromoActive(p)}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                p.active !== false
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                              }`}
                            >
                              {p.active !== false ? 'Pause' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePromotion(promoId, p.title)}
                              className="py-1.5 px-3 rounded-lg text-xs font-black bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 flex items-center gap-1.5 cursor-pointer transition shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                              title="Delete promotion permanently from website"
                            >
                              <Trash2 size={13} />
                              <span>DELETE</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Create Promotion Modal */}
              {promoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <div className="bg-[#0E0A24] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
                    <button
                      type="button"
                      onClick={() => setPromoModalOpen(false)}
                      className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 cursor-pointer"
                    >
                      <X size={18} />
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white m-0">Launch New Promotion</h3>
                        <p className="text-xs text-gray-400 mt-0.5">This promo will appear immediately on the website.</p>
                      </div>
                    </div>

                    <form onSubmit={handleCreatePromo} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-300 block mb-1">PROMOTION TITLE</label>
                        <input
                          type="text"
                          placeholder="e.g. Weekend 200% Cyber Surge"
                          value={newPromoForm.title}
                          onChange={(e) => setNewPromoForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full bg-[#070514] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-cyan-400"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-gray-300 block mb-1">BADGE / TAG</label>
                          <input
                            type="text"
                            placeholder="e.g. 200% MATCH"
                            value={newPromoForm.badge}
                            onChange={(e) => setNewPromoForm(prev => ({ ...prev, badge: e.target.value }))}
                            className="w-full bg-[#070514] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-300 block mb-1">MATCH PERCENT (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={newPromoForm.matchPercent}
                            onChange={(e) => setNewPromoForm(prev => ({ ...prev, matchPercent: e.target.value }))}
                            className="w-full bg-[#070514] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-300 block mb-1">DESCRIPTION</label>
                        <textarea
                          rows={3}
                          placeholder="Deposit $25 or more this weekend to get an instant 200% bonus..."
                          value={newPromoForm.description}
                          onChange={(e) => setNewPromoForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full bg-[#070514] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-cyan-400 resize-none"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setPromoModalOpen(false)}
                          className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="cyber-btn-cyan px-5 py-2.5 text-xs font-black shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
                        >
                          Launch Promotion
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* TAB 14: PLAYER ACCOUNTS (Users Management) */}
          {activeTab === 'users' && (() => {
            const totalPlayers = usersList.length;
            const totalFloatSC = usersList.reduce((sum, u) => sum + Number(u.balanceSC || 0), 0);
            const totalDeposits = usersList.reduce((sum, u) => sum + Number(u.totalDeposits || 0), 0);
            const totalWithdrawals = usersList.reduce((sum, u) => sum + Number(u.totalWithdrawals || 0), 0);

            const filteredUsers = usersList.filter(u => {
              if (playerFilter === 'active') return !u.isBanned;
              if (playerFilter === 'banned') return u.isBanned;
              if (playerFilter === 'with_balance') return Number(u.balanceSC || 0) > 0;
              if (playerFilter === 'bound') return Boolean(u.deviceId);
              return true;
            });

            return (
              <div className="space-y-6" style={{ fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />
                      Player Accounts Directory
                    </h2>
                    <p className="text-xs text-[#9A91A8] mt-1" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      Manage player profiles, balances, deposits, cashouts, referrals &amp; account control
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-[#140E33] border border-white/10 rounded-xl focus-within:border-cyan-400 w-full sm:w-64 transition">
                      <Search size={14} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search username, email, code..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            fetch(`/api/users?search=${encodeURIComponent(userSearchQuery)}`, { credentials: 'include', cache: 'no-store' })
                              .then(r => r.json())
                              .then(d => { if (d.success) setUsersList(d.users || []); });
                          }
                        }}
                        className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none p-0 border-none"
                        style={{ fontFamily: 'Lexend, sans-serif' }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        fetch(`/api/users?search=${encodeURIComponent(userSearchQuery)}`, { credentials: 'include', cache: 'no-store' })
                          .then(r => r.json())
                          .then(d => { if (d.success) setUsersList(d.users || []); });
                      }}
                      className="btn-sovereign-coral text-xs py-2 px-3.5 font-bold shrink-0"
                      style={{ fontFamily: 'Lexend, sans-serif' }}
                    >
                      <span>Search</span>
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full">
                    {[
                      { id: 'all', label: 'All Players', count: totalPlayers },
                      { id: 'active', label: 'Active', count: usersList.filter(u => !u.isBanned).length },
                      { id: 'with_balance', label: 'Balance > $0', count: usersList.filter(u => Number(u.balanceSC || 0) > 0).length },
                      { id: 'bound', label: 'Device Bound', count: usersList.filter(u => Boolean(u.deviceId)).length },
                      { id: 'banned', label: 'Banned', count: usersList.filter(u => u.isBanned).length },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setPlayerFilter(f.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${playerFilter === f.id
                          ? 'bg-[#00F0FF] text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-black'
                          : 'bg-[#140E33] text-gray-400 hover:text-white border border-white/10'
                          }`}
                        style={{ fontFamily: 'Lexend, sans-serif' }}
                      >
                        <span>{f.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${playerFilter === f.id ? 'bg-black/20 text-black font-black' : 'bg-white/10 text-gray-300'
                          }`}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-[#9A91A8]" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    💡 Click <strong className="text-[#00F0FF]">&quot;360° Profile&quot;</strong> on any user to adjust balance, view deposits, cashouts &amp; referrals
                  </span>
                </div>

                {/* Users Table */}
                <div className="bg-[#0E0A24] border border-[#00F0FF]/25 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Mobile Cards View (Visible on small screens) */}
                  <div className="block sm:hidden divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 font-medium text-xs">
                        No player accounts matching selection.
                      </div>
                    ) : (
                      filteredUsers.map(u => (
                        <div
                          key={u.id}
                          className="p-3.5 space-y-3 bg-[#140E33]/70"
                        >
                          {/* Top row: Avatar + Name + Referral + Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F0FF]/15 via-purple-500/10 to-[#E026D8]/20 border border-white/10 flex items-center justify-center font-black text-xs text-white shrink-0">
                                {u.username?.substring(0, 2).toUpperCase() || 'P'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span className="truncate">{u.username}</span>
                                  {u.referralCode && (
                                    <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
                                      {u.referralCode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 truncate">{u.email}</div>
                              </div>
                            </div>

                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${u.isBanned
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}>
                              {u.isBanned ? 'BANNED' : 'ACTIVE'}
                            </span>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#070514] border border-white/10 text-xs">
                            <div>
                              <span className="text-[10px] text-gray-400 block font-medium">Cash Balance</span>
                              <span className="font-extrabold text-emerald-400 text-sm">
                                ${Number(u.balanceSC || 0).toFixed(2)}{' '}
                                <span className="text-[10px] font-bold text-emerald-500">SC</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block font-medium">Device</span>
                              {u.deviceId ? (
                                <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                                  <Smartphone size={10} /> Bound
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400">Unbound</span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block font-medium">Deposited</span>
                              <span className="font-bold text-white text-xs">
                                ${Number(u.totalDeposits || 0).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block font-medium">Cashed Out</span>
                              <span className="font-bold text-cyan-300 text-xs">
                                ${Number(u.totalWithdrawals || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedPlayerId(u.id)}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Eye size={12} />
                              <span>Player Profile</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setResetPassModal({ open: true, user: u, newPass: '' })}
                              className="py-1.5 px-2.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1"
                            >
                              <Key size={12} />
                              <span>Reset</span>
                            </button>

                            {u.deviceId && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm(`Reset bound hardware device for "${u.username}"?`)) return;
                                  const res = await fetch('/api/users', {
                                    method: 'PUT',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: u.id, action: 'resetDevice' }),
                                  });
                                  const d = await res.json();
                                  if (d.success) {
                                    alert(d.message);
                                    setUsersList(usersList.map(x => x.id === u.id ? { ...x, deviceId: null } : x));
                                  }
                                }}
                                className="py-1.5 px-2.5 rounded-xl bg-sky-500/10 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1"
                              >
                                <Smartphone size={12} />
                                <span>Unbind</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={async () => {
                                const actionText = u.isBanned ? 'unban and reactivate' : 'ban and suspend';
                                if (!window.confirm(`Are you sure you want to ${actionText} "${u.username}"?`)) return;
                                const reason = prompt('Reason for action:', u.isBanned ? 'Account cleared' : 'Terms violation');
                                const res = await fetch('/api/users', {
                                  method: 'PUT',
                                  credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: u.id, action: 'toggleBan', reason }),
                                });
                                const d = await res.json();
                                if (d.success) {
                                  alert(d.message);
                                  setUsersList(usersList.map(x => x.id === u.id ? { ...x, isBanned: d.isBanned } : x));
                                }
                              }}
                              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border flex items-center gap-1 ${u.isBanned
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-red-500/15 text-red-300 border-red-500/30'
                                }`}
                            >
                              <ShieldCheck size={12} />
                              <span>{u.isBanned ? 'Unban' : 'Ban'}</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View (Hidden on mobile) */}
                  <div className="hidden sm:block overflow-x-auto w-full">
                    <table className="w-full min-w-[760px] text-left text-xs" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      <thead className="bg-[#070514] text-[#9A91A8] uppercase border-b border-white/10 font-bold" style={{ fontFamily: 'Lexend, sans-serif' }}>
                        <tr>
                          <th className="p-3.5">Player / Identity</th>
                          <th className="p-3.5">Cash Balance</th>
                          <th className="p-3.5">Deposited</th>
                          <th className="p-3.5">Cashed Out</th>
                          <th className="p-3.5">Referrals</th>
                          <th className="p-3.5">Device Binding</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="p-10 text-center text-gray-500 font-medium">
                              No player accounts matching selection.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(u => (
                            <tr
                              key={u.id}
                              className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                              onClick={() => setSelectedPlayerId(u.id)}
                            >
                              {/* Player Identity */}
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F0FF]/15 via-purple-500/10 to-[#E026D8]/20 border border-white/10 flex items-center justify-center font-black text-xs text-white shrink-0 group-hover:border-[#00F0FF]/50 transition">
                                    {u.username?.substring(0, 2).toUpperCase() || 'P'}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white text-sm flex items-center gap-1.5" style={{ fontFamily: 'Lexend, sans-serif' }}>
                                      <span>{u.username}</span>
                                      {u.referralCode && (
                                        <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                          {u.referralCode}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-gray-400">{u.email}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                      Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Cash Balance */}
                              <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                                <div className="font-extrabold text-emerald-400 text-sm tracking-tight" style={{ fontFamily: 'Lexend, sans-serif' }}>
                                  ${Number(u.balanceSC || 0).toFixed(2)}{' '}
                                  <span className="text-[10px] font-bold text-emerald-500">SC</span>
                                </div>
                              </td>

                              {/* Deposited */}
                              <td className="p-3.5 font-bold text-white text-xs" style={{ fontFamily: 'Lexend, sans-serif' }}>
                                ${Number(u.totalDeposits || 0).toFixed(2)}
                              </td>

                              {/* Cashed Out */}
                              <td className="p-3.5 font-bold text-cyan-300 text-xs" style={{ fontFamily: 'Lexend, sans-serif' }}>
                                ${Number(u.totalWithdrawals || 0).toFixed(2)}
                              </td>

                              {/* Referrals */}
                              <td className="p-3.5 text-xs" style={{ fontFamily: 'Lexend, sans-serif' }}>
                                <span className="font-bold text-amber-400 flex items-center gap-1">
                                  <Users size={12} /> {u.referralsCount || 0}
                                </span>
                              </td>

                              {/* Device Binding */}
                              <td className="p-3.5" style={{ fontFamily: 'Lexend, sans-serif' }}>
                                {u.deviceId ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-max">
                                    <Smartphone size={10} /> Bound
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 w-max inline-block">
                                    Unbound
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="p-3.5" style={{ fontFamily: 'Lexend, sans-serif' }}>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${u.isBanned
                                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  }`}>
                                  {u.isBanned ? 'BANNED' : 'ACTIVE'}
                                </span>
                              </td>

                              {/* Action Buttons with Clear Labels */}
                              <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()} style={{ fontFamily: 'Lexend, sans-serif' }}>
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* 1. Full 360 Profile & Balances */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPlayerId(u.id)}
                                    className="text-xs bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 hover:bg-[#00F0FF]/25 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
                                    title="View Complete Player Profile, History & Balance Adjuster"
                                  >
                                    <Eye size={12} />
                                    <span>Player Profile</span>
                                  </button>

                                  {/* 2. Reset Password */}
                                  <button
                                    type="button"
                                    onClick={() => setResetPassModal({ open: true, user: u, newPass: '' })}
                                    className="text-[11px] px-2.5 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 font-bold flex items-center gap-1 transition"
                                    title="Reset Player Password"
                                  >
                                    <Key size={12} />
                                    <span>Reset Pass</span>
                                  </button>

                                  {/* 3. Unbind Device (only shown if device is bound) */}
                                  {u.deviceId && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!window.confirm(`Reset bound hardware device for "${u.username}"?`)) return;
                                        const res = await fetch('/api/users', {
                                          method: 'PUT',
                                          credentials: 'include',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ userId: u.id, action: 'resetDevice' }),
                                        });
                                        const d = await res.json();
                                        if (d.success) {
                                          alert(d.message);
                                          setUsersList(usersList.map(x => x.id === u.id ? { ...x, deviceId: null } : x));
                                        }
                                      }}
                                      className="text-[11px] px-2.5 py-1.5 rounded-xl bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 font-bold flex items-center gap-1 transition"
                                      title="Clear Device Hardware Binding"
                                    >
                                      <Smartphone size={12} />
                                      <span>Unbind</span>
                                    </button>
                                  )}

                                  {/* 4. Ban / Unban with clear label */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const actionText = u.isBanned ? 'unban and reactivate' : 'ban and suspend';
                                      if (!window.confirm(`Are you sure you want to ${actionText} "${u.username}"?`)) return;
                                      const reason = prompt('Reason for action:', u.isBanned ? 'Account cleared' : 'Terms violation');
                                      const res = await fetch('/api/users', {
                                        method: 'PUT',
                                        credentials: 'include',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: u.id, action: 'toggleBan', reason }),
                                      });
                                      const d = await res.json();
                                      if (d.success) {
                                        alert(d.message);
                                        setUsersList(usersList.map(x => x.id === u.id ? { ...x, isBanned: d.isBanned } : x));
                                      }
                                    }}
                                    className={`text-[11px] px-2.5 py-1.5 rounded-xl font-bold border transition flex items-center gap-1 ${u.isBanned
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                      : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
                                      }`}
                                    title={u.isBanned ? 'Unban Player' : 'Ban Player'}
                                  >
                                    <ShieldCheck size={12} />
                                    <span>{u.isBanned ? 'Unban' : 'Ban'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 15: PAYMENT GATEWAYS (Dedicated Gateway Tab) */}
          {activeTab === 'gateways' && (
            <div className="space-y-6" style={{ fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, sans-serif' }}>
              {/* Header with Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E0A24]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />
                    Payment Gateways &amp; Cashtags
                  </h2>
                  <p className="text-xs text-[#9A91A8] mt-1">
                    Configure Cash App, Zelle, Venmo, Crypto, Direct Payment Links &amp; QR Codes for player deposits
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddGatewayModalOpen(true)}
                  className="btn-sovereign-coral px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00F0FF]/15 whitespace-nowrap self-start sm:self-auto cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add Payment Method</span>
                </button>
              </div>

              {/* Add Gateway Modal */}
              {isAddGatewayModalOpen && (
                <div
                  className="vegas-modal-overlay"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(5, 3, 15, 0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    overflowY: 'auto',
                  }}
                  onClick={() => setIsAddGatewayModalOpen(false)}
                >
                  <div
                    className="vegas-modal-card relative w-full max-w-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backgroundColor: '#0E0A24',
                      background: 'linear-gradient(145deg, #0E0A24 0%, #150E36 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.45)',
                      boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.25)',
                      borderRadius: '20px',
                    }}
                  >
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                          Add New Payment Method
                        </h3>
                        <p className="text-xs text-[#9A91A8] mt-0.5">
                          Supports Direct Pay Links &amp; Scannable QR Codes for player checkout
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddGatewayModalOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition border border-white/10"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newMethod.name.trim() || !newMethod.accountDetails.trim()) {
                          return alert('Please fill in Method Name and Cashtag / Address');
                        }

                        // 1. Optimistic UI update (0ms)
                        const tempId = 'gateway-' + Date.now();
                        const optimisticGateway = { ...newMethod, id: tempId, isActive: true };
                        setPaymentMethods(prev => [...prev, optimisticGateway]);

                        // 2. Dismiss modal immediately in 0ms!
                        setIsAddGatewayModalOpen(false);
                        const methodToSubmit = { ...newMethod };
                        setNewMethod({
                          name: '',
                          type: 'cashapp',
                          tag: 'Instant',
                          accountDetails: '',
                          paymentUrl: '',
                          qrCode: '',
                          instructions: '',
                          minDeposit: 10,
                          maxDeposit: 2500,
                        });

                        // 3. Fire API in background
                        try {
                          const res = await fetch('/api/payments/methods', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(methodToSubmit),
                          });
                          const d = await res.json();
                          if (d.success && d.method) {
                            setPaymentMethods(prev => prev.map(x => x.id === tempId ? (d.method || { ...methodToSubmit, id: d.id, isActive: true }) : x));
                          } else if (!d.success) {
                            alert(d.error || 'Failed to create payment method');
                            setPaymentMethods(prev => prev.filter(x => x.id !== tempId));
                          }
                        } catch (err) {
                          console.error('Failed to create payment method', err);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Gateway Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Cash App VIP / Zelle Official"
                            value={newMethod.name}
                            onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                            className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF] transition"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Identifier ($Cashtag or Address) *</label>
                          <input
                            type="text"
                            placeholder="e.g. $ParadisePay or pay@playersparadisehub.com"
                            value={newMethod.accountDetails}
                            onChange={(e) => setNewMethod({ ...newMethod, accountDetails: e.target.value })}
                            className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-[#00F0FF] transition"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">
                            Direct Payment Link (Optional)
                          </label>
                          <input
                            type="url"
                            placeholder="e.g. https://cash.app/$ParadisePay"
                            value={newMethod.paymentUrl}
                            onChange={(e) => setNewMethod({ ...newMethod, paymentUrl: e.target.value })}
                            className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF] transition"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Tag Badge</label>
                          <input
                            type="text"
                            placeholder="e.g. Instant / Zero Fee / Popular"
                            value={newMethod.tag}
                            onChange={(e) => setNewMethod({ ...newMethod, tag: e.target.value })}
                            className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF] transition"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Min ($)</label>
                            <input
                              type="number"
                              min="1"
                              value={newMethod.minDeposit}
                              onChange={(e) => setNewMethod({ ...newMethod, minDeposit: Number(e.target.value) })}
                              className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF] transition"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Max ($)</label>
                            <input
                              type="number"
                              min="10"
                              value={newMethod.maxDeposit}
                              onChange={(e) => setNewMethod({ ...newMethod, maxDeposit: Number(e.target.value) })}
                              className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF] transition"
                            />
                          </div>
                        </div>
                      </div>

                      {/* QR Code Upload & Instructions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">
                            Scannable QR Code
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ cursor: 'pointer', padding: '9px 14px', borderRadius: '12px', backgroundColor: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.35)', color: '#00F0FF', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <Upload size={14} />
                              <span>Choose QR</span>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 5 * 1024 * 1024) return alert('QR Code image must be under 5MB');
                                  const reader = new FileReader();
                                  reader.onload = () => setNewMethod(prev => ({ ...prev, qrCode: reader.result }));
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>

                            <input
                              type="url"
                              placeholder={newMethod.qrCode?.startsWith('data:') ? 'Image attached (Click X to clear)' : 'Or paste QR Code URL'}
                              value={newMethod.qrCode?.startsWith('data:') ? '' : (newMethod.qrCode || '')}
                              disabled={newMethod.qrCode?.startsWith('data:')}
                              onChange={(e) => setNewMethod({ ...newMethod, qrCode: e.target.value })}
                              style={{
                                flex: 1,
                                backgroundColor: '#070514',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '12px',
                                padding: '9px 12px',
                                fontSize: '12px',
                                color: '#FFFFFF',
                                fontFamily: 'Lexend, sans-serif',
                                outline: 'none',
                                opacity: newMethod.qrCode?.startsWith('data:') ? 0.6 : 1,
                              }}
                            />

                            {newMethod.qrCode && (
                              <button
                                type="button"
                                onClick={() => setNewMethod(prev => ({ ...prev, qrCode: '' }))}
                                style={{
                                  padding: '9px 12px',
                                  borderRadius: '12px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: '#FCA5A5',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                                title="Remove QR Code"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {newMethod.qrCode && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '12px', backgroundColor: '#070514', border: '1px solid rgba(0, 240, 255, 0.25)', width: 'max-content' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={newMethod.qrCode} alt="QR Preview" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'contain', backgroundColor: '#FFFFFF', padding: '2px' }} />
                              <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 800 }}>✓ QR Code Attached</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Instructions for Player</label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Send payment with your username as note. Upload screenshot."
                            value={newMethod.instructions}
                            onChange={(e) => setNewMethod({ ...newMethod, instructions: e.target.value })}
                            className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF] transition resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setIsAddGatewayModalOpen(false)}
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-sovereign-coral text-xs py-2.5 px-6 font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Save &amp; Activate Method</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Active Methods List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Configured Payment Gateways ({paymentMethods.length})
                  </h3>
                  <span className="text-xs text-gray-400">
                    Player deposit views update automatically
                  </span>
                </div>

                {paymentMethods.length === 0 ? (
                  <div className="bg-[#140E33] border border-white/10 p-8 rounded-2xl text-center text-gray-400">
                    No payment gateways configured. Add a payment method above to accept player deposits.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {paymentMethods.map(m => (
                      <div
                        key={m.id}
                        className={`p-5 rounded-2xl border transition shadow-xl flex flex-col justify-between gap-4 ${m.isActive
                          ? 'bg-[#120D2C] border-white/15 hover:border-[#00F0FF]/40'
                          : 'bg-[#0E0A1E]/80 border-white/5 opacity-70'
                          }`}
                      >
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center font-black text-xs text-[#00F0FF]">
                                {m.name?.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-black text-white text-base leading-tight">{m.name}</h4>
                                <span className="text-[10px] text-[#00F0FF] uppercase font-bold tracking-wider">{m.tag || 'Instant'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${m.isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                }`}>
                                {m.isActive ? 'ACTIVE' : 'DISABLED'}
                              </span>
                              {m.tag && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {m.tag}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Identifier & Direct Link */}
                          <div className="bg-[#070514] border border-white/10 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Official Identifier:</span>
                              <span className="font-mono font-black text-[#00F0FF] text-xs selection:bg-cyan-500 selection:text-black">
                                {m.accountDetails || m.cashtag || 'Not specified'}
                              </span>
                            </div>

                            {m.paymentUrl && (
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[11px]">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Direct Pay Link:</span>
                                <a
                                  href={m.paymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 truncate max-w-[200px]"
                                  title={m.paymentUrl}
                                >
                                  <span>Open Link</span>
                                  <ExternalLink size={11} />
                                </a>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px] text-gray-400">
                              <span>Deposit Range:</span>
                              <span className="text-white font-bold">${m.minDeposit || 10} — ${m.maxDeposit || 5000}</span>
                            </div>
                          </div>

                          {/* Instructions & QR Code Preview */}
                          <div className="flex items-start gap-3">
                            {m.qrCode ? (
                              <button
                                type="button"
                                onClick={() => setPreviewQrModal(m)}
                                className="shrink-0 p-1 bg-white rounded-lg border border-white/20 hover:scale-105 transition cursor-pointer"
                                title="Click to zoom QR Code"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.qrCode} alt="QR Code" className="w-14 h-14 object-contain" />
                              </button>
                            ) : (
                              <div className="shrink-0 w-14 h-14 rounded-lg bg-white/5 border border-dashed border-white/15 flex flex-col items-center justify-center text-gray-500 text-[9px] text-center p-1">
                                <QrCode size={16} className="mb-0.5 text-gray-400" />
                                <span>No QR</span>
                              </div>
                            )}

                            <p className="text-xs text-gray-300 italic m-0 line-clamp-3 leading-relaxed">
                              "{m.instructions || 'Send payment and upload proof confirmation.'}"
                            </p>
                          </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 flex-wrap">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditGatewayModal({ open: true, data: { ...m } })}
                            className="px-3 py-1.5 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] hover:bg-[#00F0FF]/25 border border-[#00F0FF]/30 font-bold text-xs flex items-center gap-1.5 transition"
                          >
                            <Edit2 size={12} />
                            <span>Edit Method</span>
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const updatedActive = !m.isActive;
                              // 1. Optimistic state toggle (0ms)
                              setPaymentMethods(prev => prev.map(x => x.id === m.id ? { ...x, isActive: updatedActive } : x));
                              // 2. Fire PUT in background
                              fetch('/api/payments/methods', {
                                method: 'PUT',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: m.id, isActive: updatedActive }),
                              }).catch(err => console.error('Failed to update gateway', err));
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition border cursor-pointer ${m.isActive
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              }`}
                          >
                            <Power size={12} />
                            <span>{m.isActive ? 'Disable' : 'Enable'}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm(`Are you sure you want to delete "${m.name}" payment method?`)) return;
                              // 1. Optimistic removal (0ms)
                              setPaymentMethods(prev => prev.filter(x => x.id !== m.id));
                              // 2. Fire DELETE in background
                              fetch(`/api/payments/methods?id=${encodeURIComponent(m.id)}`, {
                                method: 'DELETE',
                                credentials: 'include',
                              }).catch(err => console.error('Failed to delete gateway', err));
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Remove Gateway"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cashout / Payout Methods Management (Admin Controlled) */}
              <div className="bg-[#0E0A24] border border-[#00F0FF]/25 p-5 sm:p-6 rounded-2xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white m-0">
                        Player Cashout &amp; Payout Methods
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enable or disable payout methods offered to players for redemptions. Players only see the active methods you choose.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Add New Cashout Method Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newCashoutMethod.name.trim()) return;
                    try {
                      const res = await fetch('/api/payments/cashout-methods', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newCashoutMethod),
                      });
                      const d = await res.json();
                      if (d.success && d.method) {
                        setCashoutMethods((prev) => [...prev, d.method]);
                        setNewCashoutMethod({ name: '', placeholder: '', minCashout: 1 });
                      } else {
                        alert(d.error || 'Failed to add cashout method');
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="p-4 rounded-xl bg-[#070514] border border-white/10 space-y-3"
                >
                  <span className="text-xs font-bold text-white block uppercase tracking-wider">
                    Add Custom Cashout Method
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Method Name (e.g. Apple Pay / Chime / Bank)"
                      value={newCashoutMethod.name}
                      onChange={(e) => setNewCashoutMethod({ ...newCashoutMethod, name: e.target.value })}
                      className="w-full bg-[#0E0A24] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Handle Placeholder (e.g. phone number or email)"
                      value={newCashoutMethod.placeholder}
                      onChange={(e) => setNewCashoutMethod({ ...newCashoutMethod, placeholder: e.target.value })}
                      className="w-full bg-[#0E0A24] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF]"
                    />
                    <button
                      type="submit"
                      className="py-2.5 px-4 rounded-xl cyber-btn-cyan text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Cashout Method</span>
                    </button>
                  </div>
                </form>

                {/* List of Cashout Methods with 1-Click Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {cashoutMethods.map((cm) => (
                    <div
                      key={cm.id || cm.methodId}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition ${
                        cm.isActive
                          ? 'bg-[#070514] border-[#00F0FF]/35 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                          : 'bg-[#070514]/60 border-white/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm text-white">
                          {cm.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                            cm.isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}
                        >
                          {cm.isActive ? 'OFFERED TO PLAYERS' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 m-0 truncate">
                        {cm.placeholder || 'No placeholder'}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            const nextActive = !cm.isActive;
                            setCashoutMethods((prev) =>
                              prev.map((x) => (x.id === cm.id ? { ...x, isActive: nextActive } : x))
                            );
                            fetch('/api/payments/cashout-methods', {
                              method: 'PUT',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: cm.id, methodId: cm.methodId, isActive: nextActive }),
                            }).catch((err) => console.error(err));
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition border cursor-pointer ${
                            cm.isActive
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power size={12} />
                          <span>{cm.isActive ? 'Disable Method' : 'Enable Method'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete cashout method "${cm.name}"?`)) return;
                            setCashoutMethods((prev) => prev.filter((x) => x.id !== cm.id));
                            fetch(`/api/payments/cashout-methods?id=${encodeURIComponent(cm.id || cm.methodId)}`, {
                              method: 'DELETE',
                              credentials: 'include',
                            }).catch((err) => console.error(err));
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 16: TRANSACTIONS LOG (Normal Deposit & Withdrawal System) */}
          {activeTab === 'tx_search' && (
            <div className="space-y-4 sm:space-y-6" style={{ fontFamily: 'Lexend, -apple-system, sans-serif' }}>
              {/* Header & Quick Action Bar */}
              <div className="bg-[#0E0A24] border border-[#00F0FF]/25 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xl space-y-3.5 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 to-[#0E0A24] border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-lg shadow-[#00F0FF]/15 shrink-0">
                        <FileSpreadsheet size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg sm:text-xl font-black text-white tracking-wide m-0" style={{ fontFamily: 'Lexend, sans-serif' }}>
                            Transactions Log
                          </h2>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 whitespace-nowrap inline-flex items-center">
                            Real-Time History
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-[#9A91A8] mt-0.5" style={{ fontFamily: 'Lexend, sans-serif' }}>
                          Search and verify all player deposits, withdrawals, balance adjustments &amp; screenshot proofs
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Export & Refresh Actions */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        fetch(`/api/ledger?username=${encodeURIComponent(ledgerFilterUser)}&type=${ledgerFilterType}&t=${Date.now()}`, { credentials: 'include', cache: 'no-store' })
                          .then(r => r.json())
                          .then(d => { if (d.success) setLedgerRecords(d.records || []); });
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      title="Refresh Transactions"
                    >
                      <RefreshCw size={13} />
                      <span>Refresh</span>
                    </button>
                    <a
                      href={`/api/ledger?format=csv&username=${encodeURIComponent(ledgerFilterUser)}&type=${ledgerFilterType}`}
                      download
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 hover:brightness-110 transition active:scale-95 whitespace-nowrap"
                    >
                      <Download size={13} />
                      <span>Export CSV</span>
                    </a>
                  </div>
                </div>

                {/* Quick Category Tabs Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full pt-2 border-t border-white/10">
                  {[
                    { id: 'all', label: 'All Transactions', count: ledgerRecords.length },
                    {
                      id: 'deposit',
                      label: 'Deposits',
                      color: '#10B981',
                      count: ledgerRecords.filter(r => (r.type || '').includes('deposit') || (r.displayType || '').toLowerCase().includes('deposit')).length,
                    },
                    {
                      id: 'withdrawal',
                      label: 'Withdrawals',
                      color: '#F59E0B',
                      count: ledgerRecords.filter(r => (r.type || '').includes('withdraw') || (r.type || '').includes('redemption') || (r.displayType || '').toLowerCase().includes('withdraw')).length,
                    },
                    {
                      id: 'adjustment',
                      label: 'Balance Adjustments (+ / -)',
                      color: '#00F0FF',
                      count: ledgerRecords.filter(r => (r.type || '').includes('credit') || (r.type || '').includes('debit') || (r.type || '').includes('adjust')).length,
                    },
                    {
                      id: 'bonus',
                      label: 'Bonuses',
                      color: '#A855F7',
                      count: ledgerRecords.filter(r => (r.type || '').includes('bonus') || (r.type || '').includes('freeplay')).length,
                    },
                  ].map((tab) => {
                    const isSelected = ledgerFilterType === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setLedgerFilterType(tab.id)}
                        style={{
                          backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.16)' : '#070514',
                          borderColor: isSelected ? '#00F0FF' : 'rgba(255, 255, 255, 0.1)',
                          color: isSelected ? '#FFFFFF' : '#9A91A8',
                          fontFamily: 'Lexend, sans-serif',
                        }}
                        className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition hover:border-[#00F0FF]/50"
                      >
                        {tab.color && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tab.color }} />
                        )}
                        <span className="whitespace-nowrap">{tab.label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 font-mono text-gray-300">
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search & Extra Filter Input */}
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
                  {/* Player Username Search */}
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search player username, cashtag, or note..."
                      value={ledgerFilterUser}
                      onChange={(e) => setLedgerFilterUser(e.target.value)}
                      className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition"
                      style={{ fontFamily: 'Lexend, sans-serif' }}
                    />
                    {ledgerFilterUser && (
                      <button
                        type="button"
                        onClick={() => setLedgerFilterUser('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Filter Type Dropdown */}
                  <div className="w-full sm:w-64">
                    <select
                      value={ledgerFilterType}
                      onChange={(e) => setLedgerFilterType(e.target.value)}
                      className="w-full bg-[#070514] border border-white/15 focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
                      style={{ fontFamily: 'Lexend, sans-serif' }}
                    >
                      <option value="all">Filter: All Transactions</option>
                      <option value="deposit">Filter: Deposits Only</option>
                      <option value="withdrawal">Filter: Withdrawals Only</option>
                      <option value="adjustment">Filter: Balance Adjustments (+ / -)</option>
                      <option value="bonus">Filter: Bonuses &amp; Rewards</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Summary Metric Cards with Modern Lexend Typography */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* 1. Total Transactions */}
                <div
                  className="p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.92) 0%, rgba(14, 10, 36, 0.98) 100%)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 18px rgba(0, 240, 255, 0.08)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9A91A8] uppercase tracking-wider" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      Total Transactions
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
                      <FileSpreadsheet size={15} />
                    </div>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-white mt-2 block tracking-tight" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    {ledgerRecords.length}
                  </span>
                </div>

                {/* 2. Total Deposits */}
                <div
                  className="p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.92) 0%, rgba(14, 10, 36, 0.98) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 18px rgba(16, 185, 129, 0.08)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9A91A8] uppercase tracking-wider" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      Total Deposits
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center text-[#10B981]">
                      <ArrowDownLeft size={15} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-[#10B981] tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      ${ledgerRecords
                        .filter(r => (r.type || '').includes('deposit') || (r.displayType || '').toLowerCase().includes('deposit'))
                        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
                        .toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-[#10B981]" style={{ fontFamily: 'Lexend, sans-serif' }}>SC</span>
                  </div>
                </div>

                {/* 3. Total Withdrawals */}
                <div
                  className="p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.92) 0%, rgba(14, 10, 36, 0.98) 100%)',
                    border: '1px solid rgba(224, 38, 216, 0.35)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 18px rgba(224, 38, 216, 0.08)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9A91A8] uppercase tracking-wider" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      Total Withdrawals
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#E026D8]/15 border border-[#E026D8]/40 flex items-center justify-center text-[#E026D8]">
                      <ArrowUpRight size={15} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl sm:text-3xl font-black text-[#E026D8] tracking-tight drop-shadow-[0_0_12px_rgba(224,38,216,0.35)]" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      ${Math.abs(ledgerRecords
                        .filter(r => (r.type || '').includes('withdraw') || (r.type || '').includes('redemption') || (r.displayType || '').toLowerCase().includes('withdraw'))
                        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0))
                        .toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-[#E026D8]" style={{ fontFamily: 'Lexend, sans-serif' }}>SC</span>
                  </div>
                </div>

                {/* 4. Proof Receipts */}
                <div
                  className="p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 14, 51, 0.92) 0%, rgba(14, 10, 36, 0.98) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 18px rgba(245, 158, 11, 0.08)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9A91A8] uppercase tracking-wider" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      Proof Receipts
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B]">
                      <Eye size={15} />
                    </div>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-[#F59E0B] mt-2 block tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    {ledgerRecords.filter(r => Boolean(r.proofImage)).length}
                  </span>
                </div>
              </div>

              {/* Main Transactions Container */}
              <div className="bg-[#0E0A24] border border-[#00F0FF]/25 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-3 sm:p-4 bg-[#070514] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white uppercase tracking-wider" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      Transaction Entries
                    </span>
                    <span className="text-[11px] font-bold text-gray-400" style={{ fontFamily: 'Lexend, sans-serif' }}>
                      ({ledgerRecords.length} found)
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    Click on any transaction to view full receipt card
                  </span>
                </div>

                {/* Mobile Cards View (Visible on small screens) */}
                <div className="block sm:hidden divide-y divide-white/5">
                  {ledgerRecords.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      <FileSpreadsheet size={32} className="mx-auto text-gray-500 opacity-60 mb-2" />
                      <p className="font-bold text-white text-sm m-0">No transactions match your filter</p>
                      <p className="text-xs text-gray-400 mt-1 m-0">Select "All Transactions" or clear your player search</p>
                    </div>
                  ) : (
                    ledgerRecords.map((rec, i) => {
                      const isPositive = Number(rec.amount || 0) >= 0;
                      const rawT = (rec.rawType || rec.type || '').toLowerCase();
                      const isDeposit = rawT.includes('deposit');
                      const isWithdrawal = rawT.includes('withdraw') || rawT.includes('redemption');
                      const isCredit = rawT.includes('credit');
                      const isDebit = rawT.includes('debit');
                      const isBonus = rawT.includes('bonus') || rawT.includes('freeplay');
                      const hasProof = Boolean(rec.proofImage);

                      let label = 'Transaction';
                      if (isDeposit) label = 'Deposit';
                      else if (isWithdrawal) label = 'Withdrawal';
                      else if (isCredit) label = 'Balance Added';
                      else if (isDebit) label = 'Balance Deducted';
                      else if (isBonus) label = 'Bonus';
                      else label = rec.displayType || 'Adjustment';

                      const rawStatus = (rec.status || 'approved').toLowerCase();
                      const isPending = rawStatus === 'pending' || rawStatus.includes('pending');
                      const isRejected = rawStatus.includes('reject');

                      return (
                        <div
                          key={rec.id || i}
                          onClick={() => setSelectedTxDetail(rec)}
                          className="p-3.5 space-y-2.5 bg-[#070514]/60 active:bg-white/[0.04] transition cursor-pointer"
                          style={{ fontFamily: 'Lexend, sans-serif' }}
                        >
                          {/* Top row: Player Avatar, Name, and Amount */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/35 flex items-center justify-center text-[#00F0FF] font-black text-xs uppercase shrink-0">
                                {rec.username?.substring(0, 2) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-white text-xs truncate block">
                                  {rec.username}
                                </span>
                                <span className="text-[10px] text-gray-400 block font-mono">
                                  {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'} • {rec.createdAt ? new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className={`font-mono font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isPositive ? '+' : '-'}${Math.abs(Number(rec.amount || 0)).toFixed(2)} <span className="text-[10px]">SC</span>
                              </div>
                              {rec.balanceAfter !== null && rec.balanceAfter !== undefined && (
                                <div className="text-[9.5px] text-gray-400 font-mono">
                                  Bal: ${Number(rec.balanceAfter).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Badges row: Type badge, Status badge, Method */}
                          <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-white/5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${isDeposit
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                                : isWithdrawal
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/35'
                                  : isCredit
                                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
                                    : isDebit
                                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/35'
                                      : 'bg-purple-500/15 text-purple-300 border-purple-500/35'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isDeposit ? 'bg-emerald-400' : isWithdrawal ? 'bg-amber-400' : isCredit ? 'bg-cyan-300' : isDebit ? 'bg-rose-400' : 'bg-purple-300'
                                  }`} />
                                <span>{label}</span>
                              </span>

                              <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${isPending
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                : isRejected
                                  ? 'bg-red-500/15 text-red-300 border-red-500/40'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                }`}>
                                {isPending ? 'Pending' : isRejected ? 'Rejected' : 'Completed'}
                              </span>
                            </div>

                            <span className="text-[10.5px] text-gray-300 font-semibold truncate max-w-[130px]">
                              {rec.methodName || (isDeposit ? 'Direct Cashier' : isWithdrawal ? 'Cashier Dispatch' : 'System')}
                            </span>
                          </div>

                          {/* Footer row: Screenshot Proof (if exists) & Receipt Details CTA */}
                          <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                            {hasProof ? (
                              <button
                                type="button"
                                onClick={() => setPreviewProofImage({
                                  image: rec.proofImage,
                                  title: `${rec.username} - ${label} Proof Receipt`,
                                  amount: rec.amount,
                                  user: rec.username,
                                  date: rec.createdAt,
                                  method: rec.methodName,
                                  notes: rec.notes || rec.reason,
                                  status: rec.status,
                                })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] text-[10.5px] font-bold cursor-pointer hover:bg-[#00F0FF]/20 transition"
                              >
                                <Eye size={11} />
                                <span>View Proof 👁️</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-500 italic">No proof image</span>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedTxDetail(rec)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#00F0FF]/15 border border-white/10 text-gray-300 hover:text-[#00F0FF] font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Receipt</span>
                              <ExternalLink size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table View (Hidden on mobile) */}
                <div className="hidden sm:block overflow-x-auto w-full">
                  <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                    <thead className="bg-[#090618] text-[#A69FB3] uppercase text-[10.5px] font-black tracking-wider border-b border-white/10">
                      <tr>
                        <th className="p-3.5">Date &amp; Time</th>
                        <th className="p-3.5">Player</th>
                        <th className="p-3.5">Transaction Type</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Payment Method</th>
                        <th className="p-3.5 text-center">Screenshot Proof</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Processed By</th>
                        <th className="p-3.5 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {ledgerRecords.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="p-12 text-center text-gray-400">
                            <div className="max-w-xs mx-auto space-y-2">
                              <FileSpreadsheet size={36} className="mx-auto text-gray-500 opacity-60" />
                              <p className="font-bold text-white text-sm">No transactions match your filter</p>
                              <p className="text-xs text-gray-400">Select "All Transactions" or clear your player search</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        ledgerRecords.map((rec, i) => {
                          const isPositive = Number(rec.amount || 0) >= 0;
                          const rawT = (rec.rawType || rec.type || '').toLowerCase();
                          const isDeposit = rawT.includes('deposit');
                          const isWithdrawal = rawT.includes('withdraw') || rawT.includes('redemption');
                          const isCredit = rawT.includes('credit');
                          const isDebit = rawT.includes('debit');
                          const isBonus = rawT.includes('bonus') || rawT.includes('freeplay');
                          const hasProof = Boolean(rec.proofImage);

                          // Label to display
                          let label = 'Transaction';
                          if (isDeposit) label = 'Deposit';
                          else if (isWithdrawal) label = 'Withdrawal';
                          else if (isCredit) label = 'Balance Added';
                          else if (isDebit) label = 'Balance Deducted';
                          else if (isBonus) label = 'Bonus';
                          else label = rec.displayType || 'Adjustment';

                          // Status display
                          const rawStatus = (rec.status || 'approved').toLowerCase();
                          const isPending = rawStatus === 'pending' || rawStatus.includes('pending');
                          const isRejected = rawStatus.includes('reject');

                          return (
                            <tr
                              key={rec.id || i}
                              onClick={() => setSelectedTxDetail(rec)}
                              className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                            >
                              {/* Date & Time */}
                              <td className="p-3.5 text-gray-300 font-mono text-[11px] whitespace-nowrap">
                                <div className="font-bold text-white">
                                  {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'Recent'}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {rec.createdAt ? new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                              </td>

                              {/* Player */}
                              <td className="p-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => rec.userId && setSelectedPlayerId(rec.userId)}
                                  className="flex items-center gap-2 group/btn text-left"
                                  title="Open Player Profile"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/35 flex items-center justify-center text-[#00F0FF] font-black text-xs uppercase">
                                    {rec.username?.substring(0, 2) || 'U'}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-white group-hover/btn:text-[#00F0FF] transition flex items-center gap-1">
                                      <span>{rec.username}</span>
                                      <ExternalLink size={10} className="opacity-0 group-hover/btn:opacity-100 transition" />
                                    </div>
                                    {rec.balanceAfter !== null && rec.balanceAfter !== undefined && (
                                      <div className="text-[10px] text-gray-400 font-mono">
                                        Bal: ${Number(rec.balanceAfter).toFixed(2)} SC
                                      </div>
                                    )}
                                  </div>
                                </button>
                              </td>

                              {/* Transaction Type */}
                              <td className="p-3.5 whitespace-nowrap">
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${isDeposit
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                                  : isWithdrawal
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/35'
                                    : isCredit
                                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
                                      : isDebit
                                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/35'
                                        : 'bg-purple-500/15 text-purple-300 border-purple-500/35'
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isDeposit
                                    ? 'bg-emerald-400'
                                    : isWithdrawal
                                      ? 'bg-amber-400'
                                      : isCredit
                                        ? 'bg-cyan-300'
                                        : isDebit
                                          ? 'bg-rose-400'
                                          : 'bg-purple-300'
                                    }`} />
                                  <span>{label}</span>
                                </span>
                              </td>

                              {/* Amount */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className={`font-mono font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-amber-400'
                                  }`}>
                                  {isPositive ? '+' : '-'}${Math.abs(Number(rec.amount || 0)).toFixed(2)} SC
                                </div>
                                {rec.balanceBefore !== null && rec.balanceBefore !== undefined && (
                                  <div className="text-[10px] text-gray-400 font-mono">
                                    Was: ${Number(rec.balanceBefore).toFixed(2)}
                                  </div>
                                )}
                              </td>

                              {/* Payment Method */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="font-extrabold text-white text-xs">
                                  {rec.methodName || (isDeposit ? 'Direct Cashier' : isWithdrawal ? 'Cashier Dispatch' : 'System')}
                                </div>
                                {rec.txHash && (
                                  <div className="text-[10px] text-[#00F0FF] font-mono truncate max-w-[120px]" title={rec.txHash}>
                                    TX: {rec.txHash}
                                  </div>
                                )}
                              </td>

                              {/* Screenshot Proof */}
                              <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {hasProof ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewProofImage({
                                      image: rec.proofImage,
                                      title: `${rec.username} - ${label} Proof Receipt`,
                                      amount: rec.amount,
                                      user: rec.username,
                                      date: rec.createdAt,
                                      method: rec.methodName,
                                      notes: rec.notes || rec.reason,
                                      status: rec.status,
                                    })}
                                    className="group/proof inline-flex flex-col items-center gap-1 p-1 rounded-xl hover:bg-white/10 transition"
                                    title="Click to zoom screenshot proof"
                                  >
                                    <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-[#00F0FF]/50 group-hover/proof:border-[#00F0FF] shadow-md group-hover/proof:scale-105 transition relative bg-[#070514]">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={rec.proofImage}
                                        alt="Proof thumbnail"
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/proof:opacity-100 flex items-center justify-center transition">
                                        <Eye size={13} className="text-[#00F0FF]" />
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-black text-[#00F0FF] group-hover/proof:underline">
                                      View Proof
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-gray-500 italic">
                                    No proof attached
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="p-3.5 whitespace-nowrap">
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${isPending
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                  : isRejected
                                    ? 'bg-red-500/15 text-red-300 border-red-500/40'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                  }`}>
                                  {isPending ? 'Pending' : isRejected ? 'Rejected' : 'Completed'}
                                </span>
                              </td>

                              {/* Processed By */}
                              <td className="p-3.5 whitespace-nowrap text-gray-300 text-xs">
                                <div className="font-bold text-white">
                                  {rec.performedBy || 'System'}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate max-w-[120px]" title={rec.notes}>
                                  {rec.notes || 'Settled'}
                                </div>
                              </td>

                              {/* Receipt Button */}
                              <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTxDetail(rec)}
                                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#00F0FF]/15 border border-white/10 hover:border-[#00F0FF]/40 text-gray-300 hover:text-[#00F0FF] font-bold text-[11px] transition inline-flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  <span>Details</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 17: AFFILIATE COMMISSIONS */}
          {activeTab === 'affiliate_commissions' && (
            <AffiliateManagementHub
              activeTab="affiliate_commissions"
              affiliates={affiliates}
              summary={affiliateSummary}
              onRefresh={() => {
                fetch('/api/affiliates?mode=admin', { credentials: 'include', cache: 'no-store' })
                  .then(r => r.json())
                  .then(d => {
                    if (d.success) {
                      setAffiliates(d.affiliates || []);
                      setAffiliateSummary(d.summary || null);
                    }
                  });
              }}
              onOpenPlayerProfile={(uid) => setSelectedPlayerId(uid)}
            />
          )}



          {/* MODAL: ADJUST PLAYER BALANCE */}
          {adjustModal.open && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(3, 2, 10, 0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => setAdjustModal({ open: false, user: null, amount: '', reason: '' })}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '460px',
                  backgroundColor: '#0E0A24',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.2)',
                  color: '#FFFFFF',
                  fontFamily: 'Lexend, sans-serif',
                  boxSizing: 'border-box',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-400" />
                    <h3 className="text-base font-black text-white">Adjust Player SC Balance</h3>
                  </div>
                  <button
                    onClick={() => setAdjustModal({ open: false, user: null, amount: '', reason: '' })}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#070514] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-black text-gray-400">Player</div>
                    <div className="text-sm font-bold text-white">{adjustModal.user?.username}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{adjustModal.user?.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-black text-gray-400">Current Balance</div>
                    <div className="text-lg font-black text-emerald-400 font-mono">
                      ${Number(adjustModal.user?.balanceSC || 0).toFixed(2)} SC
                    </div>
                  </div>
                </div>

                {/* Quick Adjustment Presets */}
                <div>
                  <label className="text-[11px] font-bold text-gray-300 block mb-1.5 uppercase">
                    Quick Amount Selection
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[10, 25, 50, 100].map(amt => (
                      <button
                        key={`add-${amt}`}
                        type="button"
                        onClick={() => setAdjustModal({ ...adjustModal, amount: String(amt) })}
                        className="py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs transition"
                      >
                        +${amt}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10, 25, 50, 100].map(amt => (
                      <button
                        key={`sub-${amt}`}
                        type="button"
                        onClick={() => setAdjustModal({ ...adjustModal, amount: `-${amt}` })}
                        className="py-1.5 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-mono font-bold text-xs transition"
                      >
                        -${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const amt = Number(adjustModal.amount);
                    if (isNaN(amt) || amt === 0) return alert('Please enter a valid non-zero adjustment amount');
                    const res = await fetch('/api/users', {
                      method: 'PUT',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: adjustModal.user.id,
                        action: 'adjustBalance',
                        balanceAdjustment: amt,
                        reason: adjustModal.reason || 'Manual staff adjustment',
                      }),
                    });
                    const d = await res.json();
                    if (d.success) {
                      alert(d.message);
                      setUsersList(usersList.map(u => u.id === adjustModal.user.id ? { ...u, balanceSC: d.newBalance } : u));
                      setAdjustModal({ open: false, user: null, amount: '', reason: '' });
                    } else {
                      alert(d.error);
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">
                      Custom Amount (+ to add, - to deduct) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 50.00 or -20.00"
                      value={adjustModal.amount}
                      onChange={(e) => setAdjustModal({ ...adjustModal, amount: e.target.value })}
                      className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-[#00F0FF] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 block mb-1 uppercase">Audit Reason / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. VIP Bonus allotment / Resolution"
                      value={adjustModal.reason}
                      onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
                      className="w-full bg-[#070514] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#00F0FF] transition"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setAdjustModal({ open: false, user: null, amount: '', reason: '' })}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-gold text-xs py-2 px-5 font-black uppercase tracking-wider shadow-lg">
                      Confirm Balance Update
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: RESET PLAYER PASSWORD */}
          {resetPassModal.open && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(3, 2, 10, 0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => setResetPassModal({ open: false, user: null, newPass: '' })}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  backgroundColor: '#0E0A24',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(168, 85, 247, 0.2)',
                  color: '#FFFFFF',
                  fontFamily: 'Lexend, sans-serif',
                  boxSizing: 'border-box',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">Reset Player Password</h3>
                  <button onClick={() => setResetPassModal({ open: false, user: null, newPass: '' })} className="text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-xs text-gray-300">
                  Target: <span className="text-white font-bold">{resetPassModal.user?.username}</span> ({resetPassModal.user?.email})
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await fetch('/api/users', {
                      method: 'PUT',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: resetPassModal.user.id,
                        action: 'resetPassword',
                        newPassword: resetPassModal.newPass,
                      }),
                    });
                    const d = await res.json();
                    if (d.success) {
                      alert(d.message);
                      setResetPassModal({ open: false, user: null, newPass: '' });
                    } else {
                      alert(d.error);
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">New Secure Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={resetPassModal.newPass}
                      onChange={(e) => setResetPassModal({ ...resetPassModal, newPass: e.target.value })}
                      className="w-full bg-[#0E0816] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full btn-sovereign-teal text-xs py-2.5">
                    <span>Save New Password</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: EDIT PAYMENT GATEWAY RAIL */}
          {editGatewayModal.open && editGatewayModal.data && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(3, 2, 10, 0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                overflowY: 'auto',
              }}
              onClick={() => setEditGatewayModal({ open: false, data: null })}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '560px',
                  backgroundColor: '#0E0A24',
                  border: '1px solid rgba(0, 240, 255, 0.45)',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.2)',
                  position: 'relative',
                  color: '#FFFFFF',
                  maxHeight: '92vh',
                  overflowY: 'auto',
                  fontFamily: 'Lexend, -apple-system, sans-serif',
                  boxSizing: 'border-box',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '14px', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <Edit2 size={18} color="#00F0FF" />
                      <span>Edit Payment Method</span>
                    </h3>
                    <p style={{ fontSize: '11px', color: '#9A91A8', margin: '4px 0 0 0' }}>
                      Update payment method details, direct payment link, or QR Code
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditGatewayModal({ open: false, data: null })}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C8C1D4',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const { id, name, type, tag, accountDetails, paymentUrl, qrCode, instructions, minDeposit, maxDeposit, isActive } = editGatewayModal.data;
                    const res = await fetch('/api/payments/methods', {
                      method: 'PUT',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id,
                        name,
                        type,
                        tag,
                        accountDetails,
                        paymentUrl,
                        qrCode,
                        instructions,
                        minDeposit,
                        maxDeposit,
                        isActive,
                      }),
                    });
                    const d = await res.json();
                    if (d.success) {
                      alert('Payment method updated successfully!');
                      setPaymentMethods(prev => prev.map(m => m.id === id ? { ...editGatewayModal.data } : m));
                      setEditGatewayModal({ open: false, data: null });
                    } else {
                      alert(d.error || 'Failed to update payment method');
                    }
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#C8C1D4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Gateway Name *
                      </label>
                      <input
                        type="text"
                        value={editGatewayModal.data.name}
                        onChange={(e) => setEditGatewayModal(prev => ({
                          ...prev,
                          data: { ...prev.data, name: e.target.value }
                        }))}
                        style={{
                          width: '100%',
                          backgroundColor: '#070514',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          fontSize: '12.5px',
                          color: '#FFFFFF',
                          fontFamily: 'Lexend, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#C8C1D4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Tag Badge
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Instant / Zero Fee / VIP"
                        value={editGatewayModal.data.tag || ''}
                        onChange={(e) => setEditGatewayModal(prev => ({
                          ...prev,
                          data: { ...prev.data, tag: e.target.value }
                        }))}
                        style={{
                          width: '100%',
                          backgroundColor: '#070514',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          fontSize: '12px',
                          color: '#FFFFFF',
                          fontFamily: 'Lexend, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#C8C1D4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Official Identifier ($Cashtag or Address) *
                    </label>
                    <input
                      type="text"
                      value={editGatewayModal.data.accountDetails}
                      onChange={(e) => setEditGatewayModal(prev => ({
                        ...prev,
                        data: { ...prev.data, accountDetails: e.target.value }
                      }))}
                      style={{
                        width: '100%',
                        backgroundColor: '#070514',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        fontSize: '13px',
                        color: '#00F0FF',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#C8C1D4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Direct Payment Link (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://cash.app/$ParadisePay"
                      value={editGatewayModal.data.paymentUrl || ''}
                      onChange={(e) => setEditGatewayModal(prev => ({
                        ...prev,
                        data: { ...prev.data, paymentUrl: e.target.value }
                      }))}
                      style={{
                        width: '100%',
                        backgroundColor: '#070514',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        fontSize: '12.5px',
                        color: '#FFFFFF',
                        fontFamily: 'Lexend, sans-serif',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* QR Code Upload / Replace */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#C8C1D4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      QR Code Image
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label
                        style={{
                          cursor: 'pointer',
                          padding: '9px 14px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(0, 240, 255, 0.15)',
                          border: '1px solid rgba(0, 240, 255, 0.35)',
                          color: '#00F0FF',
                          fontSize: '12px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                        }}
                      >
                        <Upload size={14} />
                        <span>Upload QR</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) return alert('QR Code image must be under 5MB');
                            const reader = new FileReader();
                            reader.onload = () => setEditGatewayModal(prev => ({
                              ...prev,
                              data: { ...prev.data, qrCode: reader.result }
                            }));
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>

                      <input
                        type="url"
                        placeholder={editGatewayModal.data.qrCode?.startsWith('data:') ? 'Image attached (Click X to clear)' : 'Or paste QR Image URL'}
                        value={editGatewayModal.data.qrCode?.startsWith('data:') ? '' : (editGatewayModal.data.qrCode || '')}
                        disabled={editGatewayModal.data.qrCode?.startsWith('data:')}
                        onChange={(e) => setEditGatewayModal(prev => ({
                          ...prev,
                          data: { ...prev.data, qrCode: e.target.value }
                        }))}
                        style={{
                          flex: 1,
                          backgroundColor: '#070514',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          fontSize: '12px',
                          color: '#FFFFFF',
                          fontFamily: 'Lexend, sans-serif',
                          outline: 'none',
                          boxSizing: 'border-box',
                          opacity: editGatewayModal.data.qrCode?.startsWith('data:') ? 0.6 : 1,
                        }}
                      />

                      {editGatewayModal.data.qrCode && (
                        <button
                          type="button"
                          onClick={() => setEditGatewayModal(prev => ({
                            ...prev,
                            data: { ...prev.data, qrCode: '' }
                          }))}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#FCA5A5',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                          title="Remove QR Code"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {editGatewayModal.data.qrCode && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '12px', backgroundColor: '#070514', border: '1px solid rgba(0, 240, 255, 0.25)', width: 'max-content' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={editGatewayModal.data.qrCode} alt="QR Preview" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'contain', backgroundColor: '#FFFFFF', padding: '2px' }} />
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 800 }}>✓ Active QR Code will display to players</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#C8C1D4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Instructions for Player
                    </label>
                    <textarea
                      rows={2}
                      value={editGatewayModal.data.instructions || ''}
                      onChange={(e) => setEditGatewayModal(prev => ({
                        ...prev,
                        data: { ...prev.data, instructions: e.target.value }
                      }))}
                      style={{
                        width: '100%',
                        backgroundColor: '#070514',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        color: '#FFFFFF',
                        fontFamily: 'Lexend, sans-serif',
                        outline: 'none',
                        resize: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ paddingTop: '4px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 800, color: '#FFFFFF' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(editGatewayModal.data.isActive)}
                        onChange={(e) => setEditGatewayModal(prev => ({
                          ...prev,
                          data: { ...prev.data, isActive: e.target.checked }
                        }))}
                        style={{ width: '16px', height: '16px', accentColor: '#00F0FF', cursor: 'pointer' }}
                      />
                      <span>Active Payment Method (Visible to Players on Deposit)</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <button
                      type="button"
                      onClick={() => setEditGatewayModal({ open: false, data: null })}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '12px',
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#9A91A8',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 22px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #00F0FF 0%, #00B4D8 100%)',
                        border: 'none',
                        color: '#070514',
                        fontSize: '12px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        boxShadow: '0 4px 18px rgba(0, 240, 255, 0.4)',
                        transition: 'all 0.2s',
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: PREVIEW FULL SIZE QR CODE */}
          {previewQrModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(3, 2, 10, 0.94)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => setPreviewQrModal(null)}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  backgroundColor: '#0E0A24',
                  border: '1px solid rgba(0, 240, 255, 0.45)',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 40px rgba(0, 240, 255, 0.25)',
                  textAlign: 'center',
                  color: '#FFFFFF',
                  fontFamily: 'Lexend, sans-serif',
                  boxSizing: 'border-box',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>{previewQrModal.name} QR Code</h4>
                  <button
                    onClick={() => setPreviewQrModal(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C8C1D4',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '16px', margin: '0 auto', width: 'max-content', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewQrModal.qrCode} alt="Full QR Code" style={{ width: '220px', height: '220px', objectFit: 'contain', display: 'block' }} />
                </div>
                <p style={{ fontSize: '13px', fontFamily: 'monospace', color: '#00F0FF', fontWeight: 800, marginTop: '14px', wordBreak: 'break-all' }}>
                  {previewQrModal.accountDetails || previewQrModal.cashtag}
                </p>
              </div>
            </div>
          )}

          {/* Lightbox Zoom Modal: Transaction Proof Screenshot */}
          {previewProofImage && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(3, 2, 10, 0.94)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => setPreviewProofImage(null)}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '620px',
                  maxHeight: '92vh',
                  backgroundColor: '#0E0A24',
                  border: '1px solid rgba(0, 240, 255, 0.45)',
                  borderRadius: '24px',
                  padding: '22px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 50px rgba(0, 240, 255, 0.25)',
                  color: '#FFFFFF',
                  fontFamily: 'Lexend, sans-serif',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00F0FF' }}>
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                        {previewProofImage.title || 'Transaction Proof Receipt'}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#9A91A8' }}>
                        Player: <strong style={{ color: '#00F0FF' }}>{previewProofImage.user}</strong> • Amount: <strong style={{ color: '#10B981' }}>${Math.abs(Number(previewProofImage.amount || 0)).toFixed(2)} SC</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {previewProofImage.image && (
                      <a
                        href={previewProofImage.image}
                        download={`proof_${previewProofImage.user || 'tx'}_${Date.now()}.png`}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(0, 240, 255, 0.15)',
                          color: '#00F0FF',
                          border: '1px solid rgba(0, 240, 255, 0.35)',
                          fontSize: '11px',
                          fontWeight: 800,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewProofImage(null)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C8C1D4',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Screenshot Image Container */}
                <div
                  style={{
                    backgroundColor: '#070514',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxHeight: '58vh',
                    overflow: 'auto',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewProofImage.image}
                    alt="Transaction Proof Receipt"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '54vh',
                      objectFit: 'contain',
                      borderRadius: '10px',
                      display: 'block',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
                    }}
                  />
                </div>

                {/* Metadata Details */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    fontSize: '11.5px',
                    color: '#C8C1D4',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '8px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block' }}>Method</span>
                    <strong style={{ color: '#FFFFFF' }}>{previewProofImage.method || 'Direct Cashier'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block' }}>Date</span>
                    <strong style={{ color: '#FFFFFF' }}>{previewProofImage.date ? new Date(previewProofImage.date).toLocaleString() : 'N/A'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block' }}>Reference / Notes</span>
                    <strong style={{ color: '#00F0FF', wordBreak: 'break-all' }}>{previewProofImage.notes || 'Verified on platform'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Receipt Detail Modal */}
          {selectedTxDetail && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99998,
                backgroundColor: 'rgba(3, 2, 10, 0.92)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => setSelectedTxDetail(null)}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '560px',
                  maxHeight: '92vh',
                  backgroundColor: '#0E0A24',
                  border: '1px solid rgba(0, 240, 255, 0.45)',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.98), 0 0 50px rgba(0, 240, 255, 0.25)',
                  color: '#FFFFFF',
                  fontFamily: 'Lexend, -apple-system, sans-serif',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00F0FF' }}>
                      <FileSpreadsheet size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                        Transaction Receipt Details
                      </h3>
                      <span style={{ fontSize: '11px', color: '#9A91A8', fontFamily: 'monospace' }}>
                        ID: {selectedTxDetail.id || 'TX-N/A'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTxDetail(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C8C1D4',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Big Amount Card */}
                {(() => {
                  const isPositive = Number(selectedTxDetail.amount || 0) >= 0;
                  const rawT = (selectedTxDetail.rawType || selectedTxDetail.type || '').toLowerCase();
                  const isDeposit = rawT.includes('deposit');
                  const isWithdrawal = rawT.includes('withdraw') || rawT.includes('redemption');
                  let typeLabel = 'Transaction';
                  if (isDeposit) typeLabel = 'Deposit';
                  else if (isWithdrawal) typeLabel = 'Withdrawal';
                  else if (rawT.includes('credit')) typeLabel = 'Balance Added';
                  else if (rawT.includes('debit')) typeLabel = 'Balance Deducted';
                  else if (rawT.includes('bonus')) typeLabel = 'Bonus';
                  else typeLabel = selectedTxDetail.displayType || 'Adjustment';

                  const rawStatus = (selectedTxDetail.status || 'approved').toLowerCase();
                  const isPending = rawStatus === 'pending' || rawStatus.includes('pending');
                  const isRejected = rawStatus.includes('reject');

                  return (
                    <div style={{ backgroundColor: '#070514', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '18px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          padding: '3px 12px',
                          borderRadius: '999px',
                          backgroundColor: isDeposit ? 'rgba(16, 185, 129, 0.15)' : isWithdrawal ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 240, 255, 0.15)',
                          color: isDeposit ? '#34D399' : isWithdrawal ? '#FBBF24' : '#00F0FF',
                          border: `1px solid ${isDeposit ? 'rgba(16, 185, 129, 0.35)' : isWithdrawal ? 'rgba(245, 158, 11, 0.35)' : 'rgba(0, 240, 255, 0.35)'}`,
                        }}>
                          {typeLabel}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          backgroundColor: isPending ? 'rgba(245, 158, 11, 0.2)' : isRejected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: isPending ? '#FBBF24' : isRejected ? '#F87171' : '#34D399',
                        }}>
                          {isPending ? 'Pending Verification' : isRejected ? 'Rejected' : 'Completed'}
                        </span>
                      </div>

                      <div style={{
                        fontSize: '32px',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: isPositive ? '#34D399' : '#FBBF24',
                        letterSpacing: '0.02em',
                      }}>
                        {isPositive ? '+' : '-'}${Math.abs(Number(selectedTxDetail.amount || 0)).toFixed(2)} SC
                      </div>
                    </div>
                  );
                })()}

                {/* Player Info Box */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00F0FF', fontWeight: 900 }}>
                      {selectedTxDetail.username?.substring(0, 2).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '13px' }}>
                        {selectedTxDetail.username}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9A91A8' }}>
                        Player Account
                      </div>
                    </div>
                  </div>

                  {selectedTxDetail.userId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayerId(selectedTxDetail.userId);
                        setSelectedTxDetail(null);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(0, 240, 255, 0.15)',
                        color: '#00F0FF',
                        border: '1px solid rgba(0, 240, 255, 0.35)',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span>Open Profile</span>
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>

                {/* Metadata Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                  <div style={{ backgroundColor: '#070514', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Payment Method</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedTxDetail.methodName || 'Direct Cashier'}</strong>
                  </div>
                  <div style={{ backgroundColor: '#070514', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Date &amp; Time</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedTxDetail.createdAt ? new Date(selectedTxDetail.createdAt).toLocaleString() : 'Recent'}</strong>
                  </div>
                  <div style={{ backgroundColor: '#070514', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Balance Before</span>
                    <strong style={{ color: '#C8C1D4', fontFamily: 'monospace' }}>
                      {selectedTxDetail.balanceBefore !== null && selectedTxDetail.balanceBefore !== undefined ? `$${Number(selectedTxDetail.balanceBefore).toFixed(2)} SC` : '—'}
                    </strong>
                  </div>
                  <div style={{ backgroundColor: '#070514', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Balance After</span>
                    <strong style={{ color: '#00F0FF', fontFamily: 'monospace' }}>
                      {selectedTxDetail.balanceAfter !== null && selectedTxDetail.balanceAfter !== undefined ? `$${Number(selectedTxDetail.balanceAfter).toFixed(2)} SC` : '—'}
                    </strong>
                  </div>
                  <div style={{ backgroundColor: '#070514', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Auditor / Staff</span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedTxDetail.performedBy || 'System Process'}</strong>
                  </div>
                  <div style={{ backgroundColor: '#070514', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '10px', color: '#9A91A8', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>Notes &amp; Reference</span>
                    <strong style={{ color: '#C8C1D4', wordBreak: 'break-all' }}>{selectedTxDetail.notes || 'No extra notes recorded'}</strong>
                  </div>
                </div>

                {/* Screenshot Proof Attached Section */}
                {selectedTxDetail.proofImage && (
                  <div style={{ backgroundColor: '#070514', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#00F0FF', textTransform: 'uppercase' }}>
                        Attached Payment Slip / Proof
                      </span>
                      <a
                        href={selectedTxDetail.proofImage}
                        download={`proof_${selectedTxDetail.username || 'tx'}_${Date.now()}.png`}
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#00F0FF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          textDecoration: 'none',
                        }}
                      >
                        <Download size={12} />
                        <span>Download Slip</span>
                      </a>
                    </div>
                    <div
                      onClick={() => setPreviewProofImage({
                        image: selectedTxDetail.proofImage,
                        title: `${selectedTxDetail.username} Proof Receipt`,
                        amount: selectedTxDetail.amount,
                        user: selectedTxDetail.username,
                        date: selectedTxDetail.createdAt,
                        method: selectedTxDetail.methodName,
                        notes: selectedTxDetail.notes,
                        status: selectedTxDetail.status,
                      })}
                      style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', maxHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E0A24' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedTxDetail.proofImage}
                        alt="Payment Proof"
                        style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                    <span style={{ fontSize: '10px', color: '#9A91A8', marginTop: '6px', display: 'block' }}>
                      Click image to view in full resolution
                    </span>
                  </div>
                )}

                {/* Footer Close Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTxDetail(null)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Player 360° Profile Modal */}
          {selectedPlayerId && (
            <Player360ProfileModal
              userId={selectedPlayerId}
              onClose={() => setSelectedPlayerId(null)}
              onUserUpdated={(uid, newBal) => {
                setUsersList(prev => prev.map(item => item.id === uid ? { ...item, balanceSC: newBal } : item));
              }}
              onOpenChat={(playerUser) => {
                setSelectedPlayerId(null);
                setActiveTab('chat');
                const convId = playerUser?._id?.toString() || playerUser?.id || playerUser?.userId || selectedPlayerId;
                const found = chatConversations.find(c => c._id === convId || c.userId === convId);
                if (found) {
                  setActiveChatConv(found);
                } else {
                  setActiveChatConv({
                    _id: convId,
                    username: playerUser?.username || 'Player',
                    userId: convId,
                  });
                }
              }}
            />
          )}
          {/* Sound & Notification Tune Settings Modal */}
          <SoundSettingsModal
            isOpen={soundModalOpen}
            onClose={() => setSoundModalOpen(false)}
            selectedTune={alertTune}
            onSelectTune={handleSelectTune}
            volume={alertVolume}
            onChangeVolume={handleChangeVolume}
            soundEnabled={audioAlertsEnabled}
            onToggleSound={handleToggleSound}
            onTestToast={(testAlert) => setActiveAlertToast(testAlert)}
          />

          {/* Real-time Incoming Request Toast Notification */}
          <IncomingRequestToast
            alert={activeAlertToast}
            onDismiss={() => setActiveAlertToast(null)}
            onViewRequest={(alert) => {
              if (alert.targetTab) setActiveTab(alert.targetTab);
              if (alert.targetSubTab) {
                if (alert.targetTab === 'finance') setFinanceSubTab(alert.targetSubTab);
                if (alert.targetTab === 'coins_allotment') setAllotmentSubTab(alert.targetSubTab);
              }
              if (alert.cid) {
                const found = (chatConversations || []).find((c) => c._id === alert.cid);
                if (found) setActiveChatConv(found);
                else setActiveChatConv({ _id: alert.cid, username: 'Player', userId: alert.cid });
              }
            }}
          />
        </main>
      </div>
    </div>
  );
}
