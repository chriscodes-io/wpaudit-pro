import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { MARKETING_URL, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'How WordPress audits work',
  description:
    'How wpaudit.pro crawls, detects, scores, and prioritises WordPress site issues — including SEO, AEO/GEO, security, and Core Web Vitals.',
  alternates: { canonical: '/how-it-works' },
};

export default function HowItWorksPage() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'How it works', item: `${SITE_URL}/how-it-works` },
    ],
  };

  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Chris Smith',
    jobTitle: 'Technical SEO · Web Engineer',
    url: MARKETING_URL,
  };

  return (
    <div className="px-4 py-14 sm:px-[6%] sm:py-20">
      <JsonLd data={breadcrumb} />
      <JsonLd data={person} />
      <article className="mx-auto max-w-[720px]">
        <p className="mb-5 flex items-center gap-2 font-mono-brand text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
          <span className="h-px w-5 bg-accent" />
          Process
        </p>
        <h1 className="text-[clamp(28px,6vw,40px)] font-semibold tracking-[-0.025em]">
          How does a WordPress audit work?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          You enter a URL. We crawl, detect blockers, score six categories, and return a prioritized backlog —
          optionally emailed as a PDF with score history.
        </p>

        <h2 className="mt-12 text-xl font-semibold">1. What happens when you start an analysis?</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          We fetch your homepage safely (SSRF-guarded), discover up to 10 same-origin pages from sitemap.xml or
          internal links, then score each page&apos;s HTML signals. If configured, Google PageSpeed Insights adds
          Lighthouse performance and CWV metrics for the homepage.
        </p>

        <h2 className="mt-10 text-xl font-semibold">2. Which score categories are included?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] text-muted">
          <li>Performance — load and Core Web Vitals signals</li>
          <li>SEO — titles, meta, headings, indexability, social tags</li>
          <li>AEO / GEO — structured data, FAQ patterns, AI crawler access, entity clarity</li>
          <li>Security — HTTPS and response headers</li>
          <li>Technical — crawl/render hygiene and platform signals</li>
          <li>Accessibility — alt text, viewport, landmarks</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold">3. How do prioritized recommendations work?</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Findings are sorted by severity (critical → low) with optional impact and effort hints so engineering
          knows what to ship first — not a 200-line wishlist.
        </p>

        <h2 className="mt-10 text-xl font-semibold">4. Who builds and maintains wpaudit.pro?</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Chris Smith, Technical SEO &amp; Web Engineer. The free tool surfaces issues; paid engagements implement
          and verify fixes in Search Console and field data.
        </p>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/audit"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-accent px-5 text-sm font-semibold text-black no-underline"
          >
            Run a free audit
          </Link>
          <a
            href={MARKETING_URL}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-5 text-sm font-semibold text-text no-underline"
          >
            Work with Chris
          </a>
        </div>
      </article>
    </div>
  );
}
