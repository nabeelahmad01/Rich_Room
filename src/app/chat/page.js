'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import AuthModal from '@/components/modals/AuthModal';
import {
  Headphones,
  Send,
  Shield,
  Sparkles,
  Paperclip,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  X,
  ArrowLeft,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { diffSet, areEqual } from '@/lib/fastDiff';

export default function ChatPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [guestId, setGuestId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastStaffMsgCountRef = useRef(0);
  const fetchMsgsRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const initialLoadedRef = useRef(false);

  // Load user & listen to global user sync
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d.user) {
          diffSet(setUser, d.user);
          try {
            localStorage.removeItem('pp_guest_chat_id');
          } catch {}
        }
      })
      .catch(() => {});

    const handleSync = (e) => {
      const nextUser = e.detail || null;
      diffSet(setUser, nextUser);
      if (nextUser) {
        try {
          localStorage.removeItem('pp_guest_chat_id');
        } catch {}
      } else {
        diffSet(setMessages, []);
      }
    };
    window.addEventListener('paradise-user-sync', handleSync);
    return () => window.removeEventListener('paradise-user-sync', handleSync);
  }, []);

  // Initialize persistent guest ID
  useEffect(() => {
    if (typeof window !== 'undefined' && !user) {
      let storedId = localStorage.getItem('pp_guest_chat_id');
      if (!storedId || !storedId.startsWith('guest_')) {
        storedId = `guest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem('pp_guest_chat_id', storedId);
      }
      setGuestId(storedId);
    }
  }, [user]);

  // Poll messages
  useEffect(() => {
    let isCancelled = false;
    const fetchMsgs = async () => {
      const params = new URLSearchParams();
      if (user) {
        const userConvId = user.userId || user.id || user._id;
        if (userConvId) params.set('conversationId', userConvId);
      } else {
        const activeGuestId =
          guestId ||
          (typeof window !== 'undefined' ? localStorage.getItem('pp_guest_chat_id') : '') ||
          `guest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        params.set('guestId', activeGuestId);
      }

      const endpoint = `/api/chat?${params.toString()}`;
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        const data = await res.json();
        if (!isCancelled && data.success) {
          const newMsgs = data.messages || [];
          setMessages((prev) => {
            const pendingOpts = prev.filter(
              (m) =>
                String(m.id).startsWith('opt_') &&
                !newMsgs.some(
                  (nm) =>
                    nm.text === m.text &&
                    Math.abs(new Date(nm.createdAt).getTime() - new Date(m.createdAt).getTime()) < 15000
                )
            );
            const nextVal = [...newMsgs, ...pendingOpts];
            return areEqual(prev, nextVal) ? prev : nextVal;
          });

          const staffMsgs = newMsgs.filter((m) => m.senderRole === 'staff');
          if (staffMsgs.length > lastStaffMsgCountRef.current && lastStaffMsgCountRef.current > 0) {
            playTune('bell', 0.6);
          }
          lastStaffMsgCountRef.current = staffMsgs.length;
        }
      } catch {}
    };

    fetchMsgs();
    fetchMsgsRef.current = fetchMsgs;
    const interval = setInterval(fetchMsgs, 3000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [user, guestId]);

  // Real-time zero-delay listener for Staff Replies from Admin Concierge Desk
  useEffect(() => {
    const handleStaffReply = (payload) => {
      if (!payload || payload.type !== 'STAFF_CHAT_REPLY') return;
      const myConvId = String(
        user
          ? (user.userId || user.id || user._id)
          : (guestId || (typeof window !== 'undefined' ? localStorage.getItem('pp_guest_chat_id') : '') || '')
      );
      if (!payload.conversationId || String(payload.conversationId) === myConvId) {
        if (fetchMsgsRef.current) {
          fetchMsgsRef.current();
        }
      }
    };

    let pChannel = null;
    try {
      pChannel = new BroadcastChannel('paradise_player_chat_sync');
      pChannel.onmessage = (event) => handleStaffReply(event.data);
    } catch {}

    const handleStorage = (e) => {
      if (e.key === 'paradise_player_chat_event' && e.newValue) {
        try {
          handleStaffReply(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (pChannel) pChannel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [user, guestId]);

  // Scroll to bottom only when new messages arrive or image attached
  useEffect(() => {
    const isFirst = !initialLoadedRef.current && messages.length > 0;
    const hasNew = messages.length > prevMsgCountRef.current;
    initialLoadedRef.current = true;
    prevMsgCountRef.current = messages.length;

    if (isFirst || hasNew || attachedImage) {
      messagesEndRef.current?.scrollIntoView({ behavior: isFirst ? 'auto' : 'smooth' });
    }
  }, [messages, attachedImage]);

  // Handle image upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        setAttachedImage(compressed);
        setUploadingImage(false);
      };
      img.onerror = () => {
        setAttachedImage(event.target.result);
        setUploadingImage(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send message
  const handleSendMessage = async (e, directText = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const textToSend = directText !== null ? directText.trim() : inputMessage.trim();
    if ((!textToSend && !attachedImage) || sending) return;

    const currentText = textToSend;
    const currentAttachment = attachedImage;
    setInputMessage('');
    setAttachedImage(null);
    setSendError(null);
    setSending(true);

    const effectiveGuestId =
      guestId ||
      (typeof window !== 'undefined' ? localStorage.getItem('pp_guest_chat_id') : '') ||
      `guest_${Date.now().toString(36)}`;

    const optimisticMsg = {
      id: `opt_${Date.now()}`,
      conversationId: user ? (user.id || user.userId || user._id) : effectiveGuestId,
      userId: user ? (user.id || user.userId || user._id) : effectiveGuestId,
      username: user?.username || `Guest #${effectiveGuestId.slice(-4).toUpperCase()}`,
      senderRole: 'player',
      text: currentText,
      imageUrl: currentAttachment || null,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const payload = {
        text: currentText,
        imageUrl: currentAttachment,
        conversationId: user ? (user.userId || user.id || user._id) : effectiveGuestId,
        username: user?.username || `Guest #${effectiveGuestId.slice(-4).toUpperCase()}`,
      };
      if (!user) {
        payload.guestId = effectiveGuestId;
        payload.guestName = `Guest #${effectiveGuestId.slice(-4).toUpperCase()}`;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message. Please retry.');
      }

      if (data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
        );
      }

      // Immediately notify Admin Concierge Desk via BroadcastChannel & localStorage
      const convId = String(
        user ? (user.userId || user.id || user._id) : effectiveGuestId
      );
      const senderName = user?.username || `Guest #${effectiveGuestId.slice(-4).toUpperCase()}`;
      const staffAlert = {
        type: 'NEW_CHAT_MESSAGE',
        username: senderName,
        text: currentText || (currentAttachment ? '📷 [Image Attachment]' : 'New inquiry'),
        conversationId: convId,
        time: Date.now(),
      };
      try {
        const ch = new BroadcastChannel('paradise_staff_alerts');
        ch.postMessage(staffAlert);
        ch.close();
      } catch {}
      try {
        localStorage.setItem('paradise_staff_event', JSON.stringify(staffAlert));
      } catch {}
    } catch (err) {
      setInputMessage(currentText);
      setAttachedImage(currentAttachment);
      setSendError(err.message || 'Delivery failed. Tap to retry.');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const quickInquiries = [
    'How do I deposit funds?',
    'I need my Game ID credentials',
    'Where is my cashout redemption?',
    'Speak to live VIP host',
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col font-sans">
      {/* Sidebar */}
      <CyberSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={user}
        onOpenChat={() => {}}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 pb-20 lg:pb-6 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={user}
          onOpenAuth={(tab) => setAuthModal({ open: true, tab: tab || 'login' })}
          onLogout={async () => {
            setUser(null);
            setMessages([]);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('paradise-user-sync', { detail: null }));
            }
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
            } catch {}
          }}
        />

        {/* Live Chat Page Content */}
        <main className="flex-1 p-3 sm:p-6 pb-28 lg:pb-6 max-w-5xl w-full mx-auto flex flex-col min-h-0">
          {/* Header Card */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#170E38] via-[#0E0927] to-[#070417] border border-cyan-500/30 shadow-[0_0_25px_rgba(0,240,255,0.15)]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center text-black shadow-lg">
                <Headphones size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                    24/7 VIP Live Concierge Desk
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online & Active
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Direct encrypted line to Players Paradise VIP Hospitality Staff. Typical reply under 1 minute.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 font-mono flex items-center gap-1.5">
                <Clock size={13} className="text-cyan-400" />
                <span>Round-the-clock 24/7/365</span>
              </span>
            </div>
          </div>

          {/* Chat Window Box */}
          <div
            className="flex-1 flex flex-col rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl min-h-[500px]"
            style={{ backgroundColor: '#0A0617' }}
          >
            {/* Chat Top Subheader */}
            <div className="px-4 py-2.5 bg-[#0E0924] border-b border-white/10 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-cyan-400" />
                <span>End-to-End Encrypted Support Channel</span>
              </div>
              <div className="font-mono text-[11px]">
                {user ? (
                  <span className="text-emerald-400">Connected: @{user.username}</span>
                ) : (
                  <span className="text-amber-400">
                    Guest: #{guestId.slice(-4).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Inquiries */}
            {messages.length === 0 && (
              <div className="p-3 bg-[#110B2B] border-b border-white/5 space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" /> Quick Inquiries:
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickInquiries.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(null, q)}
                      disabled={sending}
                      className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/50 text-cyan-200 transition text-left cursor-pointer active:scale-95"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#070412]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <Headphones size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">How can we assist you today?</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      Send a message, ask about game accounts, cashier deposits, fast cashouts, or attach payment screenshots for instant review.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isPlayer = m.senderRole === 'player';
                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-gray-400 mb-1 px-1 font-mono">
                        {isPlayer ? m.username || 'You' : m.staffName || 'VIP Support'}
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                          isPlayer
                            ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-black font-semibold rounded-br-none shadow-[0_4px_15px_rgba(0,240,255,0.25)]'
                            : 'bg-[#18103A] text-white border border-white/10 rounded-bl-none font-medium'
                        }`}
                      >
                        {m.imageUrl && (
                          <div className="mb-2 overflow-hidden rounded-xl">
                            <img
                              src={m.imageUrl}
                              alt="Attachment"
                              onClick={() => setSelectedPreviewImage(m.imageUrl)}
                              className="max-h-72 max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition-transform active:scale-98 border border-black/20"
                            />
                          </div>
                        )}
                        {m.text && <p className="break-words text-sm">{m.text}</p>}
                      </div>

                      <div
                        className={`flex items-center gap-1 mt-1 px-1 text-[10px] text-gray-500 font-mono ${
                          isPlayer ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isPlayer && (
                          <span className="text-cyan-400">
                            <CheckCheck size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Banner */}
            {sendError && (
              <div className="px-4 py-2 bg-rose-950/80 border-t border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-rose-400" />
                  <span>{sendError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSendError(null)}
                  className="text-xs text-rose-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Pending Image Attachment */}
            {attachedImage && (
              <div className="px-4 py-2 bg-[#100B2B] border-t border-cyan-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <img
                    src={attachedImage}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-cyan-400"
                  />
                  <span className="text-xs text-cyan-200 font-mono">
                    Image ready to send (Tap send to upload)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-rose-400"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Message Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-[#0F0A27] border-t border-cyan-500/30 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || sending}
                className="p-2.5 rounded-xl text-slate-300 hover:text-cyan-400 bg-white/5 hover:bg-white/10 transition cursor-pointer"
                title="Attach screenshot or photo"
              >
                {uploadingImage ? (
                  <span className="w-5 h-5 rounded-full border-2 border-t-cyan-400 border-slate-600 animate-spin inline-block" />
                ) : (
                  <Paperclip size={18} />
                )}
              </button>

              <input
                type="text"
                value={inputMessage}
                disabled={sending}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  if (sendError) setSendError(null);
                }}
                placeholder={
                  user
                    ? 'Type message or upload payment/game screenshot...'
                    : 'Type message (guest mode active, no login needed)...'
                }
                className="flex-1 py-2.5 px-4 text-sm rounded-xl text-white placeholder-gray-500 focus:outline-none transition"
                style={{
                  backgroundColor: '#060312',
                  border: '1px solid rgba(0, 240, 255, 0.35)',
                }}
              />

              <button
                type="submit"
                disabled={(!inputMessage.trim() && !attachedImage) || sending}
                className="px-5 py-2.5 rounded-xl font-bold flex items-center justify-center transition disabled:opacity-40 cursor-pointer shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #E026D8 0%, #00F0FF 100%)',
                  color: '#FFFFFF',
                }}
              >
                {sending ? (
                  <RefreshCw size={16} className="animate-spin text-white" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span>Send</span>
                    <Send size={15} />
                  </div>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Lightbox Preview */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center cursor-default p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white bg-slate-800/90 rounded-full hover:bg-rose-600 transition shadow-xl border border-white/20"
              title="Close"
            >
              <X size={20} />
            </button>
            <img
              src={selectedPreviewImage}
              alt="Enlarged"
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-cyan-400 shadow-[0_0_40px_rgba(0,240,255,0.3)]"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={selectedPreviewImage}
                download="chat-attachment.jpg"
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-black text-xs transition flex items-center gap-1.5 shadow-lg hover:scale-105 active:scale-95"
              >
                <span>Download / Save Image</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <CyberMobileBottomNav user={user} />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, tab: 'login' })}
        initialTab={authModal.tab}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
        }}
      />
    </div>
  );
}
