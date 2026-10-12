import { NextResponse } from 'next/server';
import { getSupabase, isDbConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ auditId: string }> }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { auditId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(auditId)) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('audits')
      .select(
        'id, website_url, overall_score, performance, seo, security, technical, accessibility, aeo_geo, issues_json, pages_json, pages_crawled, created_at, updated_at'
      )
      .eq('id', auditId)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }
}
