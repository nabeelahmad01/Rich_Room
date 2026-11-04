'use client';

import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function SettingsTab({
  settings = {},
  onSaveSettings,
}) {
  const [form, setForm] = useState({
    siteName: settings.siteName || 'Rich Room',
    welcomeBonusSC: settings.welcomeBonusSC || 5.0,
    dailyBonusSC: settings.dailyBonusSC || 1.0,
    minWithdrawal: settings.minWithdrawal || 25.0,
    maintenanceMode: !!settings.maintenanceMode,
    supportEmail: settings.supportEmail || 'support@richroom.games',
    telegramSupport: settings.telegramSupport || '@RichRoomSupport',
    whatsappSupport: settings.whatsappSupport || '+1 (555) 727-2347',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', text: '' });
    try {
      await onSaveSettings?.(form);
      setFeedback({ type: 'success', text: 'System configuration saved successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#090d22]/90 border border-cyan-500/20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="font-heading font-black text-lg text-white">SYSTEM & PLATFORM CONFIGURATION</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure player bonuses, redemption thresholds, support handles, and emergency maintenance.
            </p>
          </div>
        </div>
      </div>

      {feedback.text && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-2.5 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[#090d22]/90 border border-slate-800 space-y-6">
        {/* General Settings */}
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
            General Branding & Thresholds
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Platform Brand Title</label>
            <input
              type="text"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Welcome Bonus (SC)</label>
              <input
                type="number"
                step="0.5"
                value={form.welcomeBonusSC}
                onChange={(e) => setForm({ ...form, welcomeBonusSC: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Daily Mystery Bonus (SC)</label>
              <input
                type="number"
                step="0.5"
                value={form.dailyBonusSC}
                onChange={(e) => setForm({ ...form, dailyBonusSC: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Min Redemption (SC)</label>
              <input
                type="number"
                step="1"
                value={form.minWithdrawal}
                onChange={(e) => setForm({ ...form, minWithdrawal: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Support Handles */}
        <div className="space-y-4 pt-2">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-purple-400 border-b border-slate-800 pb-2">
            Support Channels & Official Handles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Official Support Email</label>
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Telegram Handle</label>
              <input
                type="text"
                value={form.telegramSupport}
                onChange={(e) => setForm({ ...form, telegramSupport: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp Hotline</label>
              <input
                type="text"
                value={form.whatsappSupport}
                onChange={(e) => setForm({ ...form, whatsappSupport: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
          <div>
            <div className="font-bold text-xs text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={15} /> Emergency Maintenance Mode
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              When enabled, non-admin visitors see a high-tech maintenance banner.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, maintenanceMode: !form.maintenanceMode })}
            className={`cursor-pointer ${form.maintenanceMode ? 'text-rose-400' : 'text-slate-600'}`}
          >
            {form.maintenanceMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.35)] transition-all cursor-pointer disabled:opacity-50"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          <span>SAVE SYSTEM SETTINGS</span>
        </button>
      </form>
    </div>
  );
}
