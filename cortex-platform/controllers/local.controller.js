const { Site } = require('../models/sql');
const { GeoGridResult } = require('../models/mongo');
const { runGeoGridCheck } = require('../services/local/geoGrid');
const { scanNapConsistency } = require('../services/local/napScanner');
const { generateGoogleReviewLink, analyzeSentiment } = require('../services/local/reviewTools');
const gbpProvider = require('../services/local/gbpProvider');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/local/geo-grid
 * Body: { keyword, centerLat, centerLng, radiusKm?, gridSize? }
 */
async function runGeoGrid(req, res) {
  const { siteId } = req.params;
  const { keyword, centerLat, centerLng, radiusKm, gridSize } = req.body;

  if (!keyword || centerLat === undefined || centerLng === undefined) {
    return failure(res, 400, 'keyword, centerLat, and centerLng are required.');
  }
  if (gridSize > 7) {
    return failure(res, 400, 'gridSize capped at 7 (49 points) per request - each point is a live SERP check.');
  }

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const result = await runGeoGridCheck(site, keyword, {
    centerLat: Number(centerLat),
    centerLng: Number(centerLng),
    radiusKm: radiusKm ? Number(radiusKm) : undefined,
    gridSize: gridSize ? Number(gridSize) : undefined,
  });

  return success(res, 200, 'Geo-grid check complete.', result);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/local/geo-grid?keyword=...
 * Latest saved grid results for a keyword (for rendering the heatmap).
 */
async function getLatestGeoGrid(req, res) {
  const { siteId } = req.params;
  const { keyword } = req.query;
  if (!keyword) return failure(res, 400, 'keyword query parameter is required.');

  const latest = await GeoGridResult.findOne({ site_id: siteId, keyword }).sort({ captured_at: -1 });
  if (!latest) return failure(res, 404, 'No geo-grid data yet for that keyword.');

  const results = await GeoGridResult.find({ site_id: siteId, keyword, captured_at: latest.captured_at });
  return success(res, 200, 'Latest geo-grid data fetched.', { results, count: results.length });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/local/nap-scan
 * Body: { businessName, phone? }
 */
async function runNapScan(req, res) {
  const { businessName, phone } = req.body;
  if (!businessName) return failure(res, 400, 'businessName is required.');

  const result = await scanNapConsistency(businessName, phone);
  return success(res, 200, 'NAP consistency scan complete.', result);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/local/review-link?placeId=...
 */
async function getReviewLink(req, res) {
  const { placeId } = req.query;
  if (!placeId) return failure(res, 400, 'placeId query parameter is required.');

  const link = generateGoogleReviewLink(placeId);
  return success(res, 200, 'Review link generated.', { link });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/local/review-sentiment
 * Body: { reviewText }
 */
async function scoreSentiment(req, res) {
  const { reviewText } = req.body;
  if (!reviewText) return failure(res, 400, 'reviewText is required.');

  const result = analyzeSentiment(reviewText);
  return success(res, 200, 'Sentiment analyzed.', result);
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/local/gbp/posts
 * Body: { accountId, locationId, summary, callToActionType?, callToActionUrl? }
 */
async function createGbpPost(req, res) {
  const { accountId, locationId, summary, callToActionType, callToActionUrl } = req.body;
  if (!accountId || !locationId || !summary) {
    return failure(res, 400, 'accountId, locationId, and summary are required.');
  }

  try {
    const result = await gbpProvider.createLocalPost(accountId, locationId, {
      summary,
      callToActionType,
      callToActionUrl,
    });
    return success(res, 201, 'Google Business Profile post created.', { result });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/local/gbp/questions?accountId=&locationId=
 */
async function getGbpQuestions(req, res) {
  const { accountId, locationId } = req.query;
  if (!accountId || !locationId) return failure(res, 400, 'accountId and locationId query parameters are required.');

  try {
    const questions = await gbpProvider.listQuestions(accountId, locationId);
    return success(res, 200, 'GBP questions fetched.', { questions, count: questions.length });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

module.exports = {
  runGeoGrid,
  getLatestGeoGrid,
  runNapScan,
  getReviewLink,
  scoreSentiment,
  createGbpPost,
  getGbpQuestions,
};
