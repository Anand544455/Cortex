const { Site } = require('../models/sql');
const { BacklinkIndex } = require('../models/mongo');
const { parseBacklinkCsv } = require('../services/backlinks/csvImportService');
const { getBacklinkProvider } = require('../services/backlinks');
const { syncBacklinks } = require('../services/backlinks/linkDiffer');
const { scoreBacklinkIndex } = require('../services/backlinks/toxicScorer');
const { generateDisavowFile } = require('../services/backlinks/disavowGenerator');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/backlinks/import
 * multipart/form-data with a "file" field containing an Ahrefs/SEMrush/
 * Moz CSV export. Treated as a MERGE (doesn't mark anything as "lost" -
 * a CSV export is rarely your complete, current backlink profile).
 */
async function importBacklinksCsv(req, res) {
  const { siteId } = req.params;

  if (!req.file) return failure(res, 400, 'Upload a CSV file using the "file" form field.');

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  let parsedLinks;
  try {
    parsedLinks = parseBacklinkCsv(req.file.buffer);
  } catch (err) {
    return failure(res, 400, err.message);
  }

  if (parsedLinks.length === 0) {
    return failure(res, 400, 'No valid backlink rows found in that file.');
  }

  const summary = await syncBacklinks(siteId, parsedLinks, { markLostForMissing: false });
  return success(res, 201, 'Backlink CSV imported.', summary);
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/backlinks/sync
 * Pulls the site's full backlink profile from the configured licensed
 * API provider. Treated as a FULL SYNC - links missing from this fetch
 * that were previously "active" get marked "lost".
 */
async function syncBacklinksFromApi(req, res) {
  const { siteId } = req.params;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const provider = getBacklinkProvider();

  let freshLinks;
  try {
    freshLinks = await provider.fetchBacklinks(site.domain);
  } catch (err) {
    return failure(res, 502, `Backlink API sync failed: ${err.message}`);
  }

  const summary = await syncBacklinks(siteId, freshLinks, { markLostForMissing: true });
  return success(res, 200, 'Backlink sync complete.', summary);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/backlinks?status=active&toxic=true&page=1
 */
async function listBacklinks(req, res) {
  const { siteId } = req.params;
  const { status, toxic } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Number(req.query.pageSize) || 25, 100);

  const query = { site_id: siteId };
  if (status) query.status = status;
  if (toxic !== undefined) query.is_toxic = toxic === 'true';

  const [links, total] = await Promise.all([
    BacklinkIndex.find(query)
      .sort({ last_seen: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    BacklinkIndex.countDocuments(query),
  ]);

  return success(res, 200, 'Backlinks fetched.', {
    links,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/backlinks/summary
 */
async function getBacklinkSummary(req, res) {
  const { siteId } = req.params;

  const [totalActive, totalLost, totalToxic, referringDomains] = await Promise.all([
    BacklinkIndex.countDocuments({ site_id: siteId, status: 'active' }),
    BacklinkIndex.countDocuments({ site_id: siteId, status: 'lost' }),
    BacklinkIndex.countDocuments({ site_id: siteId, is_toxic: true, status: 'active' }),
    BacklinkIndex.distinct('source_domain', { site_id: siteId, status: 'active' }),
  ]);

  return success(res, 200, 'Backlink summary generated.', {
    totalActiveLinks: totalActive,
    totalLostLinks: totalLost,
    totalToxicLinks: totalToxic,
    referringDomains: referringDomains.length,
  });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/backlinks/rescan-toxic
 * Re-runs the toxic scorer over the site's whole existing index -
 * useful after updating the spam keyword/TLD rules, without needing
 * to re-import or re-sync any data.
 */
async function rescanToxicLinks(req, res) {
  const { siteId } = req.params;

  const links = await BacklinkIndex.find({ site_id: siteId, status: 'active' }).lean();
  const rescored = scoreBacklinkIndex(links);

  let updatedCount = 0;
  for (const link of rescored) {
    await BacklinkIndex.updateOne(
      { _id: link._id },
      { is_toxic: link.is_toxic, toxic_reason: link.toxic_reason }
    );
    updatedCount++;
  }

  const toxicCount = rescored.filter((l) => l.is_toxic).length;
  return success(res, 200, 'Toxic rescan complete.', { updatedCount, toxicCount });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/backlinks/disavow
 * Returns a downloadable disavow.txt for direct upload to Google Search Console.
 */
async function getDisavowFile(req, res) {
  const { siteId } = req.params;

  const toxicLinks = await BacklinkIndex.find({ site_id: siteId, is_toxic: true, status: 'active' }).lean();

  if (toxicLinks.length === 0) {
    return failure(res, 404, 'No toxic links found for this site - nothing to disavow.');
  }

  const fileContent = generateDisavowFile(toxicLinks);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="disavow.txt"');
  return res.status(200).send(fileContent);
}

module.exports = {
  importBacklinksCsv,
  syncBacklinksFromApi,
  listBacklinks,
  getBacklinkSummary,
  rescanToxicLinks,
  getDisavowFile,
};
