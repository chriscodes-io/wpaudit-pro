# wpaudit.pro

Modern WordPress site audit app (Next.js) — dark + neon green brand matching Chris Smith’s marketing site. SEO / AEO / GEO first.

## Features

- Multi-page crawl (homepage + up to 10 same-origin URLs)
- Scores: Performance, SEO, **AEO/GEO**, Security, Technical, Accessibility
- Lead capture + PDF email (`POST /api/audit/submit` — compatible with marketing `auditLeadAPI`)
- Score history by email + URL
- Shareable report pages (`/share/[token]`)
- Technical SEO + AEO/GEO site foundation (JSON-LD, sitemap, robots, `llms.txt`, FAQ)

## Stack

- Next.js 15 App Router + Tailwind 4
- Supabase Postgres
- Resend + Puppeteer (PDF)
- Optional Google PageSpeed Insights API

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill Supabase + Resend (and optional PageSpeed key)
# Run supabase/migrations/001_initial.sql in Supabase SQL editor
npm run dev
```

Open http://localhost:3000

### Smoke checks

- `GET /api/health`
- Home → paste URL → Start Analysis
- Email PDF (needs Supabase + Resend)
- `/faq`, `/how-it-works`, `/llms.txt`, `/sitemap.xml`, `/robots.txt`

## API

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/health` | Service status |
| POST | `/api/audit/run` | `{ url }` → interactive result (no email) |
| POST | `/api/audit/submit` | `{ url, email, projectName? }` → persist + email PDF |
| GET | `/api/audit/history?email=&url=` | Score history (both required) |
| GET | `/api/audit/:auditId` | Audit JSON |
| GET | `/api/audit/share/:shareToken` | HTML report |

Marketing site CTA already posts to `https://wpaudit.pro/api/audit/submit` and opens `/?url=` (redirects to `/audit?url=`).

## Hostinger deploy (Node Web App)

1. Push this repo to GitHub.
2. hPanel → **Websites** → **Create website** → **Web App**.
3. Connect repo → branch `main`.
4. Settings:

| Field | Value |
|-------|--------|
| Application type | Node.js |
| Node.js version | `20` |
| Build script | `build` |
| Start / run command | `start` (runs `next start`) |
| Output directory | leave default / empty for Node |

5. Environment variables (set in hPanel, then rebuild):

| Key | Value |
|-----|--------|
| `SITE_URL` | your preview or `https://wpaudit.pro` |
| `NEXT_PUBLIC_SITE_URL` | same as `SITE_URL` |
| `SUPABASE_URL` | from Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `RESEND_API_KEY` | from Resend |
| `RESEND_FROM_EMAIL` | verified from-address |
| `GOOGLE_PAGESPEED_API_KEY` | optional |
| `PUPPETEER_EXECUTABLE_PATH` | set if Chrome exists on the host |

6. Point custom domain `wpaudit.pro` when ready (DNS A/CNAME in Hostinger).

## Security

See [SECURITY.md](./SECURITY.md). Rate limits, SSRF guards, opaque share tokens, history scoped to email+url.

## Privacy / deletion

Lead emails are stored for report delivery and score history. To delete a lead/audit pair, remove rows from Supabase `leads` / `audits` (operator process).
