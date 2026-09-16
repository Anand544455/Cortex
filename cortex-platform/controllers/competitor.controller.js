const { Site } = require('../models/sql');
const { calculateShareOfVoice } = require('../services/competitor/shareOfVoice');
const { analyzeContentCadence } = require('../services/competitor/contentCadence');
const { findRivalRankingChanges } = require('../services/competitor/rivalAlerts');
const { estimateTotalTraffic } = require('../services/competitor/trafficEstimator');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/competitors/share-of-voice
 * Body: { competitorDomains: string[], days? }
 */
async function getShareOfVoice(req, res) {
  const { siteId } = req.params;
  const { competitorDomains, days } = req.body;

  if (!Array.isArray(competitorDomains) || competitorDomains.length === 0) {
    return failure(res, 400, 'competitorDomains must be a non-empty array.');
  }

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const result = await calculateShareOfVoice(siteId, site.domain, competitorDomains, days || 30);
  return success(res, 200, 'Share-of-voice calculated.', result);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/competitors/content-cadence?domain=...
 */
async function getContentCadence(req, res) {
  const { domain } = req.query;
  if (!domain) return failure(res, 400, 'domain query parameter is required.');

  const result = await analyzeContentCadence(domain);
  return success(res, 200, 'Content cadence analysis complete.', result);
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/competitors/alerts
 * Body: { competitorDomains: string[] }
 */
async function getRivalAlerts(req, res) {
  const { siteId } = req.params;
  const { competitorDomains } = req.body;

  if (!Array.isArray(competitorDomains) || competitorDomains.length === 0) {
    return failure(res, 400, 'competitorDomains must be a non-empty array.');
  }

  const alerts = await findRivalRankingChanges(siteId, competitorDomains);
  return success(res, 200, 'Rival ranking-change scan complete.', { alerts, count: alerts.length });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/competitors/traffic-estimate
 * Body: { keywordData: [{ keyword, position, monthlySearchVolume }] }
 */
async function getTrafficEstimate(req, res) {
  const { keywordData } = req.body;

  if (!Array.isArray(keywordData) || keywordData.length === 0) {
    return failure(res, 400, 'keywordData must be a non-empty array of { keyword, position, monthlySearchVolume }.');
  }

  const result = estimateTotalTraffic(keywordData);
  return success(res, 200, 'Traffic estimate calculated.', result);
}

module.exports = { getShareOfVoice, getContentCadence, getRivalAlerts, getTrafficEstimate };
