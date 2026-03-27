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
---

## Full Stack Setup Guide

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    XPS Intelligence Stack                    │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Dashboard   │   Backend    │   Supabase   │   Integrations │
│  (Next.js)   │  (Express)   │ (PostgreSQL) │                │
│              │              │              │  • HubSpot CRM │
│  /seeds      │  /api/v1/    │  leads       │  • OpenAI      │
│  /leads      │   seeds      │  seeds       │  • Firecrawl   │
│  /dispatch   │   leads      │  prompts     │  • n8n         │
│  /prompts    │   prompts    │  pipeline_   │                │
│  /chat       │   dispatch   │    _runs     │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### Bootstrap Instructions

#### 1. Backend Setup

```bash
# Clone and install
git clone https://github.com/XPS-Intelligence/xps-hubspot.git
cd xps-hubspot
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

#### 2. Dashboard Setup

```bash
cd dashboard
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# Development
npm run dev   # Visit http://localhost:3001

# Production build (static export for GitHub Pages)
npm run build
```

#### 3. Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run migrations in order:
   ```bash
   # Via Supabase CLI
   supabase db push
   # Or manually in the Supabase SQL editor:
   # 1. supabase/migrations/001_initial_schema.sql
   # 2. supabase/migrations/002_seeds_prompts.sql
   ```
3. Copy your project URL, anon key, and service role key

#### 4. n8n Setup

1. Install n8n: `npm install -g n8n` or use Docker
2. Import flows from `n8n-flows/`:
   - `seed-scrape-flow.json` – Main scraping trigger
   - `hubspot-sync-flow.json` – CRM sync (runs every 4 hours)
   - `enrichment-flow.json` – LLM enrichment (runs every 6 hours)
3. Set environment variables in n8n:
   - `XPS_API_URL` → Your backend API URL
4. Add HTTP Header Auth credentials with your API token

#### 5. Firecrawl Setup

1. Sign up at https://firecrawl.dev and get your API key
2. Update `firecrawl/config.json` with your settings
3. Set `FIRECRAWL_API_KEY` in your environment
4. The agent configuration in `firecrawl/agent-config.json` controls crawl depth and extraction rules

#### 6. Dashboard Access

| Route      | Description                          |
|------------|--------------------------------------|
| `/`        | Overview, pipeline status, KPIs      |
| `/seeds`   | Manage scraping targets              |
| `/seeds/new` | Add a new seed with full metadata  |
| `/leads`   | View and filter scraped leads        |
| `/dispatch`| Trigger pipeline runs manually       |
| `/prompts` | Edit LLM prompt library              |
| `/chat`    | Multi-agent chat interface           |

### Environment Variables Reference

#### Backend (`.env`)
```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-na1-...

# App
PORT=3000
NODE_ENV=production
API_AUTH_SECRET=your-jwt-secret
```

#### Dashboard (`.env.local`)
```
NEXT_PUBLIC_API_URL=https://your-api.example.com/api/v1
NEXT_PUBLIC_CHAT_API_URL=https://your-groq-or-ollama-endpoint/chat
```

### GitHub Actions Setup

#### Required Secrets
Set these in your repository **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API key |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token |
| `XPS_API_URL` | Deployed API URL (for pipeline-dispatch.yml) |
| `XPS_API_TOKEN` | API authentication token |

#### Required Variables
Set these in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description |
|----------|-------------|
| `API_URL` | API URL for dashboard build (deploy-pages.yml) |

#### Self-Hosted Runners

To use self-hosted runners (for faster builds or private network access):
1. Follow the GitHub docs to register a runner: https://docs.github.com/en/actions/hosting-your-own-runners
2. In `.github/workflows/ci.yml`, change `runs-on: ubuntu-latest` to `runs-on: self-hosted`
   (a comment near that line explains this)
3. Ensure the runner has Node.js 20+, npm, and Playwright dependencies installed

#### Workflows Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Lint, typecheck, test, build |
| `scrape.yml` | Daily 08:00 UTC + manual | Batch URL scraping |
| `pipeline-dispatch.yml` | Manual + API + daily | Full pipeline with seed creation |
| `deploy-pages.yml` | Push to main (dashboard/) | Deploy dashboard to GitHub Pages |

### OpenAI GPT Action

Import `schemas/openai-action-schema.json` as a Custom GPT Action to enable:
- `list_leads` – Browse scraped leads
- `create_seed` – Add scraping targets by voice or text
- `dispatch_pipeline` – Trigger runs from ChatGPT
- `get_pipeline_status` – Check run status
- `list_prompts` – Browse the prompt library

### Prompt Library

Prompt templates are stored in `prompts/` as YAML files and can be loaded into the database via the dashboard (`/prompts`) or the API:

```bash
# Load prompts via API
for f in prompts/*.yaml; do
  name=$(yq .name $f)
  template=$(yq .template $f)
  curl -X POST $API_URL/prompts \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"template\":\"$template\"}"
done
```
