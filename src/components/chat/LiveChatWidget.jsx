'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  Send,
  X,
  Shield,
  Sparkles,
  Paperclip,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { diffSet, areEqual } from '@/lib/fastDiff';

export default function LiveChatWidget({ user: initialUser, soundEnabled = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(initialUser || null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [guestId, setGuestId] = useState('');
  const [unreadStaffCount, setUnreadStaffCount] = useState(0);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastStaffMsgCountRef = useRef(0);
  const fetchMessagesRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const prevOpenRef = useRef(false);

  // Synchronous and persistent guestId generation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        let storedId = localStorage.getItem('pp_guest_chat_id');
        if (!storedId || !storedId.startsWith('guest_')) {
          storedId = `guest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
          localStorage.setItem('pp_guest_chat_id', storedId);
        }
        setGuestId(storedId);
      } catch {
        setGuestId(`guest_${Date.now().toString(36)}`);
      }
    }
  }, []);

  // Sync or fetch current user if not provided via props
  useEffect(() => {
    if (initialUser) {
      setCurrentUser(initialUser);
    } else {
      fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.user) setCurrentUser(d.user);
        })
        .catch(() => {});
    }

    // Listen to global user sync events from navbar
    const handleUserSync = (e) => {
      const nextUser = e.detail || null;
      diffSet(setCurrentUser, nextUser);
      if (nextUser) {
        try {
          localStorage.removeItem('pp_guest_chat_id');
        } catch {}
      } else {
        diffSet(setMessages, []);
      }
    };
    window.addEventListener('paradise-user-sync', handleUserSync);
    return () => window.removeEventListener('paradise-user-sync', handleUserSync);
  }, [initialUser]);

  // Global window listeners so any button/link/notification can open chat
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('open-live-chat', handleOpen);
    window.addEventListener('close-live-chat', handleClose);

    if (typeof window !== 'undefined') {
      window.openLiveChat = handleOpen;
      window.closeLiveChat = handleClose;
    }

    return () => {
      window.removeEventListener('open-live-chat', handleOpen);
      window.removeEventListener('close-live-chat', handleClose);
    };
  }, []);

  // Android Native Back Button Support for APK & Mobile Browser
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ ppChatOpen: true }, '');

      const handlePopState = () => {
        setIsOpen(false);
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    if (window.history.state?.ppChatOpen) {
      window.history.back();
    } else {
      setIsOpen(false);
    }
  };

  // Mobile virtual keyboard handling via VisualViewport API
  useEffect(() => {
    if (!isOpen) {
      setKeyboardOffset(0);
      return;
    }

    const updateKeyboardOffset = () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardOffset(offset > 80 ? offset : 0);
      }
    };

    window.visualViewport?.addEventListener('resize', updateKeyboardOffset);
    window.visualViewport?.addEventListener('scroll', updateKeyboardOffset);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardOffset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardOffset);
    };
  }, [isOpen]);

  // Periodic polling for messages:
  // - High frequency (3.5s) when drawer is open
  // - Low frequency (12s) in background when drawer is closed (to update unread badge)
  useEffect(() => {
    let isCancelled = false;

    const fetchMessages = async () => {
      if (document.hidden && !isOpen) return; // Save resources when tab backgrounded

      const params = new URLSearchParams();
      if (currentUser) {
        const userConvId = currentUser.userId || currentUser.id || currentUser._id;
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
        if (isCancelled || !data.success) return;

        const newMsgs = data.messages || [];
        setMessages((prev) => {
          // Preserve any optimistic messages that haven't been confirmed yet
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

        // Calculate unread staff messages
        const staffMsgs = newMsgs.filter((m) => m.senderRole === 'staff');
        if (isOpen) {
          diffSet(setUnreadStaffCount, 0);
        } else {
          diffSet(setUnreadStaffCount, data.unreadCount || staffMsgs.filter((m) => !m.read).length);
        }

        // Optional sound alert on new incoming staff message
        if (soundEnabled && staffMsgs.length > lastStaffMsgCountRef.current && lastStaffMsgCountRef.current > 0) {
          playTune('bell', 0.6);
        }
        lastStaffMsgCountRef.current = staffMsgs.length;
      } catch {
        // silent polling error
      }
    };

    fetchMessages();
    fetchMessagesRef.current = fetchMessages;
    const pollInterval = isOpen ? 3500 : 12000;
    const interval = setInterval(fetchMessages, pollInterval);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, currentUser, guestId, soundEnabled]);

  // Real-time zero-delay listener for Staff Replies from Admin Concierge Desk
  useEffect(() => {
    const handleStaffReply = (payload) => {
      if (!payload || payload.type !== 'STAFF_CHAT_REPLY') return;
      const myConvId = String(
        currentUser
          ? (currentUser.userId || currentUser.id || currentUser._id)
          : (guestId || (typeof window !== 'undefined' ? localStorage.getItem('pp_guest_chat_id') : '') || '')
      );
      if (!payload.conversationId || String(payload.conversationId) === myConvId) {
        if (fetchMessagesRef.current) {
          fetchMessagesRef.current();
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
  }, [currentUser, guestId]);

  // Auto-scroll to bottom ONLY on new incoming messages, initial open, or attachment/keyboard
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      return;
    }

    const isNewlyOpened = !prevOpenRef.current && isOpen;
    const hasNewMessage = messages.length > prevMsgCountRef.current;
    prevOpenRef.current = isOpen;
    prevMsgCountRef.current = messages.length;

    if (isNewlyOpened || hasNewMessage || attachedImage || keyboardOffset > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: isNewlyOpened ? 'auto' : 'smooth' });
    }
  }, [messages, keyboardOffset, attachedImage, isOpen]);

  // Compress & read image to lightweight base64
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
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

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setAttachedImage(compressedDataUrl);
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

  // Send message handler with optimistic UI update and error rollback
  const handleSendMessage = async (e, directText = null) => {
    if (e && e.preventDefault) e.preventDefault();

    const textToSend = directText !== null ? directText.trim() : inputMessage.trim();
    if ((!textToSend && !attachedImage) || sending) return;

    const currentText = textToSend;
    const currentAttachment = attachedImage;

    // Reset input fields
    setInputMessage('');
    setAttachedImage(null);
    setSendError(null);
    setSending(true);

    const effectiveGuestId =
      guestId ||
      (typeof window !== 'undefined' ? localStorage.getItem('pp_guest_chat_id') : '') ||
      `guest_${Date.now().toString(36)}`;

    // Optimistic message placeholder
    const optimisticMsg = {
      id: `opt_${Date.now()}`,
      conversationId: currentUser ? (currentUser.id || currentUser.userId || currentUser._id) : effectiveGuestId,
      userId: currentUser ? (currentUser.id || currentUser.userId || currentUser._id) : effectiveGuestId,
      username: currentUser?.username || `Guest #${effectiveGuestId.slice(-4).toUpperCase()}`,
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
        conversationId: currentUser ? (currentUser.userId || currentUser.id || currentUser._id) : effectiveGuestId,
        username: currentUser?.username || `Guest #${effectiveGuestId.slice(-4).toUpperCase()}`,
      };
      if (!currentUser) {
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

      // Replace optimistic message with verified server message
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
        );
      }

      // Immediately notify Admin Concierge Desk via BroadcastChannel & localStorage
      const convId = String(
        currentUser ? (currentUser.userId || currentUser.id || currentUser._id) : effectiveGuestId
      );
      const senderName = currentUser?.username || `Guest #${effectiveGuestId.slice(-4).toUpperCase()}`;
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
      // Restore input text so the user doesn't lose it
      setInputMessage(currentText);
      setAttachedImage(currentAttachment);
      setSendError(err.message || 'Delivery failed. Tap to retry.');
      // Remove optimistic message on failure
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
    <>
      {/* Floating Headphone Support Button - Visible site-wide */}
      <div className="fixed live-chat-float-btn right-4 sm:right-6 z-50">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setUnreadStaffCount(0);
          }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-2xl cursor-pointer group"
          style={{
            background: 'var(--primary-gradient)',
            boxShadow: '0 8px 30px var(--neon-cyan-glow), 0 0 20px var(--neon-purple-glow)',
          }}
          aria-label="Open 24/7 Live Support Concierge"
        >
          <Headphones size={24} className="text-black transition-transform group-hover:rotate-6" />

          {/* Pulse Online Indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#070514] animate-pulse" />

          {/* Unread Staff Message Badge */}
          {unreadStaffCount > 0 && !isOpen && (
            <span className="absolute -top-1.5 -left-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-lg border-2 border-[#070514] animate-bounce">
              {unreadStaffCount}
            </span>
          )}
        </button>
      </div>

      {/* Lightbox Image Preview Modal (High z-index so it displays in front of drawer) */}
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
              alt="Enlarged attachment"
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-cyan-400/80 shadow-[0_0_40px_rgba(0,240,255,0.3)]"
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

      {/* Chat Drawer / Modal */}
      {isOpen && (
        <div
          className="fixed live-chat-drawer right-3 sm:right-6 w-[94vw] sm:w-[410px] max-h-[84vh] h-[580px] rounded-2xl flex flex-col z-50 overflow-hidden shadow-2xl transition-all duration-150"
          style={{
            backgroundColor: 'var(--bg-deep)',
            border: '1px solid var(--chrome-border)',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 40px var(--neon-cyan-glow)',
            ...(keyboardOffset > 0 ? { bottom: `${keyboardOffset + 12}px` } : {}),
          }}
        >
          {/* Header */}
          <div
            className="p-3.5 border-b flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
              borderColor: 'var(--chrome-border)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-black shadow-md"
                  style={{ background: 'var(--primary-gradient)' }}
                >
                  RR
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0B071A] animate-ping" />
              </div>
              <div>
                <h4
                  className="text-xs font-black text-white flex items-center gap-1.5"
                  style={{ fontFamily: 'Lexend, sans-serif' }}
                >
                  <span>Rich Room VIP Lounge Desk</span>
                  <Sparkles size={12} color="var(--neon-cyan)" />
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Concierge Online</span>
                  </span>
                  {!currentUser && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Guest Session
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close Chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Compliance & Mode Notice */}
          <div
            className="px-3 py-1.5 border-b flex items-center justify-between text-[10px] text-gray-400"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
          >
            <div className="flex items-center gap-1.5">
              <Shield size={11} color="var(--neon-cyan)" className="shrink-0" />
              <span>Encrypted 24/7 VIP Hospitality & File Uploads</span>
            </div>
            {!currentUser ? (
              <span className="text-amber-400/90 font-mono text-[9.5px]">Guest Access</span>
            ) : (
              <span className="text-emerald-400/90 font-mono text-[9.5px]">@{currentUser.username}</span>
            )}
          </div>

          {/* Quick Inquiry Buttons (Visible on empty chat) */}
          {messages.length === 0 && (
            <div className="p-3 bg-[#0d0922]/80 border-b border-white/5 space-y-1.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" />
                <span>Instant Inquiries:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickInquiries.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(null, q)}
                    disabled={sending}
                    className="text-[10.5px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/50 text-cyan-200 transition text-left cursor-pointer active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Body */}
          <div
            className="flex-1 p-3.5 overflow-y-auto space-y-3"
            style={{ backgroundColor: '#080514' }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 flex items-center justify-center">
                  <Headphones size={24} className="text-[var(--neon-cyan)]" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    Welcome to 24/7 Live Concierge!
                  </p>
                  <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: 'Lexend, sans-serif' }}>
                    {!currentUser
                      ? 'Chatting as a guest. Ask questions or attach transaction/game screenshots anytime.'
                      : 'Ask about game credentials, cashout speed, or attach payment screenshots.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10.5px] text-slate-300">
                    ⚡ Typical staff reply in &lt; 1 min
                  </span>
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
                    <div className="text-[9.5px] text-slate-400 mb-0.5 px-1 font-mono">
                      {isPlayer ? m.username || 'You' : m.staffName || 'VIP Support'}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isPlayer
                          ? 'text-black font-semibold rounded-br-none shadow-md'
                          : 'text-white border border-white/10 rounded-bl-none font-medium'
                      }`}
                      style={{
                        background: isPlayer
                          ? 'linear-gradient(135deg, #00F0FF 0%, #00C2D1 100%)'
                          : '#170E38',
                        fontFamily: 'Lexend, sans-serif',
                      }}
                    >
                      {/* Attached image if present */}
                      {m.imageUrl && (
                        <div className="mb-1.5 overflow-hidden rounded-xl">
                          <img
                            src={m.imageUrl}
                            alt="Attachment"
                            onClick={() => setSelectedPreviewImage(m.imageUrl)}
                            className="max-h-56 max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition-transform active:scale-98 border border-black/20"
                          />
                        </div>
                      )}
                      {m.text && <p className="break-words">{m.text}</p>}
                    </div>

                    <div
                      className={`flex items-center gap-1 mt-1 px-1 text-[9.5px] text-gray-500 font-mono ${
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
                          <CheckCheck size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner if delivery failed */}
          {sendError && (
            <div className="px-3 py-2 bg-rose-950/80 border-t border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-1.5 truncate">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span className="truncate">{sendError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSendError(null)}
                className="text-[10px] text-rose-400 hover:text-white px-1.5 py-0.5 rounded"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Pending Image Attachment Preview */}
          {attachedImage && (
            <div className="px-3 py-2 bg-[#0c0820] border-t border-[var(--neon-cyan)]/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={attachedImage}
                  alt="Attachment preview"
                  className="w-10 h-10 rounded-lg object-cover border border-[var(--neon-cyan)] shrink-0"
                />
                <span className="text-[11px] text-slate-300 truncate font-mono">
                  Image attached (ready to send)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition"
                title="Remove attachment"
              >
                <X size={16} />
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
            className="p-2.5 border-t flex items-center gap-2"
            style={{ backgroundColor: '#0B071A', borderColor: 'rgba(0, 240, 255, 0.25)' }}
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || sending}
              className="p-2 rounded-xl text-slate-300 hover:text-[var(--neon-cyan)] bg-white/5 hover:bg-white/10 transition shrink-0 cursor-pointer"
              title="Attach screenshot or photo"
            >
              {uploadingImage ? (
                <span className="w-4 h-4 rounded-full border-2 border-t-[var(--neon-cyan)] border-slate-600 animate-spin inline-block" />
              ) : (
                <Paperclip size={16} />
              )}
            </button>

            <input
              ref={inputRef}
              type="text"
              placeholder={
                currentUser
                  ? 'Type message or attach image...'
                  : 'Type message (no account needed)...'
              }
              disabled={sending}
              value={inputMessage}
              onFocus={() => {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 300);
              }}
              onChange={(e) => {
                setInputMessage(e.target.value);
                if (sendError) setSendError(null);
              }}
              className="flex-1 py-2 px-3 text-xs rounded-xl text-white placeholder-gray-500 focus:outline-none transition"
              style={{
                backgroundColor: '#05030D',
                border: '1px solid rgba(0, 240, 255, 0.35)',
                fontFamily: 'Lexend, sans-serif',
              }}
            />

            <button
              type="submit"
              disabled={(!inputMessage.trim() && !attachedImage) || sending}
              className="p-2.5 rounded-xl font-bold flex items-center justify-center transition disabled:opacity-40 cursor-pointer shrink-0 text-black"
              style={{
                background: 'var(--primary-gradient)',
                boxShadow: '0 0 12px var(--neon-cyan-glow)',
              }}
            >
              {sending ? (
                <RefreshCw size={14} className="animate-spin text-white" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
