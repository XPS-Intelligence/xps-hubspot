# XPS HubSpot – Async Scraping System

A production-ready asynchronous scraping system built with Node.js + TypeScript, Playwright, Supabase, OpenAI, and HubSpot.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Server (Express)                      │
│  POST /api/v1/jobs  │  GET /api/v1/leads  │  POST /hubspot/sync │
└──────────────┬──────────────────────────────────────────────────┘
               │ enqueue
               ▼
┌─────────────────────────┐    ┌──────────────────────────────────┐
│   Async Queue (p-queue)  │───▶│  Playwright Workers (chromium)   │
│   concurrency: 3         │    │  retry + timeout handling        │
└─────────────────────────┘    └──────────┬───────────────────────┘
                                           │ raw data
                                           ▼
                               ┌───────────────────────┐
                               │  Data Pipeline         │
                               │  normalize + dedupe    │
                               └──────────┬────────────┘
                                           │ normalized lead
                                           ▼
                               ┌───────────────────────┐
                               │  OpenAI Validation     │
                               │  scoring + filtering   │
                               └──────────┬────────────┘
                                           │ validated lead
                                           ▼
                     ┌────────────────────────────────────────┐
                     │  Supabase (PostgreSQL)                  │
                     │  scrape_jobs | leads | scrape_results   │
                     └──────────────┬─────────────────────────┘
                                    │ sync
                                    ▼
                     ┌──────────────────────────────┐
                     │  HubSpot CRM                  │
                     │  duplicate check + upsert     │
                     └──────────────────────────────┘
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/XPS-Intelligence/xps-hubspot.git
cd xps-hubspot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run database migrations

Apply `supabase/migrations/001_initial_schema.sql` via the Supabase dashboard SQL editor or CLI:

```bash
npx supabase db push
```

### 4. Start development server

```bash
npm run dev
```

### 5. Start background worker

```bash
npm run worker:dev
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/health` | None | Health check |
| `GET` | `/auth/login/google` | None | Start Google OAuth |
| `GET` | `/auth/callback` | None | OAuth callback |
| `GET` | `/api/v1/queue/status` | Bearer | Queue metrics |
| `POST` | `/api/v1/jobs` | Bearer | Submit scrape job |
| `GET` | `/api/v1/jobs` | Bearer | List pending jobs |
| `GET` | `/api/v1/leads` | Bearer | List leads (paginated) |
| `POST` | `/api/v1/hubspot/sync` | Bearer | Sync validated leads |
| `POST` | `/api/v1/hubspot/sync/:leadId` | Bearer | Sync single lead |

### Submit a scrape job

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","type":"company","priority":8}'
```

---

## CLI Batch Scraping

```bash
# Scrape individual URLs
npm run scrape -- https://example.com https://another.com

# Scrape from file
npm run scrape -- --type company --file urls.txt
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | — | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Supabase service role key |
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `OPENAI_MODEL` | | `gpt-4o-mini` | GPT model |
| `HUBSPOT_ACCESS_TOKEN` | ✅ | — | HubSpot Private App token |
| `SCRAPER_CONCURRENCY` | | `3` | Parallel Playwright workers |
| `SCRAPER_TIMEOUT_MS` | | `30000` | Per-page timeout (ms) |
| `SCRAPER_MAX_RETRIES` | | `3` | Max retries per URL |
| `VALIDATION_MIN_SCORE` | | `60` | Minimum score to pass validation |
| `AUTH_CALLBACK_URL` | | — | OAuth redirect URL |

---

## Deployment (Railway)

1. Create a new Railway project
2. Add environment variables in Railway dashboard
3. Railway auto-deploys on push to `main`
4. Two services are deployed:
   - `xps-hubspot-api` – Express API server
   - `xps-hubspot-worker` – Background queue worker

---

## GitHub Actions

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ci.yml` | Push / PR | Lint, typecheck, test, build |
| `scrape.yml` | Daily 08:00 UTC / Manual | Scheduled parallel batch scrape |
| `deploy.yml` | Push to main | Deploy to Railway |

### Manual batch scrape

Trigger the `Scheduled Scrape` workflow manually from GitHub Actions with custom URLs.

---

## Project Structure

```
src/
├── api/          Express app, routes, middleware, auth endpoints
├── auth/         Supabase Google OAuth integration
├── config/       Environment config with Zod validation
├── db/           Supabase client + query helpers
├── hubspot/      HubSpot CRM write layer
├── logger/       Winston logger factory
├── pipeline/     Data normalization, fingerprinting, deduplication
├── queue/        p-queue async job queue
├── scraper/      Playwright scraper engine
├── types/        Shared TypeScript types + Zod schemas
├── validation/   OpenAI GPT validation engine
└── worker/       Background worker + CLI batch runner

supabase/migrations/  SQL migration files
.github/workflows/    GitHub Actions CI/CD
railway.toml          Railway deployment config
```

---

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **Scraping**: Playwright (Chromium, headless)
- **Queue**: p-queue (async, priority-based, concurrent)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth (Google OAuth 2.0)
- **Validation**: OpenAI GPT (configurable model)
- **CRM**: HubSpot API v3
- **API**: Express.js + Zod validation
- **Logging**: Winston (structured JSON in production)
- **CI/CD**: GitHub Actions + Railway