const { Op } = require('sequelize');
const { Site, TrackedKeyword, RankHistory } = require('../models/sql');
const { SerpSnapshot } = require('../models/mongo');
const { rankCheckQueue } = require('../config/queue');
const { clusterKeywords } = require('../services/keywordClustering');
const { analyzeKeywordGap } = require('../services/keywordGap');
const { expandSeedKeyword } = require('../services/keywordResearch');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/keywords
 * Body: { keywords: [{ keyword, device?, location?, search_engine?, tag? }] }
 * Accepts one or many at once - bulk-add is the common real-world case
 * (pasting a keyword list from research).
 */
async function addTrackedKeywords(req, res) {
  const { siteId } = req.params;
  const { keywords } = req.body;

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return failure(res, 400, 'keywords must be a non-empty array.');
  }

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const created = [];
  const skipped = [];

  for (const kw of keywords) {
    const keywordText = (kw.keyword || '').trim();
    if (!keywordText) continue;

    const payload = {
      site_id: siteId,
      keyword: keywordText,
      device: kw.device || 'desktop',
      location: kw.location || 'India',
      search_engine: kw.search_engine || 'google',
      tag: kw.tag || null,
    };

    const [record, wasCreated] = await TrackedKeyword.findOrCreate({
      where: {
        site_id: siteId,
        keyword: payload.keyword,
        device: payload.device,
        location: payload.location,
        search_engine: payload.search_engine,
      },
      defaults: payload,
    });

    wasCreated ? created.push(record) : skipped.push(record.keyword);
  }

  return success(res, 201, `Added ${created.length} keyword(s), skipped ${skipped.length} duplicate(s).`, {
    created,
    skippedDuplicates: skipped,
  });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/keywords
 */
async function listTrackedKeywords(req, res) {
  const { siteId } = req.params;
  const keywords = await TrackedKeyword.findAll({ where: { site_id: siteId }, order: [['createdAt', 'DESC']] });
  return success(res, 200, 'Tracked keywords fetched.', { keywords, count: keywords.length });
}

/**
 * DELETE /api/workspaces/:workspaceId/sites/:siteId/keywords/:keywordId
 */
async function removeTrackedKeyword(req, res) {
  const { siteId, keywordId } = req.params;
  const deleted = await TrackedKeyword.destroy({ where: { id: keywordId, site_id: siteId } });
  if (!deleted) return failure(res, 404, 'Tracked keyword not found.');
  return success(res, 200, 'Tracked keyword removed.');
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/keywords/check
 * Queues a rank-check job for every active tracked keyword on this site.
 */
async function enqueueRankCheck(req, res) {
  const { siteId } = req.params;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const activeCount = await TrackedKeyword.count({ where: { site_id: siteId, is_active: true } });
  if (activeCount === 0) {
    return failure(res, 400, 'No active tracked keywords to check. Add some first.');
  }

  const job = await rankCheckQueue.add(
    'rank-check-site',
    { siteId: site.id },
    { removeOnComplete: 100, removeOnFail: 100 }
  );

  return success(res, 202, 'Rank check queued.', { jobId: job.id, keywordCount: activeCount });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/rank-history?keyword=...&days=30
 */
async function getRankHistory(req, res) {
  const { siteId } = req.params;
  const { keyword } = req.query;
  const days = Math.min(Number(req.query.days) || 30, 365);

  const where = { site_id: siteId };
  if (keyword) where.keyword = keyword;

  const since = new Date();
  since.setDate(since.getDate() - days);
  where.checked_at = { [Op.gte]: since };

  const history = await RankHistory.findAll({ where, order: [['checked_at', 'ASC']] });
  return success(res, 200, 'Rank history fetched.', { history, count: history.length });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/serp-snapshot?keyword=...
 * Latest full SERP snapshot (result list + features) for one keyword.
 */
async function getLatestSerpSnapshot(req, res) {
  const { siteId } = req.params;
  const { keyword } = req.query;
  if (!keyword) return failure(res, 400, 'keyword query parameter is required.');

  const snapshot = await SerpSnapshot.findOne({ site_id: siteId, keyword }).sort({ captured_at: -1 });
  if (!snapshot) return failure(res, 404, 'No SERP snapshot found for that keyword yet.');

  return success(res, 200, 'SERP snapshot fetched.', { snapshot });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/keywords/clusters
 * Groups the site's own tracked keywords into topic clusters.
 */
async function getKeywordClusters(req, res) {
  const { siteId } = req.params;
  const tracked = await TrackedKeyword.findAll({ where: { site_id: siteId } });

  if (tracked.length === 0) {
    return success(res, 200, 'No tracked keywords to cluster yet.', { clusters: [] });
  }

  const clusters = clusterKeywords(tracked.map((t) => t.keyword));
  return success(res, 200, 'Keyword clusters generated.', { clusters, totalKeywords: tracked.length });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/keywords/gap
 * Body: { competitorDomains: string[], keywords?: string[] }
 * If keywords is omitted, uses the site's own tracked keyword list.
 */
async function getKeywordGap(req, res) {
  const { siteId } = req.params;
  const { competitorDomains, keywords, device, location, search_engine } = req.body;

  if (!Array.isArray(competitorDomains) || competitorDomains.length === 0) {
    return failure(res, 400, 'competitorDomains must be a non-empty array.');
  }

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  let keywordList = keywords;
  if (!Array.isArray(keywordList) || keywordList.length === 0) {
    const tracked = await TrackedKeyword.findAll({ where: { site_id: siteId, is_active: true } });
    keywordList = tracked.map((t) => t.keyword);
  }

  if (keywordList.length === 0) {
    return failure(res, 400, 'No keywords available to analyze - pass some or track some first.');
  }
  if (keywordList.length > 25) {
    return failure(res, 400, 'Limit gap analysis to 25 keywords per request (each does a live SERP check).');
  }

  const result = await analyzeKeywordGap(site.domain, competitorDomains, keywordList, {
    device: device || 'desktop',
    location: location || 'India',
    searchEngine: search_engine || 'google',
  });

  return success(res, 200, 'Keyword gap analysis complete.', result);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/keywords/expand?seed=...
 * Seed expansion via Google's public autocomplete endpoint.
 */
async function expandKeyword(req, res) {
  const { seed } = req.query;
  if (!seed) return failure(res, 400, 'seed query parameter is required.');

  const suggestions = await expandSeedKeyword(seed.trim());
  return success(res, 200, 'Keyword suggestions generated.', { seed, suggestions, count: suggestions.length });
}

module.exports = {
  addTrackedKeywords,
  listTrackedKeywords,
  removeTrackedKeyword,
  enqueueRankCheck,
  getRankHistory,
  getLatestSerpSnapshot,
  getKeywordClusters,
  getKeywordGap,
  expandKeyword,
};
