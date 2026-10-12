import * as cheerio from 'cheerio';
import { assertPublicUrl, normalizeUrl, safeFetch } from '../urls';
import { analyzeAeoGeoHtml, analyzeRobotsAndLlms } from './aeoGeo';
import { discoverPages } from './crawler';
import {
  AuditResult,
  IssueBucket,
  PageSummary,
  clamp,
  emptyIssues,
} from './types';

const PAGESPEED_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

async function fetchPageSpeed(url: string, strategy = 'mobile') {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!key) return null;

  const qs = new URLSearchParams({ url, strategy, key });
  ['performance', 'seo', 'accessibility', 'best-practices'].forEach((c) => qs.append('category', c));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(`${PAGESPEED_ENDPOINT}?${qs}`, { signal: controller.signal });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function scoreFromPsi(psi: {
  lighthouseResult?: {
    categories?: Record<string, { score?: number }>;
    audits?: Record<string, { displayValue?: string; numericValue?: number }>;
  };
}) {
  const c = psi?.lighthouseResult?.categories;
  if (!c) return null;
  const audits = psi.lighthouseResult?.audits || {};
  return {
    performance: Math.round((c.performance?.score ?? 0) * 100),
    seo: Math.round((c.seo?.score ?? 0) * 100),
    accessibility: Math.round((c.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((c['best-practices']?.score ?? 0) * 100),
    metrics: {
      fcp: audits['first-contentful-paint']?.displayValue,
      lcp: audits['largest-contentful-paint']?.displayValue,
      tti: audits['interactive']?.displayValue,
      tbt: audits['total-blocking-time']?.displayValue,
      cls: audits['cumulative-layout-shift']?.displayValue,
    },
  };
}

function mergeIssues(target: IssueBucket, source: IssueBucket) {
  (Object.keys(source) as (keyof IssueBucket)[]).forEach((key) => {
    for (const issue of source[key]) {
      if (!target[key].some((i) => i.title === issue.title)) {
        target[key].push(issue);
      }
    }
  });
}

function analyzeHtml(html: string, url: string, responseHeaders?: Headers) {
  const $ = cheerio.load(html);
  const issues = emptyIssues();

  const title = $('title').first().text().trim();
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1Count = $('h1').length;
  const imgs = $('img');
  const imgsMissingAlt = imgs.filter((_, el) => !$(el).attr('alt')).length;
  const isHttps = url.startsWith('https://');
  const hasWp = /wp-content|wp-includes|wordpress/i.test(html);
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const canonical = $('link[rel="canonical"]').attr('href');
  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const twitterCard = $('meta[name="twitter:card"]').attr('content');
  const hreflang = $('link[rel="alternate"][hreflang]').length;

  let seo = 85;
  if (!title) {
    seo -= 25;
    issues.seo.push({
      severity: 'high',
      title: 'Missing page title',
      detail: 'Add a unique <title> tag (about 50–60 characters).',
      impact: 'high',
      effort: 'easy',
    });
  } else if (title.length < 30 || title.length > 60) {
    seo -= 8;
    issues.seo.push({
      severity: 'medium',
      title: 'Title length',
      detail: `Title is ${title.length} characters (aim for 30–60).`,
      impact: 'medium',
      effort: 'easy',
    });
  }
  if (!metaDesc) {
    seo -= 15;
    issues.seo.push({
      severity: 'medium',
      title: 'Missing meta description',
      detail: 'Add a meta description (150–160 characters) for SERP snippets.',
      impact: 'medium',
      effort: 'easy',
    });
  }
  if (h1Count === 0) {
    seo -= 12;
    issues.seo.push({
      severity: 'high',
      title: 'No H1 heading',
      detail: 'Each page should have one primary H1.',
      impact: 'high',
      effort: 'easy',
    });
  } else if (h1Count > 1) {
    seo -= 6;
    issues.seo.push({
      severity: 'low',
      title: 'Multiple H1 tags',
      detail: `Found ${h1Count} H1 elements.`,
      impact: 'low',
      effort: 'easy',
    });
  }
  if (!canonical) {
    seo -= 5;
    issues.technical.push({
      severity: 'low',
      title: 'No canonical URL',
      detail: 'Add a canonical link to avoid duplicate content issues.',
      impact: 'medium',
      effort: 'easy',
    });
  }
  if (!ogTitle) {
    seo -= 4;
    issues.seo.push({
      severity: 'low',
      title: 'Missing Open Graph tags',
      detail: 'Add og:title (and og:description/image) for social and AI citation previews.',
      impact: 'medium',
      effort: 'easy',
    });
  }
  if (!twitterCard) {
    seo -= 2;
    issues.seo.push({
      severity: 'low',
      title: 'Missing Twitter Card tags',
      detail: 'Add twitter:card meta for consistent link previews.',
      impact: 'low',
      effort: 'easy',
    });
  }
  if (/noindex/i.test(robotsMeta)) {
    seo -= 20;
    issues.seo.push({
      severity: 'critical',
      title: 'Page is noindex',
      detail: 'robots meta contains noindex — search engines will not index this URL.',
      impact: 'high',
      effort: 'easy',
    });
  }
  if (!hreflang) {
    /* informational only for single-locale sites — no score hit */
  }

  let accessibility = 80;
  if (imgs.length && imgsMissingAlt > 0) {
    accessibility -= Math.min(25, imgsMissingAlt * 3);
    issues.accessibility.push({
      severity: imgsMissingAlt > 3 ? 'high' : 'medium',
      title: 'Images missing alt text',
      detail: `${imgsMissingAlt} of ${imgs.length} images lack alt attributes.`,
      impact: 'high',
      effort: 'medium',
    });
  }
  if (!hasViewport) {
    accessibility -= 15;
    issues.accessibility.push({
      severity: 'high',
      title: 'Missing viewport meta',
      detail: 'Required for mobile-friendly rendering.',
      impact: 'high',
      effort: 'easy',
    });
  }
  if (!$('a[href="#main"], a[href="#content"]').length && !$('[id="main"], [id="content"], main').length) {
    accessibility -= 4;
    issues.accessibility.push({
      severity: 'low',
      title: 'Missing skip / main landmark',
      detail: 'Add a skip link and <main> landmark for keyboard users.',
      impact: 'medium',
      effort: 'easy',
    });
  }

  let security = isHttps ? 88 : 45;
  if (!isHttps) {
    issues.security.push({
      severity: 'critical',
      title: 'Site not served over HTTPS',
      detail: 'Migrate to HTTPS for security and SEO.',
      impact: 'high',
      effort: 'medium',
    });
  }

  if (responseHeaders) {
    const checks: [string, string, string][] = [
      ['x-frame-options', 'Missing X-Frame-Options header', 'Add X-Frame-Options to prevent clickjacking.'],
      [
        'x-content-type-options',
        'Missing X-Content-Type-Options header',
        'Add X-Content-Type-Options: nosniff.',
      ],
      [
        'strict-transport-security',
        'Missing HSTS header',
        'Add Strict-Transport-Security to enforce HTTPS.',
      ],
      [
        'content-security-policy',
        'Missing Content Security Policy',
        'Implement a Content-Security-Policy to reduce XSS risk.',
      ],
    ];
    for (const [header, title, detail] of checks) {
      if (!responseHeaders.get(header)) {
        security -= 6;
        issues.security.push({
          severity: 'medium',
          title,
          detail,
          impact: 'medium',
          effort: 'medium',
        });
      }
    }
  }

  let technical = 82;
  if (hasWp) technical += 3;

  const aeo = analyzeAeoGeoHtml($);
  issues.aeo_geo.push(...aeo.issues);

  const technologies: string[] = [];
  if (hasWp) technologies.push('WordPress');
  if (/cloudflare/i.test(responseHeaders?.get('server') || '') || /cf-ray/i.test(responseHeaders?.get('cf-ray') || '')) {
    technologies.push('Cloudflare');
  }
  if (/shopify/i.test(html)) technologies.push('Shopify');
  if (/wp-json/i.test(html)) technologies.push('WP REST API');

  return {
    seo: clamp(seo),
    accessibility: clamp(accessibility),
    security: clamp(security),
    technical: clamp(technical),
    aeo_geo: aeo.score,
    issues,
    meta: {
      title,
      metaDesc,
      h1Count,
      isHttps,
      hasWp,
      canonical,
      technologies,
      hostingHint: responseHeaders?.get('server') || undefined,
    },
  };
}

function basicPerformanceScore(html: string) {
  const kb = Buffer.byteLength(html, 'utf8') / 1024;
  let score = 78;
  if (kb > 500) score -= 15;
  else if (kb > 250) score -= 8;
  return clamp(score);
}

async function softFetchText(url: string): Promise<string | null> {
  try {
    const { html } = await safeFetch(url, { maxBytes: 64_000, timeoutMs: 8_000 });
    return html;
  } catch {
    return null;
  }
}

export async function runAudit(rawUrl: string): Promise<AuditResult> {
  await assertPublicUrl(rawUrl);
  const url = normalizeUrl(rawUrl);
  const home = await safeFetch(url);
  const pagesToCrawl = await discoverPages(home.finalUrl, home.html);

  const issues = emptyIssues();
  const pageSummaries: PageSummary[] = [];
  let seoAcc = 0;
  let accessibilityAcc = 0;
  let securityAcc = 0;
  let technicalAcc = 0;
  let aeoAcc = 0;
  let homeMeta: AuditResult['meta'] | null = null;

  for (let i = 0; i < pagesToCrawl.length; i++) {
    const pageUrl = pagesToCrawl[i];
    const page =
      i === 0
        ? home
        : await safeFetch(pageUrl).catch(() => null);
    if (!page) continue;

    const analysis = analyzeHtml(page.html, page.finalUrl, page.headers);
    mergeIssues(issues, analysis.issues);
    seoAcc += analysis.seo;
    accessibilityAcc += analysis.accessibility;
    securityAcc += analysis.security;
    technicalAcc += analysis.technical;
    aeoAcc += analysis.aeo_geo;

    if (i === 0) homeMeta = analysis.meta;

    pageSummaries.push({
      url: page.finalUrl,
      title: analysis.meta.title || page.finalUrl,
      overall_score: clamp(
        analysis.seo * 0.35 + analysis.accessibility * 0.25 + analysis.technical * 0.2 + analysis.aeo_geo * 0.2
      ),
      seo: analysis.seo,
      accessibility: analysis.accessibility,
      isWordPress: analysis.meta.hasWp,
    });
  }

  const n = Math.max(1, pageSummaries.length);
  let seo = clamp(seoAcc / n);
  let accessibility = clamp(accessibilityAcc / n);
  let security = clamp(securityAcc / n);
  let technical = clamp(technicalAcc / n);
  let aeo_geo = clamp(aeoAcc / n);

  const origin = new URL(home.finalUrl).origin;
  const robotsAeo = await analyzeRobotsAndLlms(origin, softFetchText);
  aeo_geo = clamp(aeo_geo + robotsAeo.scoreDelta);
  issues.aeo_geo.push(...robotsAeo.issues);

  // Sitemap / robots checks for SEO
  const sitemapOk = await softFetchText(new URL('/sitemap.xml', origin).href);
  const wpSitemap = sitemapOk ? null : await softFetchText(new URL('/wp-sitemap.xml', origin).href);
  if (!sitemapOk && !wpSitemap) {
    seo = clamp(seo - 6);
    issues.seo.push({
      severity: 'medium',
      title: 'XML sitemap not found',
      detail: 'Create and submit an XML sitemap to help search engines discover URLs.',
      impact: 'medium',
      effort: 'easy',
    });
  }

  let performance = basicPerformanceScore(home.html);
  let metrics: AuditResult['metrics'];
  let psiScores = null as ReturnType<typeof scoreFromPsi>;
  const psi = await fetchPageSpeed(home.finalUrl);
  if (psi) {
    psiScores = scoreFromPsi(psi);
    if (psiScores?.performance != null) performance = psiScores.performance;
    if (psiScores?.seo != null) seo = clamp((seo + psiScores.seo) / 2);
    if (psiScores?.accessibility != null) accessibility = clamp((accessibility + psiScores.accessibility) / 2);
    if (psiScores?.bestPractices != null) security = clamp((security + psiScores.bestPractices) / 2);
    metrics = psiScores?.metrics;
  } else {
    issues.performance.push({
      severity: 'low',
      title: 'PageSpeed API not configured',
      detail: 'Set GOOGLE_PAGESPEED_API_KEY for Lighthouse-based performance scoring.',
      impact: 'low',
      effort: 'easy',
    });
  }

  if (pageSummaries.length > 1) {
    technical = clamp(technical + 2);
  }

  const overall = clamp(
    performance * 0.22 +
      seo * 0.22 +
      security * 0.16 +
      technical * 0.12 +
      accessibility * 0.12 +
      aeo_geo * 0.16
  );

  return {
    url: home.finalUrl,
    overall_score: overall,
    performance,
    seo,
    security,
    technical,
    accessibility,
    aeo_geo,
    issues_json: issues,
    pages_json: pageSummaries,
    pages_crawled: pageSummaries.length,
    meta: homeMeta || {
      title: '',
      metaDesc: '',
      h1Count: 0,
      isHttps: home.finalUrl.startsWith('https://'),
      hasWp: false,
    },
    metrics,
    source: psiScores ? 'pagespeed+html+multi' : 'html-multi',
  };
}

export { normalizeUrl };
