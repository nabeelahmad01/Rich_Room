'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, HeartHandshake, Zap, Trophy, Download } from 'lucide-react';

export default function CyberFooter() {
  return (
    <footer className="w-full mt-16 border-t border-[var(--chrome-border)]/60 bg-[#04060e] text-slate-400 pt-12 pb-28 xl:pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Top Brand Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1 & 2: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-[var(--neon-cyan)] shadow-[0_0_15px_rgba(255,215,0,0.4)]"
                style={{ position: 'relative', width: '48px', height: '48px', minWidth: '48px', flexShrink: 0 }}
              >
                <Image src="/logo.png" alt="Rich Room" fill className="object-cover" />
              </div>
              <div>
                <span className="font-heading font-black text-lg text-white">
                  RICH<span className="text-[var(--neon-cyan)]">ROOM</span>
                </span>
                <p className="text-[10px] tracking-widest text-slate-500 font-sub font-semibold">
                  VIP GAMING & SWEEPSTAKES LOUNGE
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Rich Room is America&apos;s premier VIP online sweeps destination. Official credentials for Ultra Panda, Fire Kirin, Orion Stars, and Game Vault with instant Cash App and Crypto redemptions.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                100% SECURE
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-500/40">
                24/7 SUPPORT
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/40">
                INSTANT PAYOUTS
              </span>
            </div>
          </div>

          {/* Col 3: Games */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
              GAMES PLATFORMS
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/games?category=sweeps" className="hover:text-[var(--neon-cyan)] transition-colors">Ultra Panda</Link></li>
              <li><Link href="/games?category=fish" className="hover:text-[var(--neon-cyan)] transition-colors">Fire Kirin</Link></li>
              <li><Link href="/games?category=sweeps" className="hover:text-[var(--neon-cyan)] transition-colors">Orion Stars</Link></li>
              <li><Link href="/games?category=sweeps" className="hover:text-[var(--neon-cyan)] transition-colors">Game Vault 999</Link></li>
              <li><Link href="/games?category=slots" className="hover:text-[var(--neon-cyan)] transition-colors">Panda 777 Cyber Slots</Link></li>
              <li><Link href="/games?category=crash" className="hover:text-[var(--neon-cyan)] transition-colors">Cyber Matrix Crash</Link></li>
            </ul>
          </div>

          {/* Col 4: Platform & Support */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
              VIP SERVICES
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/wallet" className="hover:text-[var(--neon-cyan)] transition-colors">Cashier & Deposit</Link></li>
              <li><Link href="/withdraw" className="hover:text-[var(--neon-cyan)] transition-colors">Instant Redemptions</Link></li>
              <li><Link href="/promotions" className="hover:text-[var(--neon-cyan)] transition-colors">VIP Crown Rewards</Link></li>
              <li><Link href="/spin-wheel" className="hover:text-[var(--neon-cyan)] transition-colors">Daily Wheel Spin</Link></li>
              <li><Link href="/how-to-play" className="hover:text-[var(--neon-cyan)] transition-colors">How To Play</Link></li>
            </ul>
          </div>

          {/* Col 5: Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
              POLICY & RULES
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/rules" className="hover:text-[var(--neon-cyan)] transition-colors">Official Sweepstakes Rules</Link></li>
              <li><Link href="/terms" className="hover:text-[var(--neon-cyan)] transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--neon-cyan)] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/responsible-gaming" className="hover:text-[var(--neon-cyan)] transition-colors">Responsible Gaming</Link></li>
              <li><Link href="/chat" className="hover:text-[var(--neon-cyan)] transition-colors">24/7 Live Concierge</Link></li>
            </ul>
          </div>
        </div>

        {/* Gateways & Disclaimer Banner */}
        <div className="pt-8 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-sub font-bold text-slate-300">ACCEPTED PAYMENT METHODS:</span>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">Cash App</span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">Zelle</span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">Chime</span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">Bitcoin / USDT</span>
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">Apple Pay</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center font-bold text-rose-400 text-xs">
                21+
              </span>
              <span className="text-xs text-slate-400">
                NO PURCHASE NECESSARY TO ENTER OR WIN.
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Rich Room is operated in full compliance with United States promotional sweepstakes regulations. Sweeps Coins (SC) may be redeemed for legal tender prizes subject to identity verification and account standing. Void where prohibited by law.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-900">
            <span>© 2026 Rich Room. All rights reserved.</span>
            <span>Version 1.0 • Web VIP Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
