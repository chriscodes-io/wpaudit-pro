# Secure design decisions — WP Audit Pro

Recorded before implementation (rafter-secure-design).

## Data classification

| Field | Class | Handling |
|-------|--------|----------|
| Lead email | Identifier / PII | Lowercase store; required for submit/history; never logged in full in production errors |
| website_url | Content | Normalized HTTPS URL; SSRF-validated before fetch |
| share_token | Secret-adjacent | Opaque 24-char hex from crypto random; unguessable |
| audit scores / issues | Derived | Public only via share_token; auditId lookups return 404 for missing (no existence oracle beyond UUID) |
| Dashboard API key | Credential | Env only; hashed comparison not needed for v1 single-key bearer |

## API / authZ

- Public: `/api/audit/run`, `/api/audit/submit`, `/api/health`, `/api/audit/share/:token`
- History: requires **both** `email` + `url` query params — scoped join, no email enumeration
- `GET /api/audit/:auditId`: opaque UUID; returns 404 for missing (same as unauthorized)
- Body allowlists only: `{ url }`, `{ url, email, projectName? }`
- Rate limit: per-IP sliding window on run/submit/history

## Ingestion / SSRF

- Normalize to `http`/`https` only
- DNS resolve then deny: loopback, RFC1918, link-local, cloud metadata
- Timeouts 15s HTML / 45s PageSpeed; max HTML body 2MB
- Redirects re-validated; max 5 hops
- Crawl: same-origin only, max 10 pages

## Retention

- Soft product policy: audits/leads kept for product history; deletion on request via operator (documented in README)
- No passwords stored

## Secrets

- `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, `DASHBOARD_API_KEY` via Hostinger env only — never in client bundles
