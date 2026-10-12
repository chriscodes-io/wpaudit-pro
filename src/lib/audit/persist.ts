import { randomBytes } from 'node:crypto';
import { SITE_URL } from '../site';
import { getSupabase, isDbConfigured } from '../supabase';
import { generatePdfBuffer } from '../pdf';
import { sendAuditReportEmail } from '../email';
import type { AuditResult } from './types';

export function makeShareToken(): string {
  return randomBytes(12).toString('hex');
}

export function shareLink(token: string): string {
  return `${SITE_URL}/share/${token}`;
}

export async function persistAudit(result: AuditResult) {
  if (!isDbConfigured()) {
    throw new Error('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  }

  const supabase = getSupabase();
  const shareToken = makeShareToken();

  const { data: auditRow, error: auditErr } = await supabase
    .from('audits')
    .insert({
      website_url: result.url,
      overall_score: result.overall_score,
      performance: result.performance,
      seo: result.seo,
      security: result.security,
      technical: result.technical,
      accessibility: result.accessibility,
      aeo_geo: result.aeo_geo,
      issues_json: result.issues_json,
      pages_json: result.pages_json,
      pages_crawled: result.pages_crawled,
      share_token: shareToken,
    })
    .select()
    .single();

  if (auditErr) throw auditErr;
  return { auditRow, shareToken, shareLink: shareLink(shareToken) };
}

export async function persistLeadAndEmail({
  result,
  email,
  projectName,
}: {
  result: AuditResult;
  email: string;
  projectName?: string | null;
}) {
  const { auditRow, shareToken, shareLink: link } = await persistAudit(result);
  const supabase = getSupabase();

  const { error: leadErr } = await supabase.from('leads').upsert(
    {
      email: email.trim().toLowerCase(),
      website_url: result.url,
      audit_id: auditRow.id,
      project_name: projectName || null,
      status: 'new',
    },
    { onConflict: 'email,website_url' }
  );

  if (leadErr) throw leadErr;

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generatePdfBuffer({
      ...auditRow,
      website_url: result.url,
      aeo_geo: result.aeo_geo,
      pages_crawled: result.pages_crawled,
      issues_json: result.issues_json,
    });
  } catch (pdfErr) {
    console.warn('[pdf] generation failed:', pdfErr instanceof Error ? pdfErr.message : pdfErr);
  }

  try {
    await sendAuditReportEmail({
      to: email.trim(),
      url: result.url,
      overallScore: result.overall_score,
      shareLink: link,
      pdfBuffer,
    });
  } catch (mailErr) {
    console.error('[email] send failed:', mailErr instanceof Error ? mailErr.message : mailErr);
  }

  return {
    auditId: auditRow.id as string,
    shareToken,
    shareLink: link,
    scores: {
      overall: result.overall_score,
      performance: result.performance,
      seo: result.seo,
      security: result.security,
      technical: result.technical,
      accessibility: result.accessibility,
      aeo_geo: result.aeo_geo,
    },
  };
}
