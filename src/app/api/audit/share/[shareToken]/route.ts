import { NextResponse } from 'next/server';
import { renderTemplate } from '@/lib/pdf';
import { getSupabase, isDbConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ shareToken: string }> }) {
  if (!isDbConfigured()) {
    return new NextResponse('Database not configured', { status: 503 });
  }

  const { shareToken } = await context.params;
  if (!/^[a-f0-9]{16,64}$/i.test(shareToken)) {
    return new NextResponse('Audit not found', { status: 404 });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('audits').select('*').eq('share_token', shareToken).single();
    if (error || !data) return new NextResponse('Audit not found', { status: 404 });

    const html = renderTemplate(data);
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : 'Error', { status: 500 });
  }
}
