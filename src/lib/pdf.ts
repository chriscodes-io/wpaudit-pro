import fs from 'node:fs';
import path from 'node:path';
import type { IssueBucket } from './audit/types';

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type AuditLike = {
  website_url?: string;
  url?: string;
  overall_score?: number;
  performance?: number;
  seo?: number;
  security?: number;
  technical?: number;
  accessibility?: number;
  aeo_geo?: number;
  pages_crawled?: number;
  issues_json?: IssueBucket;
};

export function renderTemplate(audit: AuditLike): string {
  const templatePath = path.join(process.cwd(), 'src/lib/templates/audit-report.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  const issues = audit.issues_json || ({} as IssueBucket);
  const keys: (keyof IssueBucket)[] = [
    'performance',
    'seo',
    'aeo_geo',
    'security',
    'technical',
    'accessibility',
  ];

  const issueSections = keys
    .map((key) => {
      const list = issues[key] || [];
      if (!list.length) return '';
      const items = list
        .map(
          (i) =>
            `<li><strong>${escapeHtml(i.title)}</strong> (${i.severity}) — ${escapeHtml(i.detail || '')}</li>`
        )
        .join('');
      const label = key === 'aeo_geo' ? 'AEO / GEO' : capitalize(key);
      return `<h3>${label}</h3><ul>${items}</ul>`;
    })
    .join('');

  return template
    .replace(/\{\{url\}\}/g, escapeHtml(audit.website_url || audit.url || ''))
    .replace(/\{\{overall_score\}\}/g, String(audit.overall_score ?? 0))
    .replace(/\{\{performance\}\}/g, String(audit.performance ?? 0))
    .replace(/\{\{seo\}\}/g, String(audit.seo ?? 0))
    .replace(/\{\{aeo_geo\}\}/g, String(audit.aeo_geo ?? 0))
    .replace(/\{\{security\}\}/g, String(audit.security ?? 0))
    .replace(/\{\{technical\}\}/g, String(audit.technical ?? 0))
    .replace(/\{\{accessibility\}\}/g, String(audit.accessibility ?? 0))
    .replace(/\{\{pages_crawled\}\}/g, String(audit.pages_crawled ?? 1))
    .replace(/\{\{generated_at\}\}/g, new Date().toISOString().slice(0, 10))
    .replace(/\{\{issues_html\}\}/g, issueSections || '<p>No critical issues detected in this scan.</p>');
}

export async function generatePdfBuffer(audit: AuditLike): Promise<Buffer | null> {
  const html = renderTemplate(audit);
  let browser: { close: () => Promise<void> } | null = null;

  try {
    const puppeteer = await import('puppeteer-core');
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      (process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : process.platform === 'linux'
          ? '/usr/bin/google-chrome'
          : undefined);

    if (!executablePath) return null;

    browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = await (browser as any).newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    return Buffer.from(pdf);
  } catch (err) {
    console.warn('[pdf] generation failed:', err instanceof Error ? err.message : err);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
