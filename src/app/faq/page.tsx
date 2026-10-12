import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'FAQ — WordPress audit questions answered',
  description:
    'Answers about free WordPress site audits on wpaudit.pro: what we scan, how long it takes, PDF reports, AEO/GEO checks, and privacy.',
  alternates: { canonical: '/faq' },
};

const faqs = [
  {
    q: 'What does a WordPress site audit check?',
    a: 'wpaudit.pro scores performance, SEO, AEO/GEO, security, technical health, and accessibility. It crawls the homepage plus up to 10 same-origin pages from your sitemap or internal links.',
  },
  {
    q: 'How long does an audit take?',
    a: 'Most audits finish in under 60 seconds. Multi-page crawls and PageSpeed lookups can take a little longer on large or slow sites.',
  },
  {
    q: 'Is the WordPress health report free?',
    a: 'Yes. Instant on-page results are free. Enter your email to receive a PDF report and unlock score history for that site — no login required.',
  },
  {
    q: 'What is AEO and GEO in the audit?',
    a: 'AEO (Answer Engine Optimization) and GEO (Generative Engine Optimization) check whether answer engines and AI crawlers can understand and cite your site — FAQ schema, entity identity, robots rules for AI bots, and answer-first content clarity.',
  },
  {
    q: 'Do you store my email?',
    a: 'Only when you request a PDF report. We use it to send the report, save score history for that URL, and optionally follow up about implementation help. No mailing-list spam.',
  },
  {
    q: 'Can Chris implement the fixes?',
    a: 'Yes. Chris Smith provides technical SEO and Core Web Vitals implementation — not audit-only PDFs. Book through the marketing site linked from every report.',
  },
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${SITE_URL}/faq` },
    ],
  };

  return (
    <div className="px-4 py-14 sm:px-[6%] sm:py-20">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumb} />
      <div className="mx-auto max-w-[720px]">
        <p className="mb-5 flex items-center gap-2 font-mono-brand text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
          <span className="h-px w-5 bg-accent" />
          FAQ
        </p>
        <h1 className="text-[clamp(28px,6vw,40px)] font-semibold tracking-[-0.025em]">
          WordPress audit FAQ
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Direct answers for search and answer engines — and for you before you run a scan.
        </p>
        <dl className="mt-10 space-y-6">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-xl border border-border bg-bg-card p-5">
              <dt>
                <h2 className="text-lg font-semibold text-text">{f.q}</h2>
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
