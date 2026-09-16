const { Site } = require('../models/sql');
const { PageRaw } = require('../models/mongo');
const { scoreContent } = require('../services/content/onPageScorer');
const { generateContentBrief } = require('../services/content/briefGenerator');
const { findDuplicateContent } = require('../services/content/duplicateDetector');
const { findCannibalization } = require('../services/content/cannibalizationDetector');
const { findContentDecay } = require('../services/content/decayDetector');
const { suggestInternalLinks } = require('../services/content/internalLinkSuggester');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/content/score
 * Body: { title, metaDescription, h1, bodyText, targetKeyword }
 * Stateless - scores whatever content is pasted in, no DB read needed.
 * This is what powers a "live score as you type" editor UI.
 */
async function scoreOnPageContent(req, res) {
  const { title, metaDescription, h1, bodyText, targetKeyword } = req.body;

  if (!bodyText || !targetKeyword) {
    return failure(res, 400, 'bodyText and targetKeyword are required.');
  }

  const result = scoreContent({ title, metaDescription, h1, bodyText, targetKeyword });
  return success(res, 200, 'Content scored.', result);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/content/brief?keyword=...
 */
async function getContentBrief(req, res) {
  const { keyword } = req.query;
  if (!keyword) return failure(res, 400, 'keyword query parameter is required.');

  const brief = await generateContentBrief(keyword);
  return success(res, 200, 'Content brief generated.', brief);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/content/duplicates
 */
async function getDuplicateContent(req, res) {
  const { siteId } = req.params;
  const pages = await PageRaw.find({ site_id: siteId }, 'url content_fingerprint').lean();

  if (pages.length < 2) {
    return success(res, 200, 'Not enough crawled pages yet to compare.', { duplicatePairs: [] });
  }

  const duplicatePairs = findDuplicateContent(pages);
  return success(res, 200, 'Duplicate content scan complete.', { duplicatePairs, pagesCompared: pages.length });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/content/cannibalization
 */
async function getCannibalization(req, res) {
  const { siteId } = req.params;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const findings = await findCannibalization(siteId, site.domain);
  return success(res, 200, 'Cannibalization scan complete.', { findings, count: findings.length });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/content/decay?recentDays=14&priorDays=14
 */
async function getContentDecay(req, res) {
  const { siteId } = req.params;
  const recentDays = Number(req.query.recentDays) || 14;
  const priorDays = Number(req.query.priorDays) || 14;

  const findings = await findContentDecay(siteId, { recentDays, priorDays });
  return success(res, 200, 'Content decay scan complete.', { findings, count: findings.length });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/content/internal-links
 */
async function getInternalLinkSuggestions(req, res) {
  const { siteId } = req.params;
  const pages = await PageRaw.find({ site_id: siteId }, 'url title internal_links_to').lean();

  if (pages.length < 2) {
    return success(res, 200, 'Not enough crawled pages yet for link suggestions.', { suggestions: [] });
  }

  const suggestions = suggestInternalLinks(pages);
  return success(res, 200, 'Internal link suggestions generated.', { suggestions, count: suggestions.length });
}

module.exports = {
  scoreOnPageContent,
  getContentBrief,
  getDuplicateContent,
  getCannibalization,
  getContentDecay,
  getInternalLinkSuggestions,
};
