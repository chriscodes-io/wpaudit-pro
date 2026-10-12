'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, Loader2, Search, Shield } from 'lucide-react';
import type { AuditResult, Issue } from '@/lib/audit/types';
import { MARKETING_URL } from '@/lib/site';

type Phase = 'idle' | 'running' | 'done' | 'error';

const STEPS = ['Crawl', 'Detect', 'Score', 'Prioritise'] as const;

function ScoreCard({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'text-accent' : value >= 60 ? 'text-yellow-400' : 'text-danger';
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <p className="font-mono-brand text-[10px] uppercase tracking-[0.08em] text-muted-2">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function IssueList({ title, items }: { title: string; items: Issue[] }) {
  if (!items.length) return null;
  return (
    <section className="mb-8">
      <h3 className="mb-3 text-lg font-semibold text-text">{title}</h3>
      <ul className="space-y-2">
        {items.map((issue) => (
          <li
            key={`${issue.title}-${issue.severity}`}
            className="rounded-lg border border-border bg-bg-elevated px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-brand text-[10px] uppercase tracking-wide text-muted">
                {issue.severity}
              </span>
              {issue.impact && (
                <span className="font-mono-brand text-[10px] uppercase tracking-wide text-muted-3">
                  impact:{issue.impact}
                </span>
              )}
              {issue.effort && (
                <span className="font-mono-brand text-[10px] uppercase tracking-wide text-muted-3">
                  effort:{issue.effort}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-text">{issue.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{issue.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AuditRunner({ initialUrl = '' }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [pdfSending, setPdfSending] = useState(false);
  const [pdfSent, setPdfSent] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [history, setHistory] = useState<{ overall_score: number; created_at: string }[]>([]);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      setStepIdx((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 1800);
    return () => window.clearInterval(id);
  }, [phase]);

  const prioritized = useMemo(() => {
    if (!result) return [];
    const all = Object.values(result.issues_json).flat();
    const weight = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...all].sort((a, b) => weight[a.severity] - weight[b.severity]);
  }, [result]);

  const run = useCallback(async () => {
    if (!url.trim()) {
      setError('Enter a website URL to audit.');
      return;
    }
    setError('');
    setPdfSent(false);
    setPdfError('');
    setHistory([]);
    setPhase('running');
    setStepIdx(0);
    setResult(null);
    try {
      const res = await fetch('/api/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Audit failed');
      }
      setResult(data.result);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
      setPhase('error');
    }
  }, [url]);

  useEffect(() => {
    if (initialUrl?.trim()) {
      void run();
    }
    // intentionally only on mount with initialUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendPdf = async () => {
    if (!email.trim() || !url.trim()) {
      setPdfError('Email is required for the PDF report.');
      return;
    }
    setPdfSending(true);
    setPdfError('');
    try {
      const res = await fetch('/api/audit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.success !== true) {
        throw new Error(data.error || 'Could not send report');
      }
      setPdfSent(true);
      const hist = await fetch(
        `/api/audit/history?email=${encodeURIComponent(email.trim())}&url=${encodeURIComponent(url.trim())}`
      );
      const histData = await hist.json();
      if (histData.success) setHistory(histData.history || []);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setPdfSending(false);
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-6">
        <label htmlFor="audit-url" className="font-mono-brand text-[11px] uppercase tracking-[0.07em] text-muted">
          Website URL
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="audit-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yoursite.com"
            disabled={phase === 'running'}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-4 py-[13px] font-mono-brand text-base text-text outline-none placeholder:text-muted-3 focus:border-accent/30 sm:text-sm disabled:opacity-60"
          />
          <button
            type="button"
            onClick={run}
            disabled={phase === 'running'}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-[22px] text-sm font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {phase === 'running' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
                Start Analysis
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {phase === 'running' && (
        <div className="mt-8 rounded-xl border border-border bg-bg-card p-6" aria-live="polite">
          <p className="font-mono-brand text-[11px] uppercase tracking-[0.1em] text-accent">Running audit</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-4">
            {STEPS.map((step, i) => (
              <li
                key={step}
                className={`rounded-lg border px-3 py-3 text-sm ${
                  i <= stepIdx
                    ? 'border-accent/35 bg-accent-dim text-accent'
                    : 'border-border text-muted-3'
                }`}
              >
                <span className="font-mono-brand text-[10px]">0{i + 1}</span>
                <p className="mt-1 font-medium">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 animate-pulse-soft text-[13px] text-muted">
            Crawling up to 10 pages · checking SEO, AEO/GEO, security, performance…
          </p>
        </div>
      )}

      {result && phase === 'done' && (
        <div className="mt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono-brand text-[11px] uppercase tracking-[0.1em] text-accent">Audit results</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                {result.overall_score}/100 overall
              </h2>
              <p className="mt-1 break-all font-mono-brand text-[12px] text-muted">{result.url}</p>
              <p className="mt-1 text-[12px] text-muted-2">
                {result.pages_crawled} page{result.pages_crawled === 1 ? '' : 's'} crawled · {result.source}
              </p>
            </div>
          </div>

          {!result.meta.hasWp && (
            <div className="mb-6 rounded-xl border border-yellow-500/25 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-200/90">
              <strong className="font-semibold">Not clearly WordPress.</strong> Some WordPress-specific checks may
              not apply. Detected: {(result.meta.technologies || []).join(', ') || 'unknown stack'}.
            </div>
          )}

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <ScoreCard label="Performance" value={result.performance} />
            <ScoreCard label="SEO" value={result.seo} />
            <ScoreCard label="AEO / GEO" value={result.aeo_geo} />
            <ScoreCard label="Security" value={result.security} />
            <ScoreCard label="Technical" value={result.technical} />
            <ScoreCard label="Accessibility" value={result.accessibility} />
          </div>

          {result.metrics && (
            <section className="mb-8">
              <h3 className="mb-3 text-lg font-semibold">Core Web Vitals signals</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['FCP', result.metrics.fcp],
                  ['LCP', result.metrics.lcp],
                  ['TTI', result.metrics.tti],
                  ['TBT', result.metrics.tbt],
                  ['CLS', result.metrics.cls],
                ].map(([k, v]) =>
                  v ? (
                    <div key={k} className="rounded-lg border border-border bg-bg-card px-3 py-3">
                      <p className="font-mono-brand text-[10px] text-muted-2">{k}</p>
                      <p className="mt-1 text-sm font-medium text-text">{v}</p>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}

          {result.pages_json.length > 1 && (
            <section className="mb-8">
              <h3 className="mb-3 text-lg font-semibold">Pages crawled</h3>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {result.pages_json.map((p) => (
                  <li key={p.url} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">{p.title || p.url}</p>
                      <p className="truncate font-mono-brand text-[11px] text-muted-2">{p.url}</p>
                    </div>
                    <span className="font-mono-brand text-sm text-accent">{p.overall_score}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <IssueList title="AEO / GEO" items={result.issues_json.aeo_geo} />
          <IssueList title="SEO" items={result.issues_json.seo} />
          <IssueList title="Performance" items={result.issues_json.performance} />
          <IssueList title="Security" items={result.issues_json.security} />
          <IssueList title="Technical" items={result.issues_json.technical} />
          <IssueList title="Accessibility" items={result.issues_json.accessibility} />

          <section className="mb-10">
            <h3 className="mb-2 text-lg font-semibold">
              Prioritized recommendations ({prioritized.length})
            </h3>
            <p className="mb-4 text-[13px] text-muted">
              Sorted by severity. Start with high-impact, easier fixes.
            </p>
            <ol className="space-y-2">
              {prioritized.slice(0, 16).map((issue, idx) => (
                <li key={`${issue.title}-${idx}`} className="rounded-lg border border-border px-4 py-3">
                  <span className="font-mono-brand text-[10px] text-muted-3">{String(idx + 1).padStart(2, '0')}</span>
                  <p className="text-sm font-medium text-text">{issue.title}</p>
                  <p className="text-[13px] text-muted">{issue.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-accent/25 bg-accent-dim p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-text">Want a detailed PDF report?</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              We&apos;ll email the full report, save score history for this site, and send a shareable link. No
              spam.
            </p>
            {pdfSent ? (
              <div className="mt-4 flex items-start gap-2 text-sm text-accent">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                Report queued for {email}. Check your inbox shortly.
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-4 py-3 text-sm text-text outline-none focus:border-accent/30"
                />
                <button
                  type="button"
                  onClick={sendPdf}
                  disabled={pdfSending}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-black disabled:opacity-60"
                >
                  {pdfSending ? 'Sending…' : 'Email me the PDF →'}
                </button>
              </div>
            )}
            {pdfError && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                {pdfError}
              </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-3">
              <Shield className="h-3 w-3" />
              We only use your email for this report and optional follow-up.
            </p>
          </section>

          {history.length > 0 && (
            <section className="mt-8">
              <h3 className="mb-3 text-lg font-semibold">Score history</h3>
              <ul className="space-y-2">
                {history.map((h) => (
                  <li
                    key={`${h.created_at}-${h.overall_score}`}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm"
                  >
                    <span className="text-muted">{new Date(h.created_at).toLocaleString()}</span>
                    <span className="font-mono-brand text-accent">{h.overall_score}/100</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10 rounded-xl border border-border bg-bg-card p-6 text-center">
            <h3 className="text-xl font-semibold">Want the fixes shipped?</h3>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">
              Chris implements technical SEO and Core Web Vitals fixes — not just the report.
            </p>
            <a
              href={MARKETING_URL}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-black no-underline hover:opacity-85"
            >
              Book implementation →
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
