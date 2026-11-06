'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, MessageSquare, Clock, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import CyberNavbar from '@/components/navigation/CyberNavbar';
import CyberSidebar from '@/components/navigation/CyberSidebar';
import CyberMobileBottomNav from '@/components/navigation/CyberMobileBottomNav';
import CyberFooter from '@/components/common/CyberFooter';

export default function ContactPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col">
      <CyberSidebar
        collapsed={false}
        setCollapsed={() => {}}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        user={null}
        onOpenWallet={() => router.push('/wallet')}
        onOpenGameRequest={() => router.push('/')}
        onOpenChat={() => {}}
        onOpenDailyBonus={() => {}}
      />

      <div className="flex-1 flex flex-col xl:pl-64">
        <CyberNavbar
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          user={null}
          onOpenAuth={() => router.push('/')}
          onOpenWallet={() => router.push('/wallet')}
          onOpenDailyBonus={() => {}}
          onOpenNotifications={() => {}}
          onLogout={() => {}}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 xl:pb-10 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-sub font-bold text-[var(--neon-cyan)]">GET IN TOUCH</span>
            <h1 className="text-3xl font-black font-heading text-white">24/7 VIP SUPPORT DESK</h1>
            <p className="text-xs text-slate-400">Our customer service team is standing by 24 hours a day, 7 days a week.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-center">
              <Mail size={24} className="mx-auto text-[var(--neon-cyan)]" />
              <h3 className="font-heading font-bold text-sm text-white">Email Support</h3>
              <p className="text-xs text-slate-400 font-mono">support@playersparadisehub.com</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-center">
              <MessageSquare size={24} className="mx-auto text-[var(--neon-purple-light)]" />
              <h3 className="font-heading font-bold text-sm text-white">Live VIP Chat</h3>
              <p className="text-xs text-slate-400">Available 24/7 via the floating launcher</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-center">
              <Clock size={24} className="mx-auto text-emerald-400" />
              <h3 className="font-heading font-bold text-sm text-white">Average Response</h3>
              <p className="text-xs text-slate-400 font-mono">Under 2 minutes</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 max-w-xl mx-auto">
            {sent ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
                <h3 className="font-heading font-bold text-lg text-white">Message Dispatched!</h3>
                <p className="text-xs text-slate-400">Our support staff has received your ticket and will respond to your email within minutes.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">YOUR NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="cyber-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="cyber-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">SUBJECT</label>
                  <input
                    type="text"
                    required
                    placeholder="Deposit assistance, Game ID question, etc."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="cyber-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-sub font-bold text-slate-300 mb-1">MESSAGE</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="cyber-input"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full cyber-btn-cyan py-3 rounded-xl font-heading font-bold text-xs"
                >
                  <Send size={15} />
                  <span>SUBMIT INQUIRY</span>
                </button>
              </form>
            )}
          </div>
        </main>

        <CyberFooter />
      </div>

      <CyberMobileBottomNav user={null} onOpenAuth={() => {}} onOpenWallet={() => router.push('/wallet')} onOpenGameRequest={() => router.push('/')} />
    </div>
  );
}
