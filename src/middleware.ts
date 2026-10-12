import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Marketing site opens /?url= — send users to the audit runner. */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  if (url.pathname === '/' && url.searchParams.has('url')) {
    const target = new URL('/audit', request.url);
    target.searchParams.set('url', url.searchParams.get('url') || '');
    return NextResponse.redirect(target);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
