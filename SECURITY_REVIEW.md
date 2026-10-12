# Rafter code review walk — API surface

Date: 2026-10-12  
Scope: WP Audit Pro API routes + URL fetcher + persist/email.

## API1 BOLA

- `GET /api/audit/:auditId` — opaque UUID; no PII in response beyond website_url/scores. Acceptable for public audit artifacts; 404 on miss.
- `GET /api/audit/history` — requires email **and** url; filters by hostname match. No cross-email listing.
- Share tokens — 24 hex chars from `randomBytes`; not sequential.

## API2 Authn

- Public by design for run/submit/share/health.
- No passwords/sessions. Service role key server-only.

## API3 BOPLA

- Body allowlists: `url`, `email`, `projectName` only on submit; `url` only on run.
- History query params validated; email lowercased + length/format check.

## API4 Resource consumption

- In-memory per-IP rate limits on run (8/min), submit (5/min), history (20/min).
- Fetch timeouts + 2MB body cap + max 10 crawl pages + max 5 redirects.
- PDF generation best-effort; failures do not fail the whole submit.

## API5 BFLA

- No admin endpoints in v1.

## API6 Business flow abuse

- Submit triggers crawl + optional email — rate-limited per IP. Captcha deferred (document residual risk for Hostinger single-node).

## API7 SSRF

- `assertPublicUrl` + DNS resolve; blocks loopback/RFC1918/link-local/ULA/metadata hosts.
- Redirects re-validated each hop.
- Fixed IPv6 false-positive that blocked public AAAA (e.g. example.com).

## API8 Misconfig

- Generic error messages to clients; stack details only in server logs.
- CORS `*` on submit only (marketing CTA cross-origin); no credentials.
- Security headers via `next.config.ts`.

## API9 Inventory

- Documented in README API table.

## API10 Third parties

- PageSpeed / Resend / Supabase — responses handled with try/catch; keys via env.

## Automated scanners

- `rafter` CLI not installed on this machine; `RAFTER_API_KEY` unset.
- Manual walk + Cursor security-review subagent completed. Install rafter + set API key, then run `rafter run` before production DNS cutover.
- Local secret grep: no hardcoded keys in source (env-only).

## Remediation applied (same session)

- IPv4-mapped IPv6 hex forms (`::ffff:7f00:1`) now classified via dotted conversion; hostname brackets stripped.
- Rate-limit IP uses right-most `X-Forwarded-For` hop (trusted edge).
- History API no longer returns `shareToken` / `auditId`.
- `GET /api/audit/:id` omits `share_token` from the projection.
- `.gitignore` allows committing `.env.example`.
