'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SpinWheelPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center text-slate-400 font-sub">
      Redirecting to Game Lobby...
    </div>
  );
}
