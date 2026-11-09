'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, Upload, AlertCircle, CheckCircle } from 'lucide-react';

export default function KycModal({ isOpen, onClose, user, onKycSubmitted }) {
  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [state, setState] = useState('CA');
  const [ssnLast4, setSsnLast4] = useState('');
  const [idFrontUrl, setIdFrontUrl] = useState('');
  const [idBackUrl, setIdBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName,
          dob,
          state,
          ssnLast4,
          idFrontUrl: idFrontUrl || 'https://richroom.games/kyc/sample-id-front.jpg',
          idBackUrl: idBackUrl || 'https://richroom.games/kyc/sample-id-back.jpg',
          selfieUrl: selfieUrl || 'https://richroom.games/kyc/sample-selfie.jpg',
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSubmitted(true);
        if (onKycSubmitted) onKycSubmitted();
      } else {
        setErrorMsg(data.error);
      }
    } catch {
      setLoading(false);
      setErrorMsg('Failed to submit KYC documents.');
    }
  };

  return (
    <div className="cyber-modal-overlay">
      <div className="modal-scrollable w-full max-w-lg p-5 sm:p-7 bg-[#0e1122] border border-[var(--chrome-border-purple)] rounded-3xl max-h-[92vh] overflow-y-auto relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-black text-white">US Identity Verification</h2>
          <p className="text-xs text-gray-400 mt-1">
            Required for US Sweepstakes Compliance &amp; Instant Cash Redemptions
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle size={40} className="text-emerald-400 mx-auto" />
            <h3 className="text-lg font-black text-white">Documents Submitted!</h3>
            <p className="text-xs text-gray-300">
              Our compliance team reviews documents within 1-2 hours. You will receive an email confirmation once verified.
            </p>
            <button onClick={onClose} className="btn-gold py-2.5 px-6 text-xs font-bold uppercase mt-2">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  placeholder="As on Government ID"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">US State of Residence</label>
                <select value={state} onChange={(e) => setState(e.target.value)}>
                  {['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'AZ', 'CO', 'NJ', 'VA', 'TN', 'IN'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">SSN (Last 4 Digits)</label>
                <input
                  type="password"
                  maxLength="4"
                  placeholder="••••"
                  value={ssnLast4}
                  onChange={(e) => setSsnLast4(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Document Upload Links / Previews */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Government ID (Driver&apos;s License / Passport Front URL)
                </label>
                <input
                  type="text"
                  placeholder="Paste image link or upload..."
                  value={idFrontUrl}
                  onChange={(e) => setIdFrontUrl(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  ID Back Side (URL or upload)
                </label>
                <input
                  type="text"
                  placeholder="Paste image link..."
                  value={idBackUrl}
                  onChange={(e) => setIdBackUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Selfie Holding ID (URL or upload)
                </label>
                <input
                  type="text"
                  placeholder="Paste image link..."
                  value={selfieUrl}
                  onChange={(e) => setSelfieUrl(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold py-3 text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
            >
              <span>{loading ? 'SUBMITTING DOCUMENTS...' : 'SUBMIT FOR VERIFICATION'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
