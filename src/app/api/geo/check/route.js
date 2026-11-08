import { NextResponse } from 'next/server';

const ALLOWED = new Set(['US', 'PR', 'GU', 'VI', 'MP', 'AS']);

function countryFromHeaders(req) {
  return (
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cloudfront-viewer-country') ||
    req.headers.get('x-country-code') ||
    ''
  )
    .toUpperCase()
    .trim();
}

function clientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '';
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  return (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

async function lookupCountryByIp(ip) {
  if (!ip || isPrivateIp(ip)) return '';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country_code/`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'RichRoom-GeoCheck/1.0' },
    });
    clearTimeout(timer);
    if (!res.ok) return '';
    const code = (await res.text()).trim().toUpperCase();
    return code.length === 2 ? code : '';
  } catch {
    return '';
  }
}

export async function GET(req) {
  try {
    let country = countryFromHeaders(req);
    const ip = clientIp(req);

    if (!country && ip && !isPrivateIp(ip)) {
      country = await lookupCountryByIp(ip);
    }

    let allowed = false;
    if (country) {
      allowed = ALLOWED.has(country);
    } else if (isPrivateIp(ip)) {
      allowed = true;
    } else if (process.env.NODE_ENV !== 'production') {
      allowed = true;
    }

    return NextResponse.json({
      success: true,
      country: country || null,
      allowed,
      usaOnly: true,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, allowed: true, error: error.message },
      { status: 500 }
    );
  }
}
