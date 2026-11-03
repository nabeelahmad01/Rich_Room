import { NextResponse } from 'next/server';

// Allowed USA Country Codes (US and US Territories)
const ALLOWED_COUNTRIES = new Set(['US', 'PR', 'GU', 'VI', 'MP', 'AS']);

export function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;

  // 1. Always allow static assets, API, and internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png'
  ) {
    return NextResponse.next();
  }

  // 2. Allow dev bypass query or local environment
  if (searchParams.get('bypass_geo') === 'true' || searchParams.get('dev') === 'true') {
    return NextResponse.next();
  }

  // Check headers provided by reverse proxies (Cloudflare, Vercel, AWS CloudFront, Hostgator, etc.)
  const country = (
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cloudfront-viewer-country') ||
    req.headers.get('x-country-code') ||
    ''
  ).toUpperCase().trim();

  const ip = (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    ''
  ).trim();

  // If local/dev IP or running on localhost, permit
  const isLocal =
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.31.');

  if (isLocal) {
    return NextResponse.next();
  }

  // If geo header is present and country is NOT USA
  if (country && !ALLOWED_COUNTRIES.has(country)) {
    // Return USA Sweepstakes Compliance Block Screen
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Region Restricted • Rich Room VIP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: #070913;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: radial-gradient(circle at top, #131a38 0%, #0a0d1f 100%);
      border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 24px;
      padding: 48px 32px;
      max-width: 520px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 240, 255, 0.15);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 26px;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .footer-note {
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
    }
    .flag {
      font-size: 40px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="flag">🇺🇸</div>
    <div class="badge">United States Only</div>
    <h1>Access Restricted Outside USA</h1>
    <p>
      Rich Room VIP is operated exclusively for eligible residents of the <strong>United States</strong> in compliance with federal and state sweepstakes laws. Access from your region (${country || 'International'}) is currently unavailable.
    </p>
    <div class="footer-note">
      If you are a United States resident traveling or believe this is an error, please ensure location services are enabled or contact VIP Concierge support.
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 403,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
