export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type Issue = {
  severity: Severity;
  title: string;
  detail: string;
  impact?: 'high' | 'medium' | 'low';
  effort?: 'easy' | 'medium' | 'hard';
};

export type IssueBucket = {
  performance: Issue[];
  seo: Issue[];
  security: Issue[];
  technical: Issue[];
  accessibility: Issue[];
  aeo_geo: Issue[];
};

export type PageSummary = {
  url: string;
  title: string;
  overall_score: number;
  seo: number;
  accessibility: number;
  isWordPress: boolean;
};

export type AuditResult = {
  url: string;
  overall_score: number;
  performance: number;
  seo: number;
  security: number;
  technical: number;
  accessibility: number;
  aeo_geo: number;
  issues_json: IssueBucket;
  pages_json: PageSummary[];
  pages_crawled: number;
  meta: {
    title: string;
    metaDesc: string;
    h1Count: number;
    isHttps: boolean;
    hasWp: boolean;
    canonical?: string;
    technologies?: string[];
    hostingHint?: string;
  };
  metrics?: {
    fcp?: string;
    lcp?: string;
    tti?: string;
    tbt?: string;
    cls?: string;
  };
  source: string;
};

export function emptyIssues(): IssueBucket {
  return {
    performance: [],
    seo: [],
    security: [],
    technical: [],
    accessibility: [],
    aeo_geo: [],
  };
}

export function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
