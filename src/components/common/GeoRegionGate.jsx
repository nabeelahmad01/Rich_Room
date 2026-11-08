'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function GeoRegionGate() {
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;

    let cancelled = false;

    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get('bypass_geo') === 'true' || sp.get('dev') === 'true') return;

        const res = await fetch('/api/geo/check', { credentials: 'include', cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && data.allowed === false) {
          setCountry(data.country || 'International');
          setBlocked(true);
        }
      } catch {
        /* allow on network failure to avoid false lockouts */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!blocked) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-6 text-center"
      style={{ background: 'var(--bg-deep)', color: '#e2e8f0' }}
    >
      <div
        className="max-w-md w-full p-8 rounded-3xl border border-[var(--chrome-border)]"
        style={{ background: 'var(--bg-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.85)' }}
      >
        <div className="text-4xl mb-4">🇺🇸</div>
        <h1 className="text-xl font-black text-white mb-3 font-heading">United States Players Only</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          Rich Room is available only to eligible users located in the United States. Access from your region
          {country ? ` (${country})` : ''} is not permitted.
        </p>
        <p className="text-[11px] text-slate-500">
          If you are in the US and see this by mistake, disable VPN or contact 24/7 live support.
        </p>
      </div>
    </div>
  );
}
