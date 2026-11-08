import { NextResponse } from 'next/server';

/** Geo / USA gate removed — all player routes pass through. */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
