'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Apple,
  Download,
  CheckCircle2,
  Sparkles,
  Share,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function DownloadAppView() {
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    {
      q: 'Is the Players Paradise Hub Android APK safe to install?',
      a: 'Yes, our official release APK is cryptographically signed and scanned for security. You can download and install it directly with zero bloatware or third-party ads.'
    },
    {
      q: 'How do I install the APK on Android?',
      a: 'After clicking Download APK, open your notification drawer or Downloads folder, tap players-paradise.apk, and select "Allow from this source" if prompted by Android security settings.'
    },
    {
      q: 'How do I add the app to my iPhone / iPad (iOS)?',
      a: 'Open our site in Safari, tap the Share icon (square with arrow) at the bottom, scroll down and tap "Add to Home Screen". A dedicated app icon will appear on your iOS home screen.'
    },
    {
      q: 'Do I get push notifications for new credits and game IDs?',
      a: 'Yes! Both the Android APK and iOS Progressive Web App support real-time push notifications whenever staff credits your balance or delivers your game credentials.'
    }
  ];

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] text-xs font-heading font-bold">
          <Sparkles size={14} />
          <span>OFFICIAL MOBILE EDITION 2026</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading text-white">
          DOWNLOAD <span className="text-[var(--neon-cyan)]">PLAYERS PARADISE</span> APP
        </h1>
        <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Experience ultra-fast loading, full-screen gaming, and push notifications for deposits, cashouts, and new game platform credentials.
        </p>
      </div>

      {/* Dual Download Cards: Android & iOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ANDROID CARD */}
        <div className="p-8 rounded-3xl border-2 border-[var(--neon-cyan)]/60 bg-gradient-to-b from-[#0c1533] to-[#060814] relative overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.25)] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--neon-cyan)] text-black flex items-center justify-center font-black shadow-[0_0_20px_rgba(0,240,255,0.6)]">
              <Smartphone size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-2xl text-white">Android Direct APK</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  V1.0 STABLE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Direct installation for all Samsung, Google Pixel, Motorola, and Android phones & tablets.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-300 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Instant full-screen gameplay (Ultra Panda, Fire Kirin)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Push notifications for deposits and game credentials</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Zero bloatware • Cryptographically signed</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="/download/players-paradise.apk"
              download="players-paradise.apk"
              className="w-full py-4 rounded-2xl cyber-btn-cyan font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.5)] cursor-pointer"
            >
              <Download size={18} />
              <span>DOWNLOAD ANDROID APK</span>
            </a>
            <div className="text-[11px] text-center text-slate-500 font-mono">
              APK Size: ~6.4 MB • Android 8.0+ • Optimized Ultra-Fast
            </div>
          </div>
        </div>

        {/* IOS CARD */}
        <div className="p-8 rounded-3xl border-2 border-[var(--neon-purple)]/60 bg-gradient-to-b from-[#170e30] to-[#060814] relative overflow-hidden shadow-[0_0_40px_rgba(192,38,211,0.25)] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--neon-purple)] text-white flex items-center justify-center font-black shadow-[0_0_20px_rgba(192,38,211,0.6)]">
              <Apple size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-2xl text-white">Apple iOS Web App</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--neon-purple)]/30 text-[var(--neon-purple-light)] border border-[var(--neon-purple)]/40">
                  SAFARI PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Add directly to Home Screen on your iPhone & iPad with zero App Store restrictions.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-300 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--neon-purple-light)]" />
                <span>Runs standalone with no browser address bar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--neon-purple-light)]" />
                <span>Smooth 120Hz ProMotion animations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--neon-purple-light)]" />
                <span>Instant 1-tap launch from your iPhone home screen</span>
              </div>
            </div>
          </div>

          {/* iOS Step instructions */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
            <div className="font-heading font-bold text-white text-[11px] flex items-center gap-1.5">
              <Share size={14} className="text-[var(--neon-cyan)]" />
              <span>HOW TO INSTALL ON IPHONE:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] font-sans">
              <li>Open this page in Safari browser.</li>
              <li>Tap the Share icon at the bottom.</li>
              <li>Scroll down and tap &quot;Add to Home Screen&quot;.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-4 max-w-3xl mx-auto pt-6">
        <h3 className="font-heading font-black text-xl text-center text-white mb-6">FREQUENTLY ASKED QUESTIONS</h3>
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all"
          >
            <button
              onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              className="w-full p-4 text-left font-heading font-bold text-sm text-white flex items-center justify-between gap-4 cursor-pointer"
            >
              <span>{faq.q}</span>
              {activeFaq === idx ? <ChevronUp size={16} className="text-[var(--neon-cyan)]" /> : <ChevronDown size={16} />}
            </button>
            {activeFaq === idx && (
              <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
