const { Site } = require('../models/sql');
const { PageRaw, CrawlLog } = require('../models/mongo');
const { crawlQueue } = require('../config/queue');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/crawl
 * Enqueues a crawl job - the actual crawling happens in the separate
 * worker process (worker.js), not here. This keeps the API responsive
 * even while a large site is being crawled.
 */
async function enqueueCrawl(req, res) {
  const { workspaceId, siteId } = req.params;

  const site = await Site.findOne({ where: { id: siteId, workspace_id: workspaceId } });
  if (!site) return failure(res, 404, 'Site not found.');

  if (site.status === 'crawling') {
    return failure(res, 409, 'A crawl is already running for this site.');
  }

  const job = await crawlQueue.add(
    'crawl-site',
    { siteId: site.id, workspaceId },
    { removeOnComplete: 100, removeOnFail: 100 }
  );

  return success(res, 202, 'Crawl job queued.', { jobId: job.id, siteId: site.id, domain: site.domain });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/crawl-logs
 */
async function getCrawlLogs(req, res) {
  const { siteId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const logs = await CrawlLog.find({ site_id: siteId }).sort({ createdAt: -1 }).limit(limit);
  return success(res, 200, 'Crawl logs fetched.', { logs, count: logs.length });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/pages
 * Paginated list of crawled pages for the technical SEO module UI.
 */
async function getPages(req, res) {
  const { siteId } = req.params;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Number(req.query.pageSize) || 25, 100);

  const [pages, total] = await Promise.all([
    PageRaw.find({ site_id: siteId })
      .sort({ crawled_at: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    PageRaw.countDocuments({ site_id: siteId }),
  ]);

  return success(res, 200, 'Pages fetched.', {
    pages,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/audit
 * A simple aggregate health score built from what Phase 2 already
 * crawled: broken pages, missing titles/meta, thin content, missing
 * canonical tags. Deeper scoring (CWV-weighted, schema completeness)
 * can be layered on top of this in a later phase without changing
 * the underlying PageRaw data shape.
 */
async function getAuditSummary(req, res) {
  const { siteId } = req.params;

  const pages = await PageRaw.find({ site_id: siteId });
  const totalPages = pages.length;

  if (totalPages === 0) {
    return success(res, 200, 'No crawl data yet for this site.', {
      totalPages: 0,
      healthScore: null,
      issues: {},
    });
  }

  const issues = {
    brokenPages: pages.filter((p) => p.status_code >= 400 || p.status_code === 0).length,
    missingTitle: pages.filter((p) => !p.title).length,
    missingMetaDescription: pages.filter((p) => !p.meta_description).length,
    missingCanonical: pages.filter((p) => !p.canonical_url).length,
    thinContent: pages.filter((p) => p.word_count > 0 && p.word_count < 300).length,
    noindexPages: pages.filter((p) => !p.is_indexable).length,
    poorLCP: pages.filter((p) => p.core_web_vitals?.lcp > 4000).length, // >4s is "poor" per CWV thresholds
    highCLS: pages.filter((p) => p.core_web_vitals?.cls > 0.25).length, // >0.25 is "poor"
  };

  const totalIssueWeight =
    issues.brokenPages * 3 +
    issues.missingTitle * 2 +
    issues.missingMetaDescription * 1 +
    issues.missingCanonical * 1 +
    issues.thinContent * 1 +
    issues.poorLCP * 2 +
    issues.highCLS * 2;

  const maxPossibleWeight = totalPages * 12; // sum of all weights above, worst case
  const healthScore = Math.max(0, Math.round(100 - (totalIssueWeight / maxPossibleWeight) * 100));

  return success(res, 200, 'Audit summary generated.', { totalPages, healthScore, issues });
}

module.exports = { enqueueCrawl, getCrawlLogs, getPages, getAuditSummary };
