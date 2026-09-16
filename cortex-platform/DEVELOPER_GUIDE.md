 # CORTEX Platform — Phase 1 Developer Guide
### (Core Skeleton: Auth, Database, Workspaces, Sites)

This guide is written for a developer picking this up for the first time.
Read it top to bottom once before touching any code.

---

## 1. What Phase 1 actually does

Phase 1 does **not** crawl websites, track keywords, or find backlinks yet.
It only builds the foundation everything else plugs into:

- A user can **register** and gets their own **workspace** automatically.
- A user can **log in** and get a JWT token.
- A workspace can have **multiple members** with different **roles**
  (owner, manager, analyst, client_viewer).
- A workspace can have **unlimited sites** (domains) added to it.
- Every request to a protected route is checked against the database —
  no fake/hardcoded users anywhere.

Every later phase (crawler, keyword tracker, backlink engine, AEO/GEO
module, etc.) will attach itself to the `Site` and `Workspace` records
created here. That's why this had to be built first.

---

## 2. Folder structure

```
cortex-platform/
├── server.js                  # App entry point — start here to trace the flow
├── config/
│   ├── db.mongo.js            # MongoDB connection (crawl lake, built in later phases)
│   └── db.sql.js               # SQL connection — works with MySQL OR PostgreSQL
├── models/
│   ├── sql/                    # Sequelize models: User, Workspace, Site, Role, etc.
│   │   └── index.js            # ALL table relationships (associations) live here
│   └── mongo/                  # Mongoose schemas: PageRaw, BacklinkIndex, etc.
│                                # (created now, used starting Phase 2's crawler)
├── middleware/
│   ├── auth.middleware.js      # Checks the JWT token on protected routes
│   ├── rbac.middleware.js      # Checks the user's ROLE inside a workspace
│   ├── validate.middleware.js  # Turns express-validator errors into clean JSON
│   └── errorHandler.middleware.js
├── controllers/                 # Business logic — one file per resource
├── routes/                      # URL -> controller mapping only, no logic here
├── utils/                       # JWT signing, password hashing, logger, response shape
├── seed/seed.js                 # Run once to create the 4 fixed roles
├── sql/schema.sql               # Reference SQL — sequelize.sync() creates this for you
└── .env.example                  # Copy to .env and fill in real values
```

**Rule of thumb:** routes only route, controllers only handle one request,
models only define data shape. Don't put business logic in a route file.

---

## 3. First-time setup

```bash
cd cortex-platform
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `JWT_SECRET` and `JWT_REFRESH_SECRET` — any long random string (never reuse across environments)
- `MONGO_URI` — your MongoDB connection string
- `SQL_DIALECT` — `mysql` or `postgres` (both work with zero code changes)
- `SQL_HOST`, `SQL_DATABASE`, `SQL_USERNAME`, `SQL_PASSWORD` — your database credentials

Then create the 4 fixed roles (only needs to run once per environment):

```bash
npm run seed
```

Then start the server:

```bash
npm run dev      # auto-restarts on file changes (uses nodemon)
# or
npm start        # plain node, for production
```

If everything is connected correctly you'll see in the terminal:

```
MongoDB connected -> cortex_crawl_lake
SQL (mysql) connected -> cortex_core
SQL models synced.
CORTEX API listening on port 5000 (development)
```

---

## 4. Why two databases?

| | MongoDB | SQL (MySQL/PostgreSQL) |
|---|---|---|
| Holds | Crawl data, backlinks, SERP snapshots, AI citations, social mentions | Users, workspaces, sites, billing, rank history |
| Why | Schema changes often, huge volume, no complex joins needed | Needs strict relationships, joins, and transactions (billing!) |

They are linked by **convention, not a database-level foreign key**: every
Mongo document stores a `site_id` string that matches a `Site.id` (UUID)
in SQL. When you write crawler code in Phase 2, always pass that UUID.

---

## 5. Switching between MySQL and PostgreSQL

You never touch model code to switch. Only `.env` changes:

```
SQL_DIALECT=mysql       # or: postgres
SQL_HOST=...
SQL_PORT=3306           # or: 5432 for postgres
SQL_DATABASE=...
SQL_USERNAME=...
SQL_PASSWORD=...
```

Sequelize (the ORM in `config/db.sql.js`) handles the rest.

---

## 6. API endpoints built in Phase 1

All routes are prefixed with `/api`.

| Method | Endpoint | Auth required | Role required | What it does |
|---|---|---|---|---|
| POST | `/auth/register` | No | — | Create user + a default workspace |
| POST | `/auth/login` | No | — | Get accessToken + refreshToken |
| POST | `/auth/refresh` | No (needs refreshToken in body) | — | Get a new accessToken |
| GET | `/auth/me` | Yes | — | Current user + their workspaces/roles |
| POST | `/workspaces` | Yes | — | Create an additional workspace |
| GET | `/workspaces` | Yes | — | List workspaces the user belongs to |
| POST | `/workspaces/:workspaceId/members` | Yes | owner/manager | Invite an existing user into the workspace |
| POST | `/workspaces/:workspaceId/sites` | Yes | owner/manager | Add a tracked domain |
| GET | `/workspaces/:workspaceId/sites` | Yes | any member | List all sites in the workspace |
| GET | `/workspaces/:workspaceId/sites/:siteId` | Yes | any member | Get one site's details |
| GET | `/health` | No | — | Uptime check |

**Auth header format for protected routes:**
```
Authorization: Bearer <accessToken>
```

### Example: register → create a site (using curl)

```bash
# 1. Register (creates user + default workspace)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Priya Sharma","email":"priya@dataengineers.in","password":"SuperSecret123"}'
# -> copy the accessToken AND workspace.id from the response

# 2. Add a site to that workspace
curl -X POST http://localhost:5000/api/workspaces/<workspace.id>/sites \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"domain":"dataengineers.in","display_name":"Data Engineers"}'
```

---

## 7. The 4 roles, in plain terms

- **owner** — full control, including billing and adding/removing members.
- **manager** — can manage sites and members, cannot touch billing.
- **analyst** — can view everything and run reports, cannot manage people.
- **client_viewer** — read-only. Meant for sharing a dashboard with the actual client, safely.

These are fixed on purpose (not user-creatable) so permission logic
never has to guess what a role means.

> **Note (see Section 18):** as of the data-isolation change, every
> workspace only ever has one member — its owner — so in practice
> `manager`/`analyst`/`client_viewer` are never assigned to anyone
> today. The role infrastructure (and `rbac.middleware.js`) was left
> in place rather than ripped out, since removing it would touch every
> route file for no functional gain — it's simply dormant unless a
> future team-sharing feature revives it.

---

## 8. What NOT to do

- Don't hardcode a `site_id` or `workspace_id` anywhere — always read it
  from the authenticated request (`req.user`, `req.params.workspaceId`).
- Don't add business logic inside a `routes/*.js` file — put it in the
  matching controller.
- Don't bypass `rbac.middleware.js` "for now, temporarily" — every route
  that touches workspace data must go through it.
- Don't switch from `sequelize.sync()` to raw SQL migrations without
  telling the rest of the team — that's a deliberate decision for later,
  not something to do quietly mid-phase.

---

## 9. Phase 2 — Crawl Engine

Phase 2 adds real crawling. It runs as a **separate process** from the
API server on purpose — crawling is CPU/memory heavy (each page opens a
real headless Chrome tab), and that load should never slow down the
API that your dashboard talks to.

### 9.1 New pieces

```
config/redis.js           # Redis connection used only by the job queue
config/queue.js            # BullMQ queue definition ("site-crawl")
crawler/
  browserPool.js            # One shared Puppeteer/Chromium instance
  robotsChecker.js           # Fetches + respects robots.txt
  sitemapParser.js           # Reads sitemap.xml (and sitemap indexes)
  pageCrawler.js              # Crawls ONE url: title, meta, h1, schema, links, CWV
  coreWebVitals.js            # Captures LCP + CLS from the live page load
  siteCrawler.js              # Orchestrates a full site: BFS crawl up to N pages
workers/crawlWorker.js       # BullMQ worker: consumes jobs, calls siteCrawler
worker.js                   # Entry point - run this as its own process
```

### 9.2 Extra setup required

You now need **Redis** running (BullMQ's job queue depends on it):

```bash
sudo apt install redis-server
sudo systemctl start redis-server
```

Add to `.env` (already in the updated `.env.example`):

```
REDIS_URL=redis://127.0.0.1:6379
CRAWL_WORKER_REGION=ap-south-1
CRAWL_MAX_PAGES_PER_SITE=200
CRAWL_CONCURRENCY=5
```

**About Puppeteer/Chromium:** `npm install` normally downloads a bundled
Chromium automatically. If your hosting network blocks that download,
`.npmrc` in this project sets `puppeteer_skip_download=true` to avoid
install failures — in that case, install Google Chrome on the server
yourself and set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable`
(or wherever it's installed) in `.env`. If your server's network is
unrestricted, delete that line from `.npmrc` and Puppeteer will download
Chromium on its own.

### 9.3 Running it

Two processes now run side by side:

```bash
npm run dev       # Terminal 1: the API server (unchanged)
npm run worker    # Terminal 2: the crawl worker (new)
```

To crawl across multiple real data centers/regions, run `npm run worker`
on a server in each region, each with a different `CRAWL_WORKER_REGION`
in its own `.env` — all pointing at the same Redis, MongoDB, and SQL
instances. That's the entire mechanism behind "distributed multi-datacenter
crawling": same code, different machines.

### 9.4 New API endpoints

| Method | Endpoint | Role required | What it does |
|---|---|---|---|
| POST | `/workspaces/:workspaceId/sites/:siteId/crawl` | owner/manager/analyst | Queues a crawl job (returns immediately) |
| GET | `/workspaces/:workspaceId/sites/:siteId/crawl-logs` | any member | Recent crawl job history for this site |
| GET | `/workspaces/:workspaceId/sites/:siteId/pages` | any member | Paginated list of every crawled page |
| GET | `/workspaces/:workspaceId/sites/:siteId/audit` | any member | Aggregate health score + issue counts |

Example flow:

```bash
# 1. Queue a crawl (worker.js must be running to actually process it)
curl -X POST http://localhost:5000/api/workspaces/<workspaceId>/sites/<siteId>/crawl \
  -H "Authorization: Bearer <accessToken>"

# 2. Check progress
curl http://localhost:5000/api/workspaces/<workspaceId>/sites/<siteId>/crawl-logs \
  -H "Authorization: Bearer <accessToken>"

# 3. Once completed, pull the audit summary
curl http://localhost:5000/api/workspaces/<workspaceId>/sites/<siteId>/audit \
  -H "Authorization: Bearer <accessToken>"
```

### 9.5 Honest limitation worth knowing

Core Web Vitals here capture **LCP and CLS** directly from the page
load (lab data). **INP is intentionally returned as `null`** — INP
requires a real person interacting with the page, which a headless,
unattended crawl cannot produce. Real INP should come from Google's
Chrome UX Report (CrUX) API using actual field data from real visitors
— a good candidate for the Integrations Hub module later, rather than
faking a number here.

---

## 10. Phase 3 — Keyword Intelligence

Phase 3 adds keyword research, rank tracking, topic clustering, and
competitor keyword gap analysis.

### 10.1 New pieces

```
models/sql/TrackedKeyword.js    # The keyword LIST a site is monitoring
services/serp/
  baseProvider.js                 # Interface every SERP provider must match
  apiSerpProvider.js               # Licensed third-party SERP API (recommended)
  puppeteerGoogleProvider.js        # Dev/testing-only fallback - see 10.3
  index.js                         # Picks the active provider from .env
services/rankTracker.js          # Runs SERP checks, writes RankHistory + SerpSnapshot
services/keywordClustering.js    # Self-hosted TF-IDF topic clustering (no API needed)
services/keywordGap.js           # Site vs competitor domain comparison
services/keywordResearch.js      # Seed keyword expansion via Google Autocomplete
workers/rankCheckWorker.js       # BullMQ worker for the "rank-check" queue
controllers/keyword.controller.js
routes/keyword.routes.js
```

### 10.2 Choosing a SERP data source

This is the single most important decision in this module. Set it in `.env`:

```
SERP_PROVIDER=api        # recommended for anything beyond local testing
SERP_API_URL=https://serpapi.com/search.json   # or any compatible provider
SERP_API_KEY=your_key_here
```

or, for local development without a paid key:

```
SERP_PROVIDER=puppeteer
```

### 10.3 Why the Puppeteer fallback is dev/testing-only

`puppeteerGoogleProvider.js` opens a real Google results page and reads
what's visible - no API key required, which is great for testing the
pipeline end-to-end. But be aware:

- Google's terms restrict automated querying at any real volume.
- Google's HTML structure changes without notice and can silently break parsing.
- If Google serves a CAPTCHA, **this code does not try to solve or bypass it** -
  it logs a warning and returns no data for that check. That is correct,
  intentional behavior, not a bug to "fix" by adding CAPTCHA-solving logic.

For any real client workspace, switch to `SERP_PROVIDER=api` and use a
licensed SERP API (SerpApi, ValueSerp, DataForSEO, Serpstack all work -
only `apiSerpProvider.js`'s `normalizeResponse()` may need small field-name
tweaks depending on which one you pick).

### 10.4 New API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| POST | `.../sites/:siteId/keywords` | Bulk-add tracked keywords: `{ keywords: [{ keyword, device?, location?, tag? }] }` |
| GET | `.../sites/:siteId/keywords` | List tracked keywords |
| DELETE | `.../sites/:siteId/keywords/:keywordId` | Stop tracking a keyword |
| POST | `.../sites/:siteId/keywords/check` | Queue a rank check for all active tracked keywords |
| GET | `.../sites/:siteId/rank-history?keyword=...&days=30` | Position history over time (for a trend chart) |
| GET | `.../sites/:siteId/serp-snapshot?keyword=...` | Latest full SERP result list + features for one keyword |
| GET | `.../sites/:siteId/keywords/clusters` | Groups tracked keywords into topic clusters |
| GET | `.../sites/:siteId/keywords/expand?seed=...` | Related keyword suggestions from Google Autocomplete |
| POST | `.../sites/:siteId/keywords/gap` | `{ competitorDomains: [...], keywords?: [...] }` - live gap analysis |

### 10.5 Automatic daily rank checks

Nothing runs on a schedule yet by default - Phase 3 gives you the
building blocks (queue + worker), wiring up "every day at 6am" is one
small addition. Add this to `worker.js`, right after `startRankCheckWorker()`:

```js
const cron = require('node-cron');   // npm install node-cron
const { Site } = require('./models/sql');
const { rankCheckQueue } = require('./config/queue');

cron.schedule('0 6 * * *', async () => {
  const sites = await Site.findAll({ where: { is_active: true } });
  for (const site of sites) {
    await rankCheckQueue.add('rank-check-site', { siteId: site.id });
  }
});
```

### 10.6 Honest limitation worth knowing

`keywordClustering.js` groups keywords by **shared significant words**
(TF-IDF + cosine similarity) - it will correctly cluster
`"hard drive data recovery"` with `"ssd data recovery service"`, but it
won't recognize that `"wipe my laptop"` and `"erase hard drive data"`
mean the same thing despite sharing no words. True semantic clustering
needs real sentence embeddings (a local model or an embeddings API).
The clustering *logic* here (cosine similarity + greedy grouping) is
written so that swapping in real embeddings later only means replacing
`buildVectors()` - nothing else in the module needs to change.

---

## 12. Phase 4 — Backlink Engine

Phase 4 adds backlink indexing, toxic link detection, disavow file
generation, link-building prospect discovery, and email outreach.

### 12.1 An honest note on backlink data before anything else

No self-hosted tool can build a web-scale "who links to any domain"
index from scratch — that's what Ahrefs, SEMrush, and Moz have spent
years and enormous crawling infrastructure building. CORTEX doesn't
pretend otherwise. Instead, backlink data comes from two real sources,
both feeding the same `BacklinkIndex`:

1. **CSV import** — upload an existing export from Ahrefs, SEMrush, or
   Moz. Works immediately, no API key needed. This is the practical
   default for most users.
2. **Licensed API sync** — if you have (or later get) a backlink data
   API key, `apiBacklinkProvider.js` pulls your full profile
   automatically. Configure `BACKLINK_API_URL` / `BACKLINK_API_KEY`.

Once data is in `BacklinkIndex`, toxic scoring, disavow generation, and
reporting all work identically regardless of which source it came from.

### 12.2 New pieces

```
models/mongo/OutreachProspect.js   # Link-building contacts/targets
models/mongo/OutreachMessage.js    # Sent/received outreach email log
services/backlinks/
  baseProvider.js / apiBacklinkProvider.js   # Licensed API integration
  csvImportService.js                          # Ahrefs/SEMrush/Moz CSV parser
  toxicScorer.js                                # Rule-based toxic link detection
  disavowGenerator.js                            # Google disavow.txt builder
  linkDiffer.js                                  # New/lost link tracking
  prospectFinder.js                              # Footprint-search prospect discovery
services/outreach/
  mailer.js / templates.js / sequenceRunner.js  # Email sending pipeline
workers/outreachWorker.js           # Sends queued outreach emails
controllers/backlink.controller.js
controllers/outreach.controller.js
routes/backlink.routes.js, routes/outreach.routes.js, routes/webhook.routes.js
```

### 12.3 Toxic link detection - what it actually checks

Rule-based (no ML model), the same signals real link-audit workflows use:

- Source domain on a commonly-abused TLD list (.xyz, .top, .click, .win, etc.)
- Anchor text containing known spam keywords (casino, viagra, etc.)
- Zero measurable domain authority
- The same exact-match anchor text repeated from 5+ different
  low-authority domains pointing at the same URL (a link-farm/PBN signature)

Re-run anytime via `POST .../backlinks/rescan-toxic` without needing to
re-import data - useful after you tune the rules in `toxicScorer.js`.

### 12.4 Disavow file

`GET .../sites/:siteId/backlinks/disavow` returns a ready-to-upload
`disavow.txt` in Google's exact format. If 3+ toxic links share a
source domain, the whole domain is disavowed (`domain:example.com`);
otherwise specific URLs are listed. **Always review the file yourself
before uploading it to Search Console** - this generates a
recommendation, not a decision.

### 12.5 Prospect finder - what it actually finds

`prospectFinder.js` runs footprint searches (`"{niche}" "write for
us"`, `"{niche}" "resources" intitle:resources`, etc.) through
whichever SERP provider is configured from Phase 3. It surfaces
**candidate domains worth manually reviewing**, not a verified,
ready-to-email list — you still need to find the actual contact email
for each prospect (via `PATCH .../prospects/:id`) before outreach can
be queued. True broken-link verification (confirming a specific link
on a specific page is actually dead) isn't attempted here; that would
require crawling the prospect's site as well as your own.

### 12.6 Outreach - built, not run

The outreach pipeline (SMTP sending, templates, reply webhook) is
fully wired up, but sending real emails requires **your own SMTP
credentials** in `.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`).
Nothing sends anywhere until you configure that and queue a send
yourself via `POST .../prospects/:prospectId/outreach`.

**Reply detection** works via a webhook, not by polling an inbox:
configure your email provider's inbound-parse feature (SendGrid
Inbound Parse, Mailgun Routes) to POST to
`/api/webhooks/outreach-inbound` with header `X-Webhook-Secret:
<your OUTREACH_WEBHOOK_SECRET>`. The payload just needs `{ from,
subject, text }` - map your provider's actual webhook fields to those
three in `outreach.controller.js`'s `handleInboundReply` if they differ.

### 12.7 New API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| POST | `.../sites/:siteId/backlinks/import` | Upload a CSV export (Ahrefs/SEMrush/Moz) |
| POST | `.../sites/:siteId/backlinks/sync` | Full sync from the licensed API provider |
| GET | `.../sites/:siteId/backlinks?status=&toxic=` | Paginated backlink list |
| GET | `.../sites/:siteId/backlinks/summary` | Referring domains, toxic count, lost count |
| POST | `.../sites/:siteId/backlinks/rescan-toxic` | Re-run toxic scoring on existing data |
| GET | `.../sites/:siteId/backlinks/disavow` | Download disavow.txt |
| POST | `.../sites/:siteId/prospects/find` | `{ niche, prospectTypes? }` - discover prospects |
| GET | `.../sites/:siteId/prospects` | List prospects |
| PATCH | `.../sites/:siteId/prospects/:id` | Add contact email/name, notes, status |
| POST | `.../sites/:siteId/prospects/:id/outreach` | Queue an outreach email |
| GET | `.../sites/:siteId/prospects/:id/messages` | Message history for one prospect |
| POST | `/api/webhooks/outreach-inbound` | Reply-detection webhook (shared-secret protected) |

---

## 14. Phase 5 — Content Studio, AEO/GEO Lab, and SMO Suite

Three modules in one phase since they share a common thread: turning
data already being collected (crawled pages, rank history, SERP
snapshots) into content and visibility guidance, plus a first pass at
social distribution.

### 14.1 Content Studio

```
services/content/
  onPageScorer.js           # Live on-page score: keyword usage, density, readability, structure
  briefGenerator.js          # Builds a content brief from the CURRENT top-10 SERP
  duplicateDetector.js        # Near-duplicate detection via simhash fingerprinting
  cannibalizationDetector.js  # Finds your own pages competing in the same SERP
  decayDetector.js            # Flags keywords trending worse over time
  internalLinkSuggester.js    # Suggests missing links between topically related pages
```

**On-page scoring** (`POST .../content/score`) is fully self-hosted and
stateless — paste in title/meta/H1/body/target keyword, get back a
weighted score plus the specific checks that passed or failed. This is
what a "live score as you type" editor would call on every keystroke
(debounced, in a real frontend).

**Duplicate content detection** uses a 64-bit simhash fingerprint
computed at crawl time (see `utils/simhash.util.js`) — verified against
realistic page-length content to correctly distinguish near-duplicates
(Hamming distance ~1) from unrelated pages (~32, statistical maximum).
Very short/thin pages may need threshold tuning — the default of 8 is
calibrated for normal article-length content.

**Content brief generation** does a lightweight `fetch` + Cheerio read
of the current top-10 ranking pages for a keyword (not a full Puppeteer
render — these are pages you're just reading, not interacting with) and
suggests a target word count plus commonly-repeated subheadings. This
is a starting point, not a guarantee — matching competitor structure
doesn't guarantee outranking them.

### 14.2 AEO/GEO Lab

```
services/aeo/
  llmProviders/               # Pluggable: Claude (Anthropic) + ChatGPT (OpenAI-compatible)
  citationTracker.js           # Runs a prompt against configured LLMs + pulls AI Overview data
  schemaGenerator.js            # FAQ/HowTo/Article/Product JSON-LD templates
  answerScorer.js                # Extractability scoring for AI-answer formats
  llmsTxtGenerator.js             # Generates llms.txt (see llmstxt.org)
  aiCrawlerAuditor.js              # Checks robots.txt against known AI bot user agents
```

**Citation checking** needs your own API key(s) in `.env`
(`ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`) — only engines with a key
configured get checked; nothing fails silently, unconfigured engines
are just skipped. **Google AI Overview citation** doesn't need a
separate key at all — there's no public API for AI Overviews, so this
reuses the `ai_overview_present` / `ai_overview_cites_domains` data
Phase 3's SERP provider already captures when it checks that same
prompt as a search query. Perplexity and Gemini don't currently have
provider adapters here (no sufficiently open chat-completion API to
build against yet) — add one under `llmProviders/` matching
`baseProvider.js`'s `ask()` interface whenever that changes.

**Structured data generation** is pure templating against the
documented Schema.org spec — you supply the real FAQ/HowTo/Article/
Product data, it returns valid JSON-LD plus a ready-to-paste
`<script>` tag.

### 14.3 SMO Suite

```
models/mongo/SocialPost.js
services/smo/
  webhookSocialProvider.js    # Publishes via a webhook you control - see below
  mentionFinder.js             # SERP-based mention discovery fallback
  autoSyndication.js            # Drafts posts for newly crawled Article-type pages
workers/socialPublishWorker.js
```

**On multi-platform posting** — being direct about this: Facebook,
Instagram, X, LinkedIn, and Pinterest each require their own OAuth app
registration and developer approval. No code can create API access to
accounts it doesn't have credentials for. Instead of shipping four
half-working OAuth stubs, `webhookSocialProvider.js` posts each
scheduled item to **one webhook URL you control** —
`SMO_PUBLISH_WEBHOOK_URL` in `.env`. Point that at a Zapier "Catch
Hook" or Make.com webhook, and let that automation fan out to each
real platform using its own already-authorized connections. This is
genuinely how a lot of scheduling tools work under the hood. Swap this
file for real per-platform API calls later if you register your own
developer apps — nothing else in the module needs to change.

**Social listening** works the same honest way: without a paid
listening API or per-platform search API configured, `mentionFinder.js`
falls back to `site:platform.com "brand name"` searches through the
existing SERP provider. It will find public, already-indexed mentions —
not everything a real listening tool sees.

**Auto-syndication** drafts posts (never auto-publishes) for pages
carrying Article/BlogPosting/NewsArticle structured data, detected from
data Phase 2's crawler already extracts.

### 14.4 New API endpoints

| Method | Endpoint | Module | What it does |
|---|---|---|---|
| POST | `.../content/score` | Content | Score pasted content against a target keyword |
| GET | `.../content/brief?keyword=` | Content | Generate a brief from the current top-10 SERP |
| GET | `.../content/duplicates` | Content | Near-duplicate content scan |
| GET | `.../content/cannibalization` | Content | Own-page SERP competition scan |
| GET | `.../content/decay?recentDays=&priorDays=` | Content | Ranking-decay scan |
| GET | `.../content/internal-links` | Content | Missing internal link suggestions |
| POST | `.../aeo/citations/check` | AEO/GEO | `{ prompt }` - check citation across configured LLMs + AI Overview |
| GET | `.../aeo/citations` | AEO/GEO | List past citation checks |
| GET | `.../aeo/citations/share-of-voice` | AEO/GEO | Citation rate per engine |
| POST | `.../aeo/schema/:type` | AEO/GEO | `type` = faq / howto / article / product |
| POST | `.../aeo/answer-score` | AEO/GEO | Extractability scoring |
| GET | `.../aeo/llms-txt` | AEO/GEO | Download generated llms.txt |
| GET | `.../aeo/ai-crawler-audit` | AEO/GEO | robots.txt vs. known AI bot user agents |
| POST | `.../smo/posts` | SMO | Draft a scheduled post |
| GET | `.../smo/posts?status=&platform=` | SMO | List posts |
| POST | `.../smo/posts/:id/queue` | SMO | Queue a draft to publish at its scheduled time |
| POST | `.../smo/syndicate` | SMO | Scan for new articles, draft posts |
| GET | `.../smo/mentions?brandName=` | SMO | SERP-based mention search |

---

## 16. Phase 6 — Local SEO, Competitor Intelligence, and Reporting

The final phase on the original roadmap. Local SEO adds geo-grid rank
tracking and citation/review tools; Competitor Intelligence mirrors
existing data against rival domains; Reporting ties every module's
data into exportable PDF/CSV/JSON.

### 16.1 Local SEO

```
models/mongo/GeoGridResult.js
services/local/
  geoGrid.js         # Generates a lat/lng grid, checks local pack rank at each point
  napScanner.js        # SERP-based directory listing presence check
  reviewTools.js         # Google review link generator + lexicon-based sentiment
  gbpProvider.js           # Google Business Profile API (posts, Q&A) - needs your own OAuth
```

**Geo-grid tracking** was verified with real coordinate math (Delhi
NCR test grid: center point at 0km, edges at exactly 5km, corners at
7.07km — correct). One thing worth knowing: precise lat/lng-based
local targeting isn't standardized across SERP API providers — some
use a dedicated coordinates parameter rather than a free-text location
string. Check your specific provider's docs if geo-grid results look
off; `apiSerpProvider.js`'s location mapping may need a small
adjustment for your provider.

**NAP/citation scanning** without a paid citation API (Moz Local,
Whitespark) falls back to checking whether the business is *indexed at
all* on each directory via SERP search — it confirms presence, not the
exact phone/address text shown there. Manual spot-checks of the actual
listing details are still worth doing.

**Google Business Profile management** needs your own Google Cloud
project with Business Profile API access (Google reviews each access
request — it's not self-serve) plus a completed OAuth consent flow.
Same category of one-time manual setup as the SMO webhook in Phase 5 —
no code can create API access to a business listing it doesn't have
credentials for. Once you have a refresh token, set `GBP_CLIENT_ID`,
`GBP_CLIENT_SECRET`, and `GBP_REFRESH_TOKEN` in `.env`.

### 16.2 Competitor Intelligence

```
services/competitor/
  shareOfVoice.js       # Top-10 presence rate: your site vs. named competitors
  contentCadence.js       # Estimates a competitor's publishing frequency from their sitemap
  rivalAlerts.js             # Flags competitor position changes between SERP snapshot checks
  trafficEstimator.js          # Transparent CTR-curve traffic estimate
```

Every piece here **reuses data already being collected** — no new
tracked entity for competitors was added. Share-of-voice and rival
alerts read from Phase 3's `SerpSnapshot` history; content cadence
reuses Phase 2's sitemap parser pointed at a competitor's domain.

**On traffic estimates** — being direct about this: real traffic-value
tools (Ahrefs, SEMrush) are built on proprietary clickstream data from
their own large user panels. That's not something to fabricate here.
`trafficEstimator.js` instead uses a commonly published, industry-cited
CTR-by-position curve applied to a **monthly search volume you supply**
(from Search Console, Keyword Planner, or a paid tool — this app has no
search-volume data source of its own). The output is explicitly labeled
as a rough estimate range, not a precise number.

### 16.3 Reporting & Analytics

```
services/reporting/
  dataGatherer.js       # Pulls audit/backlink/rank/citation data into one bundle
  pdfReportBuilder.js     # Builds the branded PDF (pdfkit) - verified: produces a valid PDF
  csvExport.js              # Generic array-of-objects -> CSV (verified: handles commas/quotes correctly)
  forecast.js                 # Simple linear-regression trend line (verified against a known series)
```

**PDF reports** (`GET .../reports/pdf?days=30`) pull together site
health, rank history, backlink summary, and AI citation share-of-voice
into one branded document — actually generated and verified in this
build (valid `%PDF` file signature, correct structure).

**Forecasting** is deliberately simple: ordinary least-squares linear
regression over whatever KPI series you pass in (rank position, health
score, traffic estimate over time — anything already tracked
elsewhere). It's a straight-line trend projection, not a predictive
model — good for "is this trending up or down and roughly how fast,"
not for pinpointing a specific future value. One nuance worth knowing:
for rank *position*, a *declining* number is actually an *improving*
rank — the forecast function reports on the raw numbers, so read the
direction in context of what the metric means.

**Scheduling reports** isn't a separate queue+worker — reuse the same
`node-cron` pattern from the Phase 3 guide (section 10.5), calling
`gatherSiteReportData()` + `buildSiteReportPdf()` then emailing the
result via the Phase 4 mailer (`services/outreach/mailer.js`'s
`sendMail()` accepts attachments the same way any Nodemailer call does).

### 16.4 New API endpoints

| Method | Endpoint | Module | What it does |
|---|---|---|---|
| POST | `.../local/geo-grid` | Local | `{ keyword, centerLat, centerLng, radiusKm?, gridSize? }` |
| GET | `.../local/geo-grid?keyword=` | Local | Latest saved grid results |
| POST | `.../local/nap-scan` | Local | `{ businessName, phone? }` |
| GET | `.../local/review-link?placeId=` | Local | Google review deep link |
| POST | `.../local/review-sentiment` | Local | `{ reviewText }` |
| POST | `.../local/gbp/posts` | Local | Create a GBP post (needs OAuth setup) |
| GET | `.../local/gbp/questions` | Local | List GBP Q&A |
| POST | `.../competitors/share-of-voice` | Competitor | `{ competitorDomains, days? }` |
| GET | `.../competitors/content-cadence?domain=` | Competitor | Publishing frequency estimate |
| POST | `.../competitors/alerts` | Competitor | Rival ranking-change alerts |
| POST | `.../competitors/traffic-estimate` | Competitor | `{ keywordData: [{keyword,position,monthlySearchVolume}] }` |
| GET | `.../reports/pdf?days=` | Reporting | Download branded PDF report |
| GET | `.../reports/json?days=` | Reporting | Same data, raw JSON |
| GET | `.../reports/export/:dataset` | Reporting | CSV export (`rank-history` wired up) |
| POST | `.../reports/forecast` | Reporting | `{ series: [{value}], pointsToForecast? }` |

---

## 17. All six phases, at a glance

| Phase | What it built |
|---|---|
| 1 | Auth, multi-tenant workspaces/sites, RBAC |
| 2 | Crawl engine (Puppeteer, sitemap/robots-aware, Core Web Vitals) |
| 3 | Keyword research, rank tracking, SERP snapshots, clustering |
| 4 | Backlink index (CSV/API), toxic scoring, disavow, outreach |
| 5 | Content Studio, AEO/GEO Lab, SMO Suite |
| 6 | Local SEO, Competitor Intelligence, Reporting |

Every phase was built as a working slice on top of the last, not a
rewrite — the Phase 1 auth system is still exactly what every later
request runs through. Where something couldn't honestly be delivered
in code alone (web-scale backlink indexing, per-platform social OAuth,
proprietary traffic data, CAPTCHA-solving), that limit is documented
in-line rather than faked, with a clear plug-in point for when you do
have the missing piece (a paid API key, a completed OAuth flow, and so on).

---

## 18. Data Isolation & Platform Admin

Added after the initial six-phase build, at the point where the
platform needed to support many unrelated users: **every user's data
is fully isolated from every other user.** There is no team-invite
feature, and there never will be one unless this decision is
revisited — the absence of that feature is what makes isolation a
structural guarantee rather than a setting someone could misconfigure.

### 18.1 How isolation actually works

- Every workspace has **exactly one member: its owner**, for the
  entire lifetime of the app.
- `POST /api/workspaces/:workspaceId/members` does not exist. There is
  no code path anywhere that adds a second user to a workspace.
- A user can still create **multiple workspaces of their own** (e.g.
  to separate two unrelated businesses they run) — that's still
  allowed, and those workspaces are still only ever owned by them.

### 18.2 Platform Admin — the one exception

A **separate, platform-wide** concept from workspace roles. A
workspace "owner" only has power inside their own workspace; a
platform admin can see across *every* workspace on the platform, for
oversight. This is controlled by a single flag on the `User` row:
`is_platform_admin`.

**Bootstrapping the first admin** (there's a chicken-and-egg problem —
promoting requires already being an admin, so the very first one is
set via a one-time CLI command, not the API):

```bash
npm run promote-admin -- you@example.com
```

The person must have already registered a normal account first. Run
this once, on your own account, right after setup.

**After that**, promote or demote anyone else through the API itself —
no more CLI needed:

```bash
curl -X PATCH http://localhost:5000/api/admin/users/<userId> \
  -H "Authorization: Bearer <your-admin-accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"is_platform_admin": true}'
```

### 18.3 Admin endpoints

All under `/api/admin`, all gated by `requireAdmin` (checks
`is_platform_admin`, completely separate from `requireWorkspaceRole`):

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/admin/users` | Every registered user on the platform |
| PATCH | `/api/admin/users/:userId` | `{ is_platform_admin?, is_active? }` — promote/demote, or disable an account |
| GET | `/api/admin/workspaces` | Every workspace on the platform, across every user |
| GET | `/api/admin/workspaces/:workspaceId/sites` | Read-only oversight into any workspace's sites, bypassing the normal membership check |

An admin can't remove their own admin access via the API (prevents
accidentally locking yourself out) — another admin has to do it, or
you fall back to editing the database directly.

### 18.4 What this means for the frontend

The dashboard only shows an "Admin" section in the sidebar when
`GET /api/auth/me` returns `user.is_platform_admin: true` — that field
is included in that response specifically so the frontend can gate on it.

---

## 19. Phase 7 — Own Your Data: Free Integrations + the Self-Hosted Agent

Added in response to a deliberate constraint: **no paid third-party
API anywhere in this phase.** Every integration below is either a free
official platform API (Google/Bing — no cost, ever, for the endpoints
used here) or a genuinely open protocol/self-hosted option. Where a
paid option existed in earlier phases (SERP APIs, backlink APIs, paid
LLMs), those remain as optional upgrades — nothing here removes them —
but everything new is free by construction.

### 19.1 New pieces

```
models/sql/IntegrationConnection.js   # OAuth tokens, one row per site per provider
services/integrations/
  googleOAuth.js       # One shared OAuth2 flow for GSC + GA4 + GTM
  searchConsole.js       # Real clicks/impressions/position, URL inspection, sitemap submit
  analytics.js              # GA4 traffic, top pages, channel breakdown
  tagManager.js                # List containers/tags, automate GA4 tag creation
  pagespeedInsights.js            # Real Core Web Vitals FIELD data (fixes the Phase 2 INP gap)
  indexNow.js                        # Open protocol - instant indexing ping to Bing/Yandex/Seznam
  bingWebmaster.js                  h performance + crawl issues
services/agent/
  auditAgent.js       # Orchestrates every existing analysis module into one findings list
  suggestionEngine.js   # Turns findings into an action plan -     # Bing's own searctemplate-based by default
  localLlmProvider.js     # Optional Ollama connector - self-hosted, genuinely free forever
controllers/integrations.controller.js
controllers/agent.controller.js
```

### 19.2 Google integrations (Search Console, Analytics 4, Tag Manager)

All three share one OAuth setup, since they're all Google Cloud
products behind the same consent screen.

**One-time Google Cloud setup:**
1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. Enable these APIs (each is free): Search Console API, Google
   Analytics Data API, Google Analytics Admin API, Tag Manager API.
3. Configure the OAuth consent screen (External, unless you're on
   Google Workspace).
4. Create OAuth 2.0 credentials (Web application type). Add your
   callback URL as an authorized redirect URI:
   `http://localhost:5000/api/integrations/google/callback` (dev) or
   your real API domain in production.
5. Set in `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.

**Connecting a site:** `GET .../sites/:siteId/integrations/google/:provider/connect`
redirects the browser straight to Google's consent screen (`provider`
is `google_search_console`, `google_analytics`, or `google_tag_manager`).
After approval, Google redirects to the public callback route, tokens
get saved, and the browser lands back on the frontend's Integrations page.

**Why Search Console matters most:** it's Google's own record of your
actual clicks, impressions, and position per query — real data, for
free, directly from the source. It's the recommended primary source
for your own site's ranking performance; the Phase 3 SERP provider
remains useful for competitor positions and geo-grid checks, which
Search Console structurally cannot provide (it only reports on
properties you've verified).

### 19.3 PageSpeed Insights — the honest fix for the INP gap

Phase 2's `crawler/coreWebVitals.js` explicitly documented that a
headless crawl cannot produce genuine INP (it requires a real person
interacting with the page). PageSpeed Insights' field data comes from
the Chrome UX Report — real measurements from real Chrome users who
visited the page — so this closes that gap honestly, with real data
instead of a lab approximation. Free API key, no billing account
required for this specific API.

### 19.4 IndexNow — a genuinely open protocol, not a Google product

[indexnow.org](https://www.indexnow.org) is jointly backed by
Microsoft, Yandex, and others — not something to "sign up" for in the
usual sense. Generate a key, host it as a plain text file at your
site's root as proof of ownership, and ping the shared endpoint
whenever content changes. The crawl worker now does this automatically
after every completed crawl, if `INDEXNOW_KEY` is set — best-effort,
never fails the crawl job itself if the ping fails.

Note: this does **not** cover Google — Google does not participate in
IndexNow. Use Search Console's sitemap submission (19.2) for Google specifically.

### 19.5 The Agent — self-built, not a paid-LLM wrapper

`POST .../sites/:siteId/agent/audit` runs **every** self-hosted
analysis module already in the platform (crawl issues, duplicate
content, cannibalization, decay, internal-link gaps, toxic backlinks,
AI crawler access) in one call, combines the results into a severity-
ranked findings list, and returns a template-based action plan —
**with zero configuration and zero cost, for every user, by default.**

If you want richer natural-language summaries, install
[Ollama](https://ollama.com) (free, open-source, runs locally),
`ollama pull llama3.1`, and set `OLLAMA_BASE_URL` + `OLLAMA_MODEL`.
This is a pure enhancement layer — if it's not configured, or if a
request to it fails for any reason, the agent silently falls back to
the template summary rather than failing the whole audit.

### 19.6 New API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| GET | `.../integrations` | List what's connected for this site |
| GET | `.../integrations/google/:provider/connect` | Redirect to Google's consent screen |
| DELETE | `.../integrations/:provider` | Disconnect |
| GET | `.../integrations/google_search_console/properties` | List verified GSC properties |
| POST | `.../integrations/google_search_console/select-property` | `{ propertyUrl }` |
| GET | `.../integrations/google_search_console/analytics?dimensions=query,page` | Real search performance |
| POST | `.../integrations/google_search_console/inspect-url` | `{ url }` — Google's own index status for one URL |
| POST | `.../integrations/google_search_console/submit-sitemap` | Request a re-crawl |
| GET | `.../integrations/google_analytics/properties` | List GA4 properties |
| POST | `.../integrations/google_analytics/select-property` | `{ propertyId }` |
| GET | `.../integrations/google_analytics/overview` | Traffic, top pages, channel breakdown |
| GET | `.../integrations/google_tag_manager/containers` | List GTM containers |
| POST | `.../integrations/google_tag_manager/select-container` | `{ containerPath }` |
| POST | `.../integrations/google_tag_manager/create-ga4-tag` | `{ measurementId }` — automates the common manual setup step |
| GET | `.../integrations/pagespeed?url=&strategy=mobile` | Real lab + field Core Web Vitals |
| POST | `.../integrations/indexnow/submit` | `{ urls? }` — defaults to every crawled page |
| GET | `.../integrations/indexnow/generate-key` | One-time key generation |
| GET | `.../integrations/bing/performance` | Bing search performance |
| POST | `.../agent/audit` | Full self-hosted audit + prioritized action plan |
