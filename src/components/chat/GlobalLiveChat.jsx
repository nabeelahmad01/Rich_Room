'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import LiveChatWidget from './LiveChatWidget';
import { isPlayerSoundEnabled } from '@/lib/notificationsClient';

export default function GlobalLiveChat() {
  const pathname = usePathname();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    const read = () => setSoundOn(isPlayerSoundEnabled());
    read();
    const onToggle = (e) => {
      if (typeof e.detail === 'boolean') setSoundOn(e.detail);
      else read();
    };
    window.addEventListener('paradise-sound-toggle', onToggle);
    return () => window.removeEventListener('paradise-sound-toggle', onToggle);
  }, []);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <LiveChatWidget soundEnabled={soundOn} />;
}
