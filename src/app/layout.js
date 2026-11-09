import './globals.css';
import GlobalLiveChat from '@/components/chat/GlobalLiveChat';
import PushNotificationManager from '@/components/common/PushNotificationManager';
import SessionBridge from '@/components/common/SessionBridge';
import GeoRegionGate from '@/components/common/GeoRegionGate';
import RealtimeBridge from '@/components/common/RealtimeBridge';

export const metadata = {
  title: 'Rich Room | VIP Online Gaming & Sweeps Lounge',
  description:
    'Step into the Rich Room — the premier VIP online sweeps lounge. Instant credentials for Ultra Panda, Fire Kirin, Orion Stars, Game Vault, Juwa, and Milky Way with 24/7 automated cashouts.',
  keywords:
    'Rich Room, Richwin, Ultra Panda, Fire Kirin, Orion Stars, Game Vault, Milky Way, Sweeps Casino, Instant Cashout, Cash App, Crypto VIP Gaming',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/favicon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/apple-touch-icon.png',
      },
    ],
  },
  appleWebApp: {
    capable: false,
    statusBarStyle: 'black-translucent',
    title: 'Rich Room',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080704',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rich Room" />
      </head>
      <body className="antialiased selection:bg-[var(--neon-cyan)] selection:text-black">
        <PushNotificationManager />
        <RealtimeBridge />
        <SessionBridge />
        <GeoRegionGate />
        {children}
        <GlobalLiveChat />
      </body>
    </html>
  );
}
