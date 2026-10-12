import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/supabase';
import { isEmailConfigured } from '@/lib/email';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'wpaudit-pro',
    db: isDbConfigured(),
    email: isEmailConfigured(),
    pagespeed: Boolean(process.env.GOOGLE_PAGESPEED_API_KEY),
    time: new Date().toISOString(),
  });
}
