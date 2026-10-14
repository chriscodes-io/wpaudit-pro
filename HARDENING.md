# Hardening checklist — before public / marketing S2S

Pre-public work required before exposing WP Audit Pro (or the proposed `/v1` API) as a lead-magnet backend for a marketing site.

**Status:** Checklist only. **No code in this pass.** Implement only after explicit approval.

Companion docs: [INTEGRATION_NOTES.md](./INTEGRATION_NOTES.md) (current gaps), [API_CONTRACT.md](./API_CONTRACT.md) (target API).

---

## 1. SSRF hardening (highest priority)

### Already present (keep)

- [x] http/https only; reject URL credentials
- [x] Block localhost / `.local` / known metadata hostnames
- [x] DNS lookup + reject private / loopback / link-local / ULA / CGNAT / `169.254/16`
- [x] Re-check each redirect hop; max 5 redirects
- [x] Body size + timeout caps; same-origin crawl limit ≤10 pages

### Must fix before public traffic

| Item | Why | Acceptance criteria |
|------|-----|---------------------|
| **DNS rebinding / TOCTOU** | Resolve-then-`fetch(hostname)` can change between check and connect | After allowlist DNS, **pin connection to the resolved public IP(s)** (or use a fetch/connect path that does not re-resolve to a private address). Re-validate IP on every redirect hop. |
| **IPv6 dual-stack** | Host may resolve A + AAAA; one may be public, one private | Reject if **any** resolved address is non-public; prefer connect only to verified public addresses. |
| **Literal IP URLs** | Users may pass `http://8.8.8.8` or crafted literals | Apply same private-range checks; decide product policy for public IP literals (allow or reject). |
| **Non-standard ports** | Optional tighten | Allow **80/443 only** unless a product need exists. |
| **Redirect to file/data/etc.** | Protocol confusion | Keep scheme allowlist on every hop (already intended). |

Reference implementation surface: [`src/lib/urls.ts`](src/lib/urls.ts) (`assertPublicUrl`, `safeFetch`).

### Verify with tests / probes

- [ ] Private IPv4/IPv6 literals rejected
- [ ] DNS name that resolves to private IP rejected
- [ ] Simulated rebind (or unit test of pin logic) cannot reach loopback/metadata
- [ ] Redirect chain to private host rejected mid-chain
- [ ] Oversized body / timeout do not hang the worker

---

## 2. Authentication

| Item | Today | Required |
|------|-------|----------|
| Audit routes | Open | **`Authorization: Bearer <AUDIT_API_KEY>`** on `/v1/*` (and ideally lock down `/api/audit/*` if still public) |
| Key storage | `DASHBOARD_API_KEY` unused | Store `AUDIT_API_KEY` server-side only; support rotation (accept N keys briefly) |
| Marketing site | N/A | Call from **server** only; never ship key to browser |
| Share links | Opaque token | Keep; do not put service key in share URLs |
| `GET /api/audit/:id` | Unauthenticated UUID | Require auth **or** remove from public surface / migrate to gated `/v1/.../full` |

Failure mode: missing/invalid key → `401`, no audit work started.

---

## 3. CORS

| Item | Today | Required |
|------|-------|----------|
| `POST /api/audit/submit` | `Access-Control-Allow-Origin: *` ([`next.config.ts`](next.config.ts)) | **Allowlist** exact marketing origin(s), e.g. `https://www.example.com` |
| Credentials | Not used with `*` | If cookies ever used, pair allowlist with `Allow-Credentials` carefully |
| `/v1` | N/A | Prefer **no browser CORS** (S2S only). If a browser proxy is needed, only via marketing same-origin BFF |

Do not leave `*` once the API key exists — browsers with a stolen key would still be blocked by CORS only if origins are locked; defense in depth still requires the key stay server-side.

---

## 4. Rate limits and budgets

### Replace / augment in-memory IP limits

| Dimension | Suggested starting point | Notes |
|-----------|--------------------------|-------|
| Per IP | Keep short window (e.g. run 8/min, submit 5/min) | Must work behind Hostinger proxy (trusted `X-Forwarded-For` policy) |
| Per API key | e.g. 30–60 creates / hour | Primary S2S control |
| Concurrent `running` jobs | e.g. 2–5 per key | Protects PSI + CPU |
| Daily budget | e.g. N audits / key / UTC day | Caps Resend + PSI spend |
| Shared store | Redis / Supabase / Hostinger-compatible store | In-memory fails with multi-process / restart |

Return `429` + `Retry-After` + `X-RateLimit-*` headers per [API_CONTRACT.md](./API_CONTRACT.md).

### Quotas to respect externally

- [ ] Google PageSpeed Insights project quotas
- [ ] Resend sending limits
- [ ] Hostinger plan CPU / request limits

---

## 5. Result caching and reuse

| Item | Purpose |
|------|---------|
| Cache successful audits by normalized hostname (+ optional path policy) for a TTL (e.g. 24h) | Cut duplicate PSI/crawl cost for the same lead retry |
| Cache key must include cache-busting when product needs a fresh run | Explicit `force=true` (rate-limited) |
| Do not cache failed SSRF attempts as success | — |
| Retention / `expired` status | Purge full payloads after TTL; keep summary longer if needed for CRM |

---

## 6. Polite crawler

| Item | Required |
|------|----------|
| User-Agent | Keep identifiable UA (`WPAuditPro/1.0 (+https://wpaudit.pro)`); update contact URL if domain changes |
| Delay | Small delay between page fetches (e.g. 200–500ms) to avoid hammering small hosts |
| robots.txt | Today used for AEO checks; consider **honoring Disallow** for crawl discovery (product decision — document if you intentionally ignore) |
| Page / redirect / size caps | Keep existing caps; do not raise without review |
| No credentialed fetches | Already; maintain |

---

## 7. Logging and data handling

| Item | Required |
|------|----------|
| No secrets in logs | Never log API keys, service role keys, Resend keys |
| Minimize PII | Email only when needed; avoid logging full bodies |
| URLs | Log host + audit id; avoid raw query strings with tokens |
| Errors | Structured `console` / platform logs without dumping full HTML |
| Health | Decide whether public health may disclose `db` / `email` / `pagespeed` (info leak for attackers) |
| Supabase | Service role remains server-only; RLS still not a substitute for API auth |

---

## 8. PDF / Chrome

| Item | Required |
|------|----------|
| Soft-fail | `/v1/.../pdf` returns **503** when Chrome missing (already soft-fail on email path) |
| Path | `PUPPETEER_EXECUTABLE_PATH` only from env; never accept client-supplied binary paths |
| HTML for PDF | Sanitize / trust only self-generated report HTML |

---

## 9. API surface checklist (go-live)

Before pointing marketing production at this host:

- [ ] SSRF pin / rebind-safe fetch shipped and tested
- [ ] Bearer API key enforced on audit create + read
- [ ] CORS allowlist (or S2S-only, no `*`)
- [ ] Per-key + per-IP limits + concurrency + daily budget
- [ ] Async jobs (or documented sync timeout) so marketing does not hang HTTP 120s
- [ ] Summary vs full gating implemented
- [ ] Unauthenticated `GET /api/audit/:id` locked or removed
- [ ] Sensitive logging scrubbed
- [ ] `SITE_URL` / share links match intended public hostname
- [ ] Env vars set on Hostinger (PSI, Supabase, Resend, `AUDIT_API_KEY`)
- [ ] Runbook: rotate key, kill switch (disable creates), check PSI quota

---

## 10. Explicit non-goals until approved

- Shipping `/v1` without the items in §9
- Raising crawl page limits or PSI category set “for marketing”
- Exposing the service role key or API key to any client bundle
- Relying solely on “security through Hostinger URL obscurity”

---

## Sign-off

| Gate | Owner | Date |
|------|-------|------|
| Docs reviewed | | |
| Implementation approved | Chris | *(not yet)* |
| Hardening §9 complete | | |
| Marketing cutover | | |

**Stop here until Chris approves implementation.** No application code changes are implied by this document alone.
