import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google.com',
]);

function stripIpBrackets(ip: string): string {
  return ip.startsWith('[') && ip.endsWith(']') ? ip.slice(1, -1) : ip;
}

/** Expand ::ffff:7f00:1 → 127.0.0.1 when possible. */
function ipv4MappedToDotted(normalized: string): string | null {
  const dotted = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (dotted) return dotted[1];

  const hex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hex) return null;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
}

function isPrivateIp(ip: string): boolean {
  const cleaned = stripIpBrackets(ip.trim());
  const version = net.isIP(cleaned);
  if (!version) return true;

  if (version === 6) {
    const normalized = cleaned.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;

    const mapped = ipv4MappedToDotted(normalized);
    if (mapped) return isPrivateIp(mapped);

    // Unique local (fc00::/7), link-local (fe80::/10)
    if (
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }
    return false;
  }

  const parts = cleaned.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) throw new Error('URL is required');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URLs with credentials are not allowed');
  }
  return parsed.href;
}

export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const href = normalizeUrl(rawUrl);
  const parsed = new URL(href);
  const hostname = stripIpBrackets(parsed.hostname.toLowerCase());

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('URL host is not allowed');
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('Private IP addresses are not allowed');
    return parsed;
  }

  let addresses: string[] = [];
  try {
    const result = await dns.lookup(hostname, { all: true, verbatim: true });
    addresses = result.map((r) => r.address);
  } catch {
    throw new Error('Could not resolve hostname');
  }

  if (!addresses.length || addresses.some(isPrivateIp)) {
    throw new Error('URL resolves to a private or blocked address');
  }

  return parsed;
}

export async function safeFetch(
  rawUrl: string,
  options: { method?: string; maxBytes?: number; timeoutMs?: number } = {}
): Promise<{ html: string; finalUrl: string; headers: Headers; status: number }> {
  let current = (await assertPublicUrl(rawUrl)).href;
  let redirects = 0;
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_BODY_BYTES;

  while (redirects <= MAX_REDIRECTS) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(current, {
        method: options.method || 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WPAuditPro/1.0 (+https://wpaudit.pro)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) throw new Error('Redirect without Location header');
        current = new URL(location, current).href;
        redirects += 1;
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${current}`);
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > maxBytes) {
        throw new Error('Response body too large');
      }

      return {
        html: buf.toString('utf8'),
        finalUrl: res.url || current,
        headers: res.headers,
        status: res.status,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('Too many redirects');
}

export function sameOrigin(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin === ub.origin;
  } catch {
    return false;
  }
}
