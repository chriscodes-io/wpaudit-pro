import * as cheerio from 'cheerio';
import { safeFetch, sameOrigin } from '../urls';

const MAX_PAGES = 10;

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const abs = new URL(href, baseUrl).href.split('#')[0];
      if (sameOrigin(abs, baseUrl)) urls.add(abs);
    } catch {
      /* skip */
    }
  });
  return [...urls];
}

async function urlsFromSitemap(origin: string): Promise<string[]> {
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];
  const found: string[] = [];

  for (const path of candidates) {
    try {
      const { html } = await safeFetch(new URL(path, origin).href, { maxBytes: 512_000 });
      const locs = [...html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
      for (const loc of locs) {
        if (sameOrigin(loc, origin)) found.push(loc);
        if (found.length >= MAX_PAGES) return found;
      }
      if (found.length) return found;
    } catch {
      /* try next */
    }
  }
  return found;
}

export async function discoverPages(homeUrl: string, homeHtml: string): Promise<string[]> {
  const origin = new URL(homeUrl).origin;
  const ordered: string[] = [homeUrl];
  const seen = new Set(ordered);

  const fromSitemap = await urlsFromSitemap(origin);
  for (const u of fromSitemap) {
    if (!seen.has(u)) {
      seen.add(u);
      ordered.push(u);
    }
    if (ordered.length >= MAX_PAGES) return ordered.slice(0, MAX_PAGES);
  }

  const fromLinks = extractLinks(homeHtml, homeUrl);
  for (const u of fromLinks) {
    if (!seen.has(u)) {
      seen.add(u);
      ordered.push(u);
    }
    if (ordered.length >= MAX_PAGES) break;
  }

  return ordered.slice(0, MAX_PAGES);
}

export { MAX_PAGES };
