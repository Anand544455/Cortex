const { Site } = require('../models/sql');
const { runFullAudit } = require('../services/agent/auditAgent');
const { buildActionPlan } = require('../services/agent/suggestionEngine');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/agent/audit
 * Runs the full self-hosted audit + builds the readable action plan
 * in one call - this is the single "just tell me what to do" button.
 */
async function runAgentAudit(req, res) {
  const { siteId } = req.params;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const auditResult = await runFullAudit(site);
  const actionPlan = await buildActionPlan(auditResult);

  return success(res, 200, 'Agent audit complete.', { ...auditResult, ...actionPlan });
}

module.exports = { runAgentAudit };
