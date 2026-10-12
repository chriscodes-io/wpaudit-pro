import type { Issue } from './types';
import { clamp } from './types';

// cheerio root API (load result)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioAPI = any;

const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Anthropic-AI',
  'Google-Extended',
  'PerplexityBot',
  'Bytespider',
  'CCBot',
];

export type AeoGeoAnalysis = {
  score: number;
  issues: Issue[];
};

function parseJsonLd($: CheerioAPI): object[] {
  const blocks: object[] = [];
  $('script[type="application/ld+json"]').each((_i: number, el: unknown) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else if (parsed && typeof parsed === 'object') blocks.push(parsed);
    } catch {
      /* ignore invalid JSON-LD */
    }
  });
  return blocks;
}

function typesIn(blocks: object[]): Set<string> {
  const types = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const obj = node as Record<string, unknown>;
    const t = obj['@type'];
    if (typeof t === 'string') types.add(t);
    if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && types.add(x));
    if (obj['@graph']) walk(obj['@graph']);
  };
  blocks.forEach(walk);
  return types;
}

export function analyzeAeoGeoHtml($: CheerioAPI): AeoGeoAnalysis {
  const issues: Issue[] = [];
  let score = 72;

  const blocks = parseJsonLd($);
  const types = typesIn(blocks);

  const wanted = ['FAQPage', 'HowTo', 'Organization', 'WebSite', 'Person'];
  const found = wanted.filter((t) => types.has(t));
  if (!found.length) {
    score -= 18;
    issues.push({
      severity: 'medium',
      title: 'No AEO-friendly structured data',
      detail: 'Add FAQPage, Organization, WebSite, or HowTo JSON-LD so answer engines can cite your content.',
      impact: 'high',
      effort: 'medium',
    });
  } else {
    score += Math.min(12, found.length * 3);
  }

  if (!types.has('FAQPage')) {
    const qHeadings = $('h2, h3')
      .toArray()
      .filter((el: unknown) => /\?$/.test($(el).text().trim()));
    if (qHeadings.length >= 2) {
      score += 4;
      issues.push({
        severity: 'low',
        title: 'FAQ-style headings without FAQPage schema',
        detail: `Found ${qHeadings.length} question-shaped headings. Mark them up with FAQPage JSON-LD for AEO.`,
        impact: 'medium',
        effort: 'easy',
      });
    } else {
      score -= 8;
      issues.push({
        severity: 'low',
        title: 'No FAQ content pattern detected',
        detail: 'Question-and-answer sections help AI answer engines extract clear citations.',
        impact: 'medium',
        effort: 'medium',
      });
    }
  }

  const h1 = $('h1').first().text().trim();
  const firstP = $('main p, article p, p').first().text().trim();
  if (h1 && firstP && firstP.length < 40) {
    score -= 6;
    issues.push({
      severity: 'low',
      title: 'Thin opening answer',
      detail: 'Lead with a direct 1–2 sentence answer under the H1 for AEO clarity.',
      impact: 'medium',
      effort: 'easy',
    });
  } else if (h1 && firstP && firstP.length >= 60) {
    score += 4;
  }

  if (!types.has('Organization') && !types.has('Person')) {
    score -= 6;
    issues.push({
      severity: 'medium',
      title: 'Missing entity identity schema',
      detail: 'Add Organization or Person JSON-LD with sameAs links for GEO entity clarity.',
      impact: 'medium',
      effort: 'easy',
    });
  }

  const ogSite = $('meta[property="og:site_name"]').attr('content');
  if (!ogSite) {
    score -= 3;
    issues.push({
      severity: 'low',
      title: 'Missing og:site_name',
      detail: 'Consistent site name helps generative engines attribute your brand.',
      impact: 'low',
      effort: 'easy',
    });
  }

  return { score: clamp(score), issues };
}

export async function analyzeRobotsAndLlms(
  origin: string,
  fetchText: (url: string) => Promise<string | null>
): Promise<{ scoreDelta: number; issues: Issue[] }> {
  const issues: Issue[] = [];
  let scoreDelta = 0;

  const robots = await fetchText(new URL('/robots.txt', origin).href);
  if (!robots) {
    scoreDelta -= 4;
    issues.push({
      severity: 'low',
      title: 'robots.txt not found',
      detail: 'Publish a robots.txt that allows search and AI crawlers you want citing you.',
      impact: 'medium',
      effort: 'easy',
    });
  } else {
    const blocked = AI_BOTS.filter((bot) => {
      const re = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*/`, 'i');
      return re.test(robots);
    });
    if (blocked.length) {
      scoreDelta -= 12;
      issues.push({
        severity: 'medium',
        title: 'AI crawlers blocked in robots.txt',
        detail: `Blocking ${blocked.join(', ')} reduces GEO visibility in generative answers.`,
        impact: 'high',
        effort: 'easy',
      });
    } else {
      scoreDelta += 4;
    }
  }

  const llms = await fetchText(new URL('/llms.txt', origin).href);
  const aiTxt = llms ? null : await fetchText(new URL('/ai.txt', origin).href);
  if (llms || aiTxt) {
    scoreDelta += 6;
  } else {
    scoreDelta -= 2;
    issues.push({
      severity: 'low',
      title: 'No llms.txt found',
      detail: 'Optional but useful: publish /llms.txt summarizing your product for AI crawlers.',
      impact: 'low',
      effort: 'easy',
    });
  }

  return { scoreDelta, issues };
}
