import { NextResponse } from 'next/server';
import { runAudit } from '@/lib/audit/engine';
import { persistLeadAndEmail } from '@/lib/audit/persist';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 120;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`submit:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const projectName = typeof body.projectName === 'string' ? body.projectName.trim() : undefined;

    if (!url || !email) {
      return NextResponse.json({ success: false, error: 'url and email are required' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ success: false, error: 'invalid email' }, { status: 400 });
    }

    const result = await runAudit(url);
    const saved = await persistLeadAndEmail({ result, email, projectName });

    return NextResponse.json({
      success: true,
      auditId: saved.auditId,
      shareLink: saved.shareLink,
      shareToken: saved.shareToken,
      scores: saved.scores,
    });
  } catch (err) {
    console.error('[audit/submit]', err);
    const message = err instanceof Error ? err.message : 'Audit failed';
    const status = /not allowed|private|resolve|required|Database not configured/i.test(message)
      ? /Database/.test(message)
        ? 503
        : 400
      : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
