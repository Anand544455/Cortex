# CORTEX Frontend

The dashboard for the CORTEX backend (all 6 phases) — Command Center, Sites,
Crawl & Technical SEO, Keyword Intelligence, Backlink Engine, Outreach,
Content Studio, AEO/GEO Lab, SMO Suite, Local SEO, Competitor Intelligence,
and Reporting. Every page calls the real backend API — nothing here is mocked.

Built with React + Vite + Tailwind CSS. Palette is teal / navy / black / white
only, matching the backend's brand.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and point `VITE_API_URL` at your running CORTEX backend
(from the backend's own setup guide — it defaults to `http://localhost:5000/api`).

Make sure the backend's **API server** (`npm run dev`) and **worker**
(`npm run worker`) are both already running (see the backend's setup guide) —
this frontend has nothing to talk to otherwise.

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Register an
account — it creates your first workspace automatically, matching the
backend's `/api/auth/register` behavior.

## Building for production

```bash
npm run build
```

Outputs a static `dist/` folder — deploy it to any static host (Vercel,
Netlify, Nginx, an S3 bucket, etc.) pointed at your production
`VITE_API_URL`.

## How it's organized

```
src/
  api/          One file per backend module, thin wrappers around axios
  context/      Auth, Workspace/Site selection, and Toast notifications
  components/
    layout/     Sidebar, Topbar, DashboardLayout
    ui/         Card, Button, Table, Badge, Modal, Tabs, Form inputs, etc.
  pages/        One folder per module, matching the backend's route structure
```

Every module page follows the same shape: load data for the currently
selected site on mount, show a loading/empty/error state honestly, and
call the matching backend endpoint for every action (no fake data,
no simulated responses).

## A few things worth knowing

- **Site-scoped**: almost every module needs a site selected first (top-right
  switcher). `RequireSite` shows a clear empty state if none is selected yet.
- **Full data isolation**: every user's workspace is private to them alone —
  there's no team-invite feature anywhere in the app. Each account only ever
  sees its own sites, keywords, backlinks, everything.
- **Platform Admin**: accounts with `is_platform_admin: true` (set via the
  backend's `npm run promote-admin` the first time, then toggleable by any
  admin afterward) see an extra "Admin" item in the sidebar — a panel to view
  every user and every workspace on the platform, promote/demote other admins,
  and disable accounts. Regular users never see this link at all, and hitting
  `/admin` directly redirects them away (the real enforcement is on the
  backend via `requireAdmin` either way, this is just avoiding a confusing
  broken-looking page).
- **SMO posting and social listening** will show a real error toast if the
  backend's `SMO_PUBLISH_WEBHOOK_URL` isn't configured — that's expected,
  not a frontend bug. Same for backlink API sync without a `BACKLINK_API_KEY`,
  and AI citation checks without `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`. See the
  backend's `DEVELOPER_GUIDE.md` Part 8 equivalent for each.
- **PDF/CSV/disavow/llms.txt downloads** stream through the browser's blob
  download mechanism — no separate download page needed.
- **Integrations page**: connect Google Search Console, Analytics 4, and Tag
  Manager (free official APIs, OAuth-based), plus tools for PageSpeed Insights
  (real Core Web Vitals field data), IndexNow (instant indexing ping), and
  Bing Webmaster Tools — no paid third-party API anywhere on this page.
- **Agent page**: one button runs every self-hosted analysis module across
  the whole platform and returns a prioritized action plan, entirely free by
  default. An optional local LLM (Ollama, self-hosted) can enrich the summary
  if configured on the backend — never required.
