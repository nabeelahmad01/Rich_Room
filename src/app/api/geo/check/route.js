import { NextResponse } from 'next/server';

/** Geo restriction disabled — always allow. */
export async function GET() {
  return NextResponse.json({
    success: true,
    allowed: true,
    country: null,
    usaOnly: false,
  });
}
