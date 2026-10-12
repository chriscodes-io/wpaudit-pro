import type { Metadata } from 'next';
import { AuditRunner } from '@/components/AuditRunner';

export const metadata: Metadata = {
  title: 'Run a WordPress site audit',
  description:
    'Start a free WordPress health audit — multi-page crawl with SEO, AEO/GEO, performance, security, and accessibility scores.',
  alternates: { canonical: '/audit' },
  robots: { index: true, follow: true },
};

type Props = { searchParams: Promise<{ url?: string }> };

export default async function AuditPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialUrl = typeof params.url === 'string' ? params.url : '';

  return (
    <div className="px-4 py-14 sm:px-[6%] sm:py-20">
      <div className="mx-auto max-w-[800px]">
        <p className="mb-5 flex items-center gap-2 font-mono-brand text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
          <span className="h-px w-5 bg-accent" />
          Live audit
        </p>
        <h1 className="text-[clamp(28px,6vw,40px)] font-semibold tracking-[-0.025em]">
          Run your WordPress audit
        </h1>
        <p className="mt-3 max-w-[540px] text-[15px] leading-relaxed text-muted">
          Paste a URL to crawl up to 10 pages and score performance, SEO, AEO/GEO, security, and accessibility.
        </p>
        <div className="mt-8">
          <AuditRunner initialUrl={initialUrl} />
        </div>
      </div>
    </div>
  );
}
