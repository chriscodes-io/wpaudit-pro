import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { getSupabase, isDbConfigured } from '@/lib/supabase';
import { MARKETING_URL, SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ token: string }> };

async function loadAudit(token: string) {
  if (!isDbConfigured() || !/^[a-f0-9]{16,64}$/i.test(token)) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.from('audits').select('*').eq('share_token', token).single();
  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const audit = await loadAudit(token);
  if (!audit) {
    return { title: 'Report not found', robots: { index: false, follow: false } };
  }
  return {
    title: `Audit report — ${audit.overall_score}/100`,
    description: `WordPress health report for ${audit.website_url}: overall ${audit.overall_score}/100.`,
    alternates: { canonical: `/share/${token}` },
    robots: { index: true, follow: true },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const audit = await loadAudit(token);
  if (!audit) notFound();

  const issues = audit.issues_json || {};
  const categories = [
    ['Performance', audit.performance],
    ['SEO', audit.seo],
    ['AEO / GEO', audit.aeo_geo ?? 0],
    ['Security', audit.security],
    ['Technical', audit.technical],
    ['Accessibility', audit.accessibility],
  ] as const;

  const reportLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `WordPress health report for ${audit.website_url}`,
    datePublished: audit.created_at,
    dateModified: audit.updated_at || audit.created_at,
    author: { '@type': 'Person', name: 'Chris Smith', url: MARKETING_URL },
    about: audit.website_url,
    url: `${SITE_URL}/share/${token}`,
  };

  return (
    <div className="px-4 py-14 sm:px-[6%] sm:py-20">
      <JsonLd data={reportLd} />
      <article className="mx-auto max-w-[800px]">
        <p className="font-mono-brand text-[11px] uppercase tracking-[0.1em] text-accent">Shared report</p>
        <h1 className="mt-2 text-[clamp(28px,6vw,40px)] font-semibold tracking-[-0.025em]">
          {audit.overall_score}/100 overall
        </h1>
        <p className="mt-2 break-all font-mono-brand text-[12px] text-muted">{audit.website_url}</p>
        <p className="mt-1 text-[12px] text-muted-2">
          Generated {new Date(audit.created_at).toLocaleString()}
          {audit.pages_crawled ? ` · ${audit.pages_crawled} pages crawled` : ''}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-bg-card p-4">
              <p className="font-mono-brand text-[10px] uppercase tracking-wide text-muted-2">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-accent">{value}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-xl font-semibold">Findings</h2>
        <div className="mt-4 space-y-6">
          {Object.entries(issues).map(([key, list]) => {
            const items = Array.isArray(list) ? list : [];
            if (!items.length) return null;
            return (
              <section key={key}>
                <h3 className="mb-2 text-base font-semibold capitalize text-text">
                  {key === 'aeo_geo' ? 'AEO / GEO' : key}
                </h3>
                <ul className="space-y-2">
                  {items.map((issue: { title: string; detail?: string; severity: string }, i: number) => (
                    <li key={`${issue.title}-${i}`} className="rounded-lg border border-border px-4 py-3">
                      <p className="font-mono-brand text-[10px] text-muted-3">{issue.severity}</p>
                      <p className="text-sm font-medium">{issue.title}</p>
                      <p className="text-[13px] text-muted">{issue.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href={`/audit?url=${encodeURIComponent(audit.website_url)}`}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-accent px-5 text-sm font-semibold text-black no-underline"
          >
            Re-run audit
          </Link>
          <a
            href={MARKETING_URL}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-5 text-sm font-semibold text-text no-underline"
          >
            Get fixes implemented
          </a>
        </div>
      </article>
    </div>
  );
}
