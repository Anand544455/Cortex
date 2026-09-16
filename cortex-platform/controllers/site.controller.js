const { Site, Workspace } = require('../models/sql');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites
 * Adds a new tracked website to a workspace. No hard limit on count -
 * Phase 2 (crawl engine) will read this table to know what to crawl.
 */
async function createSite(req, res) {
  const { workspaceId } = req.params;
  const { domain, display_name, timezone } = req.body;

  if (!domain) return failure(res, 400, 'domain is required.');

  const workspace = await Workspace.findByPk(workspaceId);
  if (!workspace) return failure(res, 404, 'Workspace not found.');

  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

  const existing = await Site.findOne({ where: { workspace_id: workspaceId, domain: cleanDomain } });
  if (existing) return failure(res, 409, 'This domain is already tracked in this workspace.');

  const site = await Site.create({
    workspace_id: workspaceId,
    domain: cleanDomain,
    display_name: display_name || cleanDomain,
    timezone: timezone || 'Asia/Kolkata',
    status: 'pending',
  });

  return success(res, 201, 'Site added. Crawl will begin once the crawl engine (Phase 2) is connected.', { site });
}

/**
 * GET /api/workspaces/:workspaceId/sites
 */
async function listSites(req, res) {
  const { workspaceId } = req.params;
  const sites = await Site.findAll({ where: { workspace_id: workspaceId }, order: [['createdAt', 'DESC']] });
  return success(res, 200, 'Sites fetched.', { sites, count: sites.length });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId
 */
async function getSite(req, res) {
  const { workspaceId, siteId } = req.params;
  const site = await Site.findOne({ where: { id: siteId, workspace_id: workspaceId } });
  if (!site) return failure(res, 404, 'Site not found.');
  return success(res, 200, 'Site fetched.', { site });
}

module.exports = { createSite, listSites, getSite };
