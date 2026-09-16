# Cortex

Cortex is a full-stack, multi-tenant **SEO command-center platform** that lets teams manage multi-site crawling, technical health scoring, and rank tracking — all from a single dashboard.

## Features

- **Custom Crawling Engine** — Recursive site crawler built with Puppeteer, parsing XML sitemaps and processing links through a self-built Redis-backed queue for scalable, asynchronous crawling.
- **Role-Based Access Control** — Owner, Manager, Analyst, and Client Viewer roles with JWT authentication and per-workspace data isolation for multi-user teams.
- **Deep API Integrations** — Connects with 7+ official Google and Bing APIs (Search Console, Analytics 4, Tag Manager, PageSpeed Insights, Bing Webmaster Tools) via the googleapis SDK and OAuth 2.0, removing the need for paid third-party data providers.
- **Multi-Tenant Architecture** — Workspace-based data isolation so multiple clients/teams can operate independently within the same platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js, Express |
| Databases | MongoDB, PostgreSQL |
| Caching / Queue | Redis |
| Auth | JWT |
| Crawling | Puppeteer |

