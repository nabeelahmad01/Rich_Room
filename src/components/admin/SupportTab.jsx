'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export default function SupportTab({
  chatMessages = [],
  onSendAdminReply,
}) {
  const [selectedUser, setSelectedUser] = useState('demo-player');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Group messages by user
  const groupedByPlayer = {};
  chatMessages.forEach((msg) => {
    const playerKey = msg.user || msg.username || 'demo-player';
    if (!groupedByPlayer[playerKey]) {
      groupedByPlayer[playerKey] = [];
    }
    groupedByPlayer[playerKey].push(msg);
  });

  // Default fallback thread if no live chats yet
  const playerList = Object.keys(groupedByPlayer).length > 0
    ? Object.keys(groupedByPlayer)
    : ['player_demo', 'gamer_vip', 'matrix_panda'];

  const currentMessages = groupedByPlayer[selectedUser] || [
    { sender: 'user', text: 'Hello! I just requested my Ultra Panda credentials. How long does it usually take?', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { sender: 'agent', text: 'Welcome to Rich Room! Our team reviews requests within minutes. You can check your Player Credentials Hub anytime!', timestamp: new Date(Date.now() - 1800000).toISOString() },
  ];

  const cannedResponses = [
    'Hello! How can our support team assist you today?',
    'Your game account credentials have been generated and sent to your Credentials Hub!',
    'Your deposit has been verified and your wallet is now credited with Sweepstakes Coins.',
    'Please send your payment screenshot and cashtag so we can expedite your verification.'
  ];

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await onSendAdminReply?.(selectedUser, replyText.trim());
      setReplyText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] min-h-[550px] rounded-3xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl flex flex-col md:flex-row overflow-hidden">
      {/* Left Column: Player Conversation Threads */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-[#070a1a]/95">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--neon-cyan)]" />
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-white">
              Support Inquiries
            </h3>
          </div>
          <span className="text-[10px] text-amber-950 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
            {playerList.length} Active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {playerList.map((player) => {
            const isSelected = selectedUser === player;
            return (
              <button
                key={player}
                onClick={() => setSelectedUser(player)}
                className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border border-amber-500/40 text-white'
                    : 'bg-slate-900/50 hover:bg-slate-900 border border-transparent text-slate-300'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-600/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                  <User size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate">@{player}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Click to open conversation thread
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Chat History & Reply Area */}
      <div className="flex-1 flex flex-col bg-[var(--bg-deep)]">
        {/* Thread Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-[var(--neon-cyan)] flex items-center justify-center font-bold text-xs">
              <User size={15} />
            </div>
            <div>
              <div className="font-bold text-xs text-white">@{selectedUser}</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Player In Room
              </div>
            </div>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {currentMessages.map((msg, idx) => {
            const isStaff = msg.sender === 'agent' || msg.sender === 'admin' || msg.isStaff;
            return (
              <div
                key={idx}
                className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-xs space-y-1 ${
                    isStaff
                      ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-white shadow-md rounded-tr-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text || msg.message}</p>
                  <div className={`text-[9px] ${isStaff ? 'text-amber-200 text-right' : 'text-slate-500'}`}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'Just now'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Canned Responses Bar */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-slate-500 font-bold shrink-0">Quick Templates:</span>
          {cannedResponses.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setReplyText(r)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {r.slice(0, 32)}...
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800 flex items-center gap-2 bg-[#060814]">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your official response to player..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,215,0,0.35)] transition-all disabled:opacity-40 cursor-pointer"
          >
            {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            <span>Reply</span>
          </button>
        </form>
      </div>
    </div>
  );
}
