import { NextResponse } from 'next/server';
import { normalizeUrl } from '@/lib/audit/engine';
import { getSupabase, isDbConfigured } from '@/lib/supabase';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`history:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  const rawUrl = (searchParams.get('url') || '').trim();

  if (!email || !rawUrl || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'email and url are required' }, { status: 400 });
  }

  let websiteUrl: string;
  try {
    websiteUrl = normalizeUrl(rawUrl);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data: leads, error } = await supabase
      .from('leads')
      .select('audit_id, website_url, created_at, audits(id, overall_score, created_at, website_url)')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const host = new URL(websiteUrl).hostname.replace(/^www\./, '');
    const history = (leads || [])
      .map((row) => {
        const audit = Array.isArray(row.audits) ? row.audits[0] : row.audits;
        if (!audit) return null;
        const auditHost = new URL(audit.website_url).hostname.replace(/^www\./, '');
        if (auditHost !== host) return null;
        // Do not return share_token — history is knowledge-gated (email+url), not auth.
        return {
          overall_score: audit.overall_score,
          created_at: audit.created_at,
          website_url: audit.website_url,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, history });
  } catch (err) {
    console.error('[audit/history]', err);
    return NextResponse.json({ error: 'Unable to load history' }, { status: 500 });
  }
}
