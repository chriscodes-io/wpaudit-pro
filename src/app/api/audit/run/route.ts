import { NextResponse } from 'next/server';
import { runAudit } from '@/lib/audit/engine';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`run:${ip}`, { limit: 8, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const url = typeof body.url === 'string' ? body.url : '';
    if (!url.trim()) {
      return NextResponse.json({ success: false, error: 'url is required' }, { status: 400 });
    }

    const result = await runAudit(url);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Audit failed';
    const status = /not allowed|private|resolve|required/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
