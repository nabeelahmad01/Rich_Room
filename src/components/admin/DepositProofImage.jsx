'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * Loads /api/payments/deposit/proof (and external URLs) with credentials for admin preview.
 */
export default function DepositProofImage({ src, alt = 'Payment proof', style, className, onFatalError }) {
  const [resolvedSrc, setResolvedSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let revoked = null;
    let cancelled = false;

    const fail = () => {
      if (cancelled) return;
      setFailed(true);
      setLoading(false);
      onFatalError?.();
    };

    const run = async () => {
      setFailed(false);
      setLoading(true);
      setResolvedSrc(null);

      const raw = String(src || '').trim();
      if (!raw) {
        fail();
        return;
      }

      if (raw.startsWith('data:')) {
        setResolvedSrc(raw);
        setLoading(false);
        return;
      }

      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        setResolvedSrc(raw);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(raw, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) {
          fail();
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        if (!blob.size || !blob.type.startsWith('image/')) {
          fail();
          return;
        }
        const obj = URL.createObjectURL(blob);
        revoked = obj;
        setResolvedSrc(obj);
        setLoading(false);
      } catch {
        fail();
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src, onFatalError]);

  if (loading) {
    return (
      <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (failed || !resolvedSrc) {
    return (
      <div
        id="receipt-image-fallback"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: '24px',
          color: '#94A3B8',
          textAlign: 'center',
          ...(style || {}),
        }}
      >
        <AlertCircle size={32} color="#F59E0B" />
        <p style={{ margin: 0, fontSize: '12.5px', color: '#F1F5F9', fontWeight: 700 }}>
          Image proof preview unavailable
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>
          Proof missing on server or upload still processing — ask player to re-upload from Wallet.
        </p>
        {src && (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--neon-cyan)', fontSize: '11.5px', marginTop: '6px', textDecoration: 'underline' }}
          >
            Retry open in new tab ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}