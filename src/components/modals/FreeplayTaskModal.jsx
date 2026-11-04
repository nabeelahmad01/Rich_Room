'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import {
  X,
  Gift,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { diffSet, cleanGameTitle } from '@/lib/fastDiff';

export default function FreeplayTaskModal({
  isOpen,
  onClose,
  user,
  freeplayAmount = 5,
  onSuccess,
}) {
  const [mounted, setMounted] = useState(false);
  const [liveFreeplayAmount, setLiveFreeplayAmount] = useState(freeplayAmount);
  const [adminGames, setAdminGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statusMsg, setStatusMsg] = useState(null);
  const fileInputRef = useRef(null);
  const initialEmailSentRef = useRef(false);

  const targetEmail = user?.email || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background page scroll while modal is open so no outer scrollbar appears
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    setLiveFreeplayAmount(freeplayAmount);
  }, [freeplayAmount]);

  // Fetch admin games and latest configured Freeplay amount on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/settings', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d?.settings?.freeplayAmountSC !== undefined) {
            setLiveFreeplayAmount(Number(d.settings.freeplayAmountSC));
          }
        })
        .catch(() => {});

      fetch('/api/games', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.games) && d.games.length > 0) {
            const cleanList = d.games.map((g) => ({
              ...g,
              title: cleanGameTitle(g.title || ''),
            }));
            diffSet(setAdminGames, cleanList);
            setSelectedGame((prev) => {
              if (
                prev &&
                cleanList.some(
                  (g) => g.title.toLowerCase().trim() === prev.toLowerCase().trim()
                )
              ) {
                return prev;
              }
              return cleanList[0]?.title || '';
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Auto-send verification email on first open
  useEffect(() => {
    if (isOpen && targetEmail && !initialEmailSentRef.current) {
      initialEmailSentRef.current = true;
      handleSendEmail();
    }
  }, [isOpen, targetEmail]);

  if (!isOpen || !mounted) return null;

  const handleSendEmail = async (isManual = false) => {
    if (!targetEmail) {
      setStatusMsg({
        type: 'error',
        text: 'Please sign in or provide a valid email address.',
      });
      return;
    }
    if (isManual && resendCooldown > 0) return;

    setEmailSending(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/freeplay/send-task-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          name: user?.username || '',
          gameTitle: selectedGame,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSent(true);
        if (data.taskId) setTaskId(data.taskId);
        setResendCooldown(45);
        setStatusMsg({
          type: 'success',
          text: isManual
            ? 'New verification email dispatched! Check your Spam / Inbox.'
            : 'Verification task email sent! Follow the instructions below.',
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: data.message || 'Could not send verification email.',
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: 'Network error sending verification email.',
      });
    } finally {
      setEmailSending(false);
    }
  };

  // Compress uploaded screenshot
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({
        type: 'error',
        text: 'Please upload a valid image (PNG, JPG, or WebP).',
      });
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        setScreenshot(compressed);
        setUploading(false);
        setStatusMsg({
          type: 'success',
          text: 'Inbox screenshot attached and ready!',
        });
      };
      img.onerror = () => {
        setScreenshot(event.target.result);
        setUploading(false);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setUploading(false);
      setStatusMsg({ type: 'error', text: 'Error reading file.' });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGame) {
      setStatusMsg({
        type: 'error',
        text: 'Please select a casino game platform.',
      });
      return;
    }
    if (!screenshot) {
      setStatusMsg({
        type: 'error',
        text: 'Please upload your Inbox screenshot proof.',
      });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/freeplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle: selectedGame,
          taskId,
          screenshot,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        try {
          confetti({
            particleCount: 90,
            spread: 65,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#00F0FF', '#F59E0B', '#10B981'],
          });
        } catch {}

        // Broadcast real-time event to Admin Coins Allotment Desk (0ms)
        try {
          const staffChannel = new BroadcastChannel('paradise_staff_alerts');
          staffChannel.postMessage({
            type: 'NEW_COIN_LOAD',
            isFreeplay: true,
            gameTitle: selectedGame,
            userName: user?.username || targetEmail.split('@')[0],
            amount: data.amount || freeplayAmount,
          });
          staffChannel.close();
        } catch {}
        try {
          localStorage.setItem(
            'paradise_staff_event',
            JSON.stringify({
              type: 'NEW_COIN_LOAD',
              isFreeplay: true,
              gameTitle: selectedGame,
              userName: user?.username || targetEmail.split('@')[0],
              amount: data.amount || freeplayAmount,
              time: Date.now(),
            })
          );
        } catch {}

        if (onSuccess) onSuccess(data);
        setStatusMsg({
          type: 'success',
          text:
            data.message ||
            'Freeplay task submitted! Staff will verify your proof in Coins Allotment.',
        });

        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setStatusMsg({
          type: 'error',
          text: data.message || 'Failed to submit task proof.',
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: 'Network error submitting task proof.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(
    selectedGame && screenshot && !uploading && !submitting
  );

  const numAmt = Number(liveFreeplayAmount ?? freeplayAmount ?? 5);
  const displayAmt = numAmt % 1 === 0 ? numAmt.toFixed(0) : numAmt.toFixed(2);

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden no-scrollbar"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[460px] rounded-2xl border border-[var(--chrome-border)] bg-[#0f0c05] p-3.5 sm:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_var(--neon-cyan-glow)] text-white space-y-2.5 overflow-hidden no-scrollbar"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-64 h-20 bg-[var(--neon-cyan)]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close Freeplay Modal"
          className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-slate-900/90 border border-white/15 text-slate-300 hover:text-white hover:border-[var(--neon-cyan)] flex items-center justify-center transition cursor-pointer z-20"
        >
          <X size={15} />
        </button>

        {/* Modal Header (Compact & Never Clipped) */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-2.5 pr-8 relative z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-black shrink-0"
            style={{
              background: 'var(--primary-gradient)',
              boxShadow: '0 0 16px var(--neon-cyan-glow)',
            }}
          >
            <Gift size={20} className="text-black" />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--neon-cyan)]/15 border border-[var(--chrome-border)] text-[var(--neon-cyan)] text-[9.5px] font-mono font-black uppercase tracking-wider mb-0.5">
              <Sparkles size={10} />
              <span>${displayAmt} Freeplay Task</span>
              {taskId && <span className="text-white">#{taskId}</span>}
            </div>
            <h2 className="text-sm sm:text-base font-heading font-black text-white m-0 tracking-wide leading-tight">
              FREEPLAY VERIFICATION TASK
            </h2>
            <p className="text-[10.5px] text-slate-300 m-0 leading-snug mt-0.5">
              Complete this 30-second verification task to claim your $
              {displayAmt} freeplay credits!
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {statusMsg && (
          <div
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 text-[11px] font-bold leading-snug ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/75 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/75 border-red-500/50 text-red-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-red-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Step 1: Select Game Platform */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black text-[var(--neon-cyan)] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[var(--neon-cyan)] text-black flex items-center justify-center text-[9.5px] font-black shrink-0">
                1
              </span>
              <span>Select Casino Game Platform:</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {(() => {
                const activeGames = adminGames.map((g) =>
                  cleanGameTitle(g.title)
                );
                return activeGames.map((game) => {
                  const isSelected = selectedGame === game;
                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => setSelectedGame(game)}
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] leading-tight font-black font-heading transition border cursor-pointer text-center truncate ${
                        isSelected
                          ? 'text-black font-black'
                          : 'bg-slate-900/85 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                      style={
                        isSelected
                          ? {
                              background: 'var(--primary-gradient)',
                              boxShadow: '0 0 12px var(--neon-cyan-glow)',
                              border: '1px solid var(--chrome-border)',
                            }
                          : undefined
                      }
                      title={game}
                    >
                      {game}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Step 2: Verification Task Email Dispatch Info */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--chrome-border)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[var(--neon-cyan)] text-black flex items-center justify-center text-[9.5px] font-black shrink-0">
                  2
                </span>
                <span className="text-[10.5px] font-black text-white uppercase tracking-wider">
                  Verification Email Sent
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSendEmail(true)}
                disabled={emailSending || resendCooldown > 0}
                className="text-[10.5px] font-bold text-[var(--neon-cyan)] hover:brightness-125 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  size={11}
                  className={emailSending ? 'animate-spin' : ''}
                />
                <span>
                  {emailSending
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend (${resendCooldown}s)`
                    : 'Resend Email'}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10.5px] text-slate-300 font-mono">
              <span className="truncate">
                Dispatched to:{' '}
                <strong className="text-cyan-300">{targetEmail}</strong>
              </span>
              {taskId && (
                <span>
                  Ref ID: <strong className="text-amber-400">{taskId}</strong>
                </span>
              )}
            </div>

            {/* Compact Instruction Checklist */}
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10.5px] text-slate-200 space-y-1 leading-snug">
              <div className="flex items-start gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                  ✓
                </span>
                <span>
                  Check your <strong>Spam / Junk folder</strong>. If there,
                  click{' '}
                  <strong className="text-emerald-400">
                    &quot;Report Not Spam&quot;
                  </strong>{' '}
                  or <strong>&quot;Move to Inbox&quot;</strong>.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                  ✓
                </span>
                <span>
                  Open your <strong>Primary Inbox</strong> and take a screenshot
                  showing the verification email inside your Inbox.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                  ✓
                </span>
                <span>
                  Upload the screenshot proof below and hit submit!
                </span>
              </div>
            </div>

            <p className="text-[9.5px] text-cyan-300/80 m-0 leading-tight italic">
              🔒 Privacy Tip: You can blur out or draw lines over other personal
              emails in your screenshot.
            </p>
          </div>

          {/* Step 3: Screenshot Upload Proof Dropzone */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black text-cyan-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[9.5px] font-black shrink-0">
                  3
                </span>
                <span>Upload Inbox Screenshot Proof:</span>
              </span>
              <span className="text-[9.5px] text-slate-400 lowercase font-normal">
                png, jpg, or webp
              </span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {!screenshot ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3.5 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-900/55 hover:bg-slate-900/85 transition flex items-center justify-center gap-3 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  {uploading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-black text-white block leading-tight">
                    {uploading
                      ? 'Processing Image...'
                      : 'Click to Upload Inbox Screenshot Proof'}
                  </span>
                  <span className="text-[9.5px] text-slate-400">
                    Supports PNG, JPG, JPEG, or WebP
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/50 bg-[#070514] p-2 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={screenshot}
                    alt="Inbox proof"
                    className="w-16 h-12 object-contain rounded-lg bg-black border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span className="truncate">Proof Attached &amp; Ready</span>
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      Ready for Coins Allotment verification
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10.5px] text-white font-bold cursor-pointer transition"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshot('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-2 py-1 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 hover:bg-red-900 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Trash2 size={11} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-2.5 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              canSubmit
                ? 'cyber-btn-cyan shadow-[0_0_20px_rgba(255,215,0,0.35)] hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>SUBMITTING TASK PROOF...</span>
              </>
            ) : !screenshot ? (
              <>
                <Upload size={14} />
                <span>ATTACH INBOX SCREENSHOT TO SUBMIT</span>
              </>
            ) : (
              <>
                <Gift size={14} />
                <span>
                  SUBMIT TASK &amp; CLAIM ${displayAmt}{' '}
                  FREEPLAY &rarr;
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
