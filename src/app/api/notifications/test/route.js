import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { sendPushNotification } from '@/lib/fcm';

export async function GET(req) {
  const acceptHeader = req.headers.get('accept') || '';
  const { searchParams } = new URL(req.url);

  // If requested by browser directly as HTML
  if (acceptHeader.includes('text/html') && !searchParams.has('json')) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification Test Station | Rich Room</title>
  <link rel="icon" href="/logo.png">
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #060913;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: #0d1326;
      border: 1px solid rgba(0, 240, 255, 0.35);
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: 0 10px 40px rgba(0, 240, 255, 0.2);
    }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      margin-bottom: 16px;
      border: 1px solid #00f0ff;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 8px 0;
      color: #ffffff;
      letter-spacing: 0.5px;
    }
    p {
      color: #94a3b8;
      font-size: 13px;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, #00f0ff, #00b4d8);
      color: #000000;
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: none;
      cursor: pointer;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
      transition: transform 0.1s ease;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .status {
      margin-top: 18px;
      font-size: 12px;
      color: #10b981;
      min-height: 20px;
      font-weight: bold;
    }
    .back {
      margin-top: 24px;
      display: inline-block;
      color: #00f0ff;
      font-size: 13px;
      text-decoration: none;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo.png" alt="Logo" class="logo" />
    <h1>🎰 Mobile Push & Chrome Test</h1>
    <p>Apne phone ke notification bar aur lockscreen par instant test notification dekhne ke liye neeche button dabayein.</p>

    <div id="permBadge" style="display:inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-bottom: 16px; background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.3); color: #00f0ff;">
      Checking notification permission...
    </div>

    <button id="testBtn" class="btn" onclick="fireNotification()">
      ⚡ Fire Test Push Notification
    </button>

    <div id="statusBox" class="status">Ready</div>

    <!-- On-screen preview toast -->
    <div id="cyberToast" style="display:none; margin-top:20px; padding:16px; border-radius:16px; background: linear-gradient(135deg, rgba(14,10,36,0.95), rgba(22,13,56,0.95)); border: 1px solid #00f0ff; box-shadow: 0 0 25px rgba(0,240,255,0.4); text-align:left;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
        <img src="/logo.png" style="width:28px; height:28px; border-radius:6px; border:1px solid #00f0ff;" />
        <div>
          <div style="font-weight:900; color:#00f0ff; font-size:13px;">🎰 VIP Flash Coin Drop Activated!</div>
          <div style="color:#94a3b8; font-size:10px;">RICH ROOM • NOW</div>
        </div>
      </div>
      <div style="font-size:12px; color:#ffffff; line-height:1.4;">
        5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!
      </div>
    </div>

    <a href="/" class="back">← Back to Rich Room</a>
  </div>

  <script>
    function updatePermBadge() {
      const badge = document.getElementById('permBadge');
      if (!('Notification' in window)) {
        badge.innerText = '❌ Notifications not supported in this browser';
        badge.style.color = '#ef4444';
        badge.style.borderColor = '#ef4444';
        return;
      }
      if (Notification.permission === 'granted') {
        badge.innerText = '🟢 Browser Permission: GRANTED (Push Active)';
        badge.style.color = '#10b981';
        badge.style.borderColor = '#10b981';
        badge.style.background = 'rgba(16,185,129,0.1)';
      } else if (Notification.permission === 'denied') {
        badge.innerText = '🔴 Browser Permission: BLOCKED in Chrome (Click lock icon next to URL to Allow)';
        badge.style.color = '#ef4444';
        badge.style.borderColor = '#ef4444';
        badge.style.background = 'rgba(239,68,68,0.15)';
      } else {
        badge.innerText = '🟡 Browser Permission: DEFAULT (Will prompt on click)';
        badge.style.color = '#f59e0b';
        badge.style.borderColor = '#f59e0b';
        badge.style.background = 'rgba(245,158,11,0.1)';
      }
    }
    updatePermBadge();

    function playAlertChime() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.12); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.25); // C6
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch (e) {}
    }

    async function fireNotification() {
      const status = document.getElementById('statusBox');
      const toast = document.getElementById('cyberToast');
      status.style.color = '#00f0ff';
      status.innerText = 'Requesting permission & triggering alert...';

      try {
        // 1. Request permission if not already granted
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          updatePermBadge();
          if (perm !== 'granted') {
            status.style.color = '#ef4444';
            status.innerText = '⚠️ Chrome notification blocked! Click the tune/lock icon in address bar to Allow.';
            return;
          }
        }

        // 2. Play sci-fi audio alert
        playAlertChime();

        // 3. Show glowing cyberpunk on-screen card
        toast.style.display = 'block';

        const notifTitle = '🎰 VIP Flash Coin Drop Activated!';
        const notifBody = '5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!';
        const notifOptions = {
          body: notifBody,
          icon: '/logo.png',
          badge: '/logo.png',
          vibrate: [300, 100, 300],
          tag: 'pp-alert-' + Date.now(),
          renotify: true,
          requireInteraction: true,
          data: { url: '/wallet' },
          actions: [
            { action: 'open', title: 'Claim / View' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        };

        // 4. Trigger Service Worker Notification (Android Mobile Drawer & Lockscreen)
        let swDispatched = false;
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
              await reg.showNotification(notifTitle, notifOptions);
              swDispatched = true;
            }
          } catch (swErr) {
            console.warn('SW notification notice:', swErr);
          }
        }

        // 5. Desktop Chrome / macOS / Windows native Notification constructor
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notifTitle, {
              body: notifBody,
              icon: '/logo.png',
              tag: 'pp-desktop-' + Date.now(),
            });
          }
        } catch (desktopErr) {
          console.warn('Desktop Notification constructor notice:', desktopErr);
        }

        // 6. Multicast to server & FCM devices
        const res = await fetch('/api/notifications/test?json=true', { method: 'POST' });
        const resData = await res.json().catch(() => ({}));

        status.style.color = '#10b981';
        status.innerText = '✓ Success! Native push alert fired (Check notification bar & lockscreen).';
      } catch (err) {
        status.style.color = '#ef4444';
        status.innerText = 'Error: ' + err.message;
      }
    }

    // Auto-fire on page load after short delay
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          fireNotification();
        }
      }, 500);
    });
  </script>
</body>
</html>`;
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return handleTestNotification(req);
}

export async function POST(req) {
  return handleTestNotification(req);
}

async function handleTestNotification(req) {
  try {
    let bodyData = {};
    try {
      bodyData = await req.json();
    } catch {}

    const { searchParams } = new URL(req.url);

    const title =
      bodyData.title ||
      searchParams.get('title') ||
      '🎰 VIP Flash Coin Drop Activated!';
    const message =
      bodyData.message ||
      searchParams.get('message') ||
      '5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!';
    const targetUrl = bodyData.url || searchParams.get('url') || '/promotions';

    const db = await getDb();
    const notifsCol = db.collection('notifications');

    const testItem = {
      title,
      message,
      target: 'all',
      channel: 'all',
      segment: 'all',
      url: targetUrl,
      type: 'broadcast',
      sentBy: 'System Test Desk',
      createdAt: new Date(),
    };

    const result = await notifsCol.insertOne(testItem);

    // Multicast FCM push to all registered devices & topics
    const fcmResult = await sendPushNotification({
      broadcast: true,
      title,
      body: message,
      data: { url: targetUrl },
    }).catch((err) => {
      console.warn('FCM broadcast notice:', err.message);
      return { success: false, error: err.message };
    });

    return NextResponse.json({
      success: true,
      message: 'Test notification created and broadcasted.',
      id: result.insertedId.toString(),
      notification: testItem,
      fcm: fcmResult,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
