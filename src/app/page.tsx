import Link from 'next/link';
import { AuditRunner } from '@/components/AuditRunner';
import { MARKETING_URL } from '@/lib/site';

export default function HomePage() {
  return (
    <>
      <section
        className="relative overflow-hidden border-b border-border px-4 pb-16 pt-14 sm:px-[6%] sm:pb-20 sm:pt-20"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% -10%, rgba(0,255,127,0.07) 0%, transparent 60%)',
        }}
      >
        <div className="mx-auto max-w-[720px] text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 font-mono-brand text-[11px] text-accent">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            AI-ready · SEO · AEO · GEO
          </p>
          <h1 className="text-[clamp(32px,7vw,52px)] font-semibold leading-[1.08] tracking-[-0.03em] text-text">
            Audit your WordPress site in under 60 seconds
          </h1>
          <p className="mx-auto mt-4 max-w-[540px] text-[15px] leading-[1.75] text-muted">
            Instant analysis of performance, SEO, AEO/GEO, security, and accessibility — with a multi-page
            crawl and prioritized fixes you can actually ship.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-[640px]">
          <AuditRunner />
        </div>
      </section>

      <section className="border-b border-border px-4 py-16 sm:px-[6%] sm:py-20">
        <div className="mx-auto max-w-[1120px]">
          <p className="mb-5 flex items-center gap-2 font-mono-brand text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
            <span className="h-px w-5 bg-accent" />
            What we check
          </p>
          <h2 className="max-w-[560px] text-[clamp(24px,5vw,36px)] font-semibold leading-tight tracking-[-0.02em]">
            What does a WordPress site audit check?
          </h2>
          <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-muted">
            Six score categories, including answer-engine and generative-engine readiness — not just classic SEO
            checklists.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Performance', 'Core Web Vitals, load signals, and speed opportunities.'],
              ['SEO Health', 'Titles, meta, headings, sitemaps, canonicals, Open Graph.'],
              ['AEO / GEO', 'FAQ schema, entity identity, AI crawler access, answer clarity.'],
              ['Security', 'HTTPS and key security headers.'],
              ['Accessibility', 'Alt text, viewport, landmarks, inclusive basics.'],
              ['Multi-page crawl', 'Homepage plus up to 10 same-origin URLs from sitemap or links.'],
            ].map(([title, desc]) => (
              <article key={title} className="rounded-xl border border-border bg-bg-card p-5">
                <h3 className="text-base font-semibold text-text">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-16 sm:px-[6%] sm:py-20">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[560px]">
            <p className="mb-5 flex items-center gap-2 font-mono-brand text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
              <span className="h-px w-5 bg-accent" />
              EEAT
            </p>
            <h2 className="text-[clamp(24px,5vw,36px)] font-semibold leading-tight tracking-[-0.02em]">
              Built by a technical SEO who ships the fixes
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Chris Smith — Technical SEO &amp; Web Engineer. Free automated audits here; implementation and
              verification when you need the backlog cleared.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/how-it-works"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-border px-5 text-sm font-semibold text-text no-underline hover:border-border-strong"
            >
              How it works
            </Link>
            <a
              href={MARKETING_URL}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-accent px-5 text-sm font-semibold text-black no-underline hover:opacity-85"
            >
              About Chris →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
