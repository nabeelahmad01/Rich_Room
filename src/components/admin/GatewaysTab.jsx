'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  QrCode
} from 'lucide-react';

export default function GatewaysTab({
  methods = [],
  onSaveGateway,
  onDeleteGateway,
}) {
  const [gatewaySearch, setGatewaySearch] = useState('');

  // Modal State for Add or Edit Gateway
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState(null);
  const [gatewayForm, setGatewayForm] = useState({
    name: '',
    subtitle: '',
    tag: '',
    phone: '',
    theme: 'cashapp',
    isWithdrawActive: true,
    redirectUrl: '',
    qrImage: '',
    instructions: '',
    minDeposit: 10,
    maxDeposit: 5000,
  });

  const filteredGateways = methods.filter((g) => {
    const q = gatewaySearch.toLowerCase();
    const matchName = (g.name || '').toLowerCase().includes(q);
    const matchTag = (g.tag || g.identifierTag || '').toLowerCase().includes(q);
    const matchSubtitle = (g.subtitle || '').toLowerCase().includes(q);
    return matchName || matchTag || matchSubtitle;
  });

  const handleOpenAdd = () => {
    setEditingGateway(null);
    setGatewayForm({
      name: '',
      subtitle: 'Instant 0% Fee Deposit',
      tag: '',
      phone: '',
      theme: 'cashapp',
      isWithdrawActive: true,
      redirectUrl: '',
      qrImage: '',
      instructions: 'Put your username only in note',
      minDeposit: 10,
      maxDeposit: 5000,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (gt) => {
    setEditingGateway(gt);
    setGatewayForm({
      name: gt.name || '',
      subtitle: gt.subtitle || '',
      tag: gt.tag || gt.identifierTag || '',
      phone: gt.phone || '',
      theme: gt.theme || 'cashapp',
      isWithdrawActive: gt.isWithdrawActive !== undefined ? !!gt.isWithdrawActive : true,
      redirectUrl: gt.redirectUrl || '',
      qrImage: gt.qrImage || gt.qrCodeUrl || '',
      instructions: gt.instructions || '',
      minDeposit: gt.minDeposit || 10,
      maxDeposit: gt.maxDeposit || 5000,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSaveGateway({
      id: editingGateway?.id || editingGateway?._id,
      ...gatewayForm,
    });
    setModalOpen(false);
  };

  const handleDelete = async (gt) => {
    if (!window.confirm(`Are you sure you want to delete payment gateway ${gt.name}?`)) return;
    await onDeleteGateway(gt.id || gt._id);
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-sm md:text-base text-white tracking-wider flex items-center gap-2">
            <CreditCard size={20} className="text-[var(--neon-cyan)]" />
            PAYMENT GATEWAYS MANAGER
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure merchant cashtags, player transfer instructions, cashout eligibility, and deposit limits.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-heading font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.35)] transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>ADD NEW GATEWAY</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/90 border border-amber-500/20 backdrop-blur-xl">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={gatewaySearch}
            onChange={(e) => setGatewaySearch(e.target.value)}
            placeholder="Search payment gateways by name, handle tag, or description..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none"
          />
        </div>
      </div>

      {/* Gateways Master Table */}
      <div className="rounded-2xl border border-amber-500/20 bg-[var(--bg-deep)] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/90 bg-[#060814] text-slate-400 text-[10px] font-heading font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Gateway Name</th>
                <th className="py-3 px-4">Subtitle Description</th>
                <th className="py-3 px-4">Payment Handle Tag</th>
                <th className="py-3 px-3">Contact Info</th>
                <th className="py-3 px-3 text-center">Visual Theme</th>
                <th className="py-3 px-3 text-center">Cashout</th>
                <th className="py-3 px-4">Pay Redirect URL</th>
                <th className="py-3 px-3 text-center">QR Image</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredGateways.map((gt) => (
                <tr key={gt.id || gt._id} className="hover:bg-slate-900/40 transition-colors">
                  {/* Gateway Name */}
                  <td className="py-3.5 px-4 font-heading font-bold text-white">
                    {gt.name}
                  </td>

                  {/* Subtitle */}
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    {gt.subtitle || '—'}
                  </td>

                  {/* Handle Tag */}
                  <td className="py-3.5 px-4 font-mono font-bold text-[var(--neon-cyan)]">
                    {gt.tag || gt.identifierTag || '—'}
                  </td>

                  {/* Phone / Contact */}
                  <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                    {gt.phone || '—'}
                  </td>

                  {/* Visual Theme Badge */}
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-950 border border-slate-800 text-amber-300">
                      {gt.theme || 'cashapp'}
                    </span>
                  </td>

                  {/* Cashout Eligibility */}
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        gt.isWithdrawActive
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {gt.isWithdrawActive ? 'CASHOUT ON' : 'DEPOSIT ONLY'}
                    </span>
                  </td>

                  {/* Pay Redirect URL */}
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    {gt.redirectUrl ? (
                      <a
                        href={gt.redirectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--neon-cyan)] hover:text-amber-300 inline-flex items-center gap-1 max-w-[140px] truncate"
                        title={gt.redirectUrl}
                      >
                        <span>{gt.redirectUrl}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* QR Image Link */}
                  <td className="py-3.5 px-3 text-center">
                    {gt.qrImage ? (
                      <div className="inline-flex items-center gap-1.5">
                        <img
                          src={gt.qrImage}
                          alt="QR"
                          className="w-7 h-7 rounded-md object-contain bg-white border border-slate-700 inline-block"
                        />
                        <span className="text-[10px] text-emerald-400 font-bold">Active</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-[10px]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(gt)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                        title="Edit Gateway"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(gt)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                        title="Delete Gateway"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredGateways.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    <CreditCard size={28} className="mx-auto opacity-30 text-[var(--neon-cyan)] mb-2" />
                    <p className="font-heading text-sm">No payment gateways match criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Gateway Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-[#0a0d1f] border border-amber-500/40 rounded-3xl p-6 shadow-[0_0_60px_rgba(255,215,0,0.25)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[var(--neon-cyan)] flex items-center justify-center font-bold">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-white text-sm">
                    {editingGateway ? 'EDIT PAYMENT GATEWAY' : 'ADD NEW PAYMENT GATEWAY'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure parameters shown to players</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Gateway Name</label>
                  <input
                    type="text"
                    required
                    value={gatewayForm.name}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                    placeholder="e.g. Cash App Fast, Chime Instant"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Subtitle Description</label>
                  <input
                    type="text"
                    value={gatewayForm.subtitle}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, subtitle: e.target.value })}
                    placeholder="e.g. Instant 0% Fee Deposit"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Payment Handle Tag</label>
                  <input
                    type="text"
                    required
                    value={gatewayForm.tag}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, tag: e.target.value })}
                    placeholder="$Cashtag or payment address"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Phone / Contact Info</label>
                  <input
                    type="text"
                    value={gatewayForm.phone}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, phone: e.target.value })}
                    placeholder="e.g. (555) 019-2834"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Visual Theme</label>
                  <select
                    value={gatewayForm.theme}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, theme: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="cashapp">Cash App (Green)</option>
                    <option value="chime">Chime (Emerald)</option>
                    <option value="zelle">Zelle (Purple)</option>
                    <option value="venmo">Venmo (Blue)</option>
                    <option value="crypto">Crypto (Gold/Orange)</option>
                    <option value="applepay">Apple Pay (Dark)</option>
                    <option value="paypal">PayPal (Cyan)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Cashout Allowed?</label>
                  <select
                    value={gatewayForm.isWithdrawActive ? 'true' : 'false'}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, isWithdrawActive: e.target.value === 'true' })}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="true">YES - Allow On Withdrawals (CASHOUT ON)</option>
                    <option value="false">NO - Deposit Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Direct Pay Redirect URL</label>
                <input
                  type="text"
                  value={gatewayForm.redirectUrl}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, redirectUrl: e.target.value })}
                  placeholder="https://cash.app/$..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">QR Code Image Link / URL</label>
                <input
                  type="text"
                  value={gatewayForm.qrImage}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, qrImage: e.target.value })}
                  placeholder="https://... or /images/qr.png"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Transfer Note Instructions for User</label>
                <input
                  type="text"
                  value={gatewayForm.instructions}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, instructions: e.target.value })}
                  placeholder="Include your username only in note"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Min Deposit ($)</label>
                  <input
                    type="number"
                    value={gatewayForm.minDeposit}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, minDeposit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Max Deposit ($)</label>
                  <input
                    type="number"
                    value={gatewayForm.maxDeposit}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, maxDeposit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,215,0,0.4)] cursor-pointer"
                >
                  <Save size={14} />
                  <span>SAVE GATEWAY DETAILS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
