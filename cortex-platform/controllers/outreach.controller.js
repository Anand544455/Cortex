const { Site } = require('../models/sql');
const { OutreachProspect, OutreachMessage } = require('../models/mongo');
const { findProspects } = require('../services/backlinks/prospectFinder');
const { outreachQueue } = require('../config/queue');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/prospects/find
 * Body: { niche: string, prospectTypes?: string[] }
 */
async function findAndSaveProspects(req, res) {
  const { siteId } = req.params;
  const { niche, prospectTypes } = req.body;

  if (!niche) return failure(res, 400, 'niche is required (e.g. "data recovery").');

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const discovered = await findProspects(niche, prospectTypes || ['guest_post', 'resource_page']);

  let savedCount = 0;
  let skippedCount = 0;

  for (const prospect of discovered) {
    const existing = await OutreachProspect.findOne({ site_id: siteId, domain: prospect.domain });
    if (existing) {
      skippedCount++;
      continue;
    }

    await OutreachProspect.create({ site_id: siteId, ...prospect });
    savedCount++;
  }

  return success(res, 201, `Found ${discovered.length} candidate(s): ${savedCount} new, ${skippedCount} already tracked.`, {
    savedCount,
    skippedCount,
    totalFound: discovered.length,
  });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/prospects?status=new
 */
async function listProspects(req, res) {
  const { siteId } = req.params;
  const { status } = req.query;

  const query = { site_id: siteId };
  if (status) query.status = status;

  const prospects = await OutreachProspect.find(query).sort({ createdAt: -1 });
  return success(res, 200, 'Prospects fetched.', { prospects, count: prospects.length });
}

/**
 * PATCH /api/workspaces/:workspaceId/sites/:siteId/prospects/:prospectId
 * Body: { contact_email?, contact_name?, notes?, status? }
 * Used to fill in the contact details found manually before outreach.
 */
async function updateProspect(req, res) {
  const { siteId, prospectId } = req.params;
  const { contact_email, contact_name, notes, status } = req.body;

  const prospect = await OutreachProspect.findOne({ _id: prospectId, site_id: siteId });
  if (!prospect) return failure(res, 404, 'Prospect not found.');

  if (contact_email !== undefined) prospect.contact_email = contact_email;
  if (contact_name !== undefined) prospect.contact_name = contact_name;
  if (notes !== undefined) prospect.notes = notes;
  if (status !== undefined) prospect.status = status;

  await prospect.save();
  return success(res, 200, 'Prospect updated.', { prospect });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/prospects/:prospectId/outreach
 * Body: { niche?, senderName? }
 * Queues the send - does not send synchronously in the request.
 */
async function queueOutreach(req, res) {
  const { siteId, prospectId } = req.params;
  const { niche, senderName } = req.body;

  const [site, prospect] = await Promise.all([
    Site.findByPk(siteId),
    OutreachProspect.findOne({ _id: prospectId, site_id: siteId }),
  ]);

  if (!site) return failure(res, 404, 'Site not found.');
  if (!prospect) return failure(res, 404, 'Prospect not found.');
  if (!prospect.contact_email) {
    return failure(res, 400, 'This prospect has no contact_email yet - add one first via PATCH.');
  }

  prospect.status = 'queued';
  await prospect.save();

  const job = await outreachQueue.add(
    'send-outreach-email',
    { prospectId: prospect._id.toString(), siteId: site.id, niche, senderName },
    { removeOnComplete: 100, removeOnFail: 100 }
  );

  return success(res, 202, 'Outreach email queued for sending.', { jobId: job.id });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/prospects/:prospectId/messages
 */
async function getProspectMessages(req, res) {
  const { prospectId } = req.params;
  const messages = await OutreachMessage.find({ prospect_id: prospectId }).sort({ createdAt: -1 });
  return success(res, 200, 'Messages fetched.', { messages, count: messages.length });
}

/**
 * POST /api/outreach/inbound
 * Webhook target for an email provider's inbound-parse feature
 * (e.g. SendGrid Inbound Parse, Mailgun Routes). NOT behind JWT auth -
 * external services can't log in - instead protected by a shared
 * secret header, checked in outreach.routes.js before this runs.
 *
 * Body shape here is intentionally generic ({ from, subject, text }) -
 * map your provider's actual webhook payload to these three fields.
 */
async function handleInboundReply(req, res) {
  const { from, subject, text } = req.body;
  if (!from) return failure(res, 400, 'from is required.');

  const fromEmail = extractEmail(from);
  const prospect = await OutreachProspect.findOne({ contact_email: fromEmail });

  if (!prospect) {
    // Not an error from the email provider's perspective - just nothing to match.
    return success(res, 200, 'No matching prospect for this sender - ignored.');
  }

  await OutreachMessage.create({
    prospect_id: prospect._id.toString(),
    site_id: prospect.site_id,
    direction: 'inbound',
    subject: subject || '(no subject)',
    body_excerpt: (text || '').slice(0, 280),
    status: 'received',
    received_at: new Date(),
  });

  prospect.status = 'replied';
  await prospect.save();

  return success(res, 200, 'Reply recorded.');
}

function extractEmail(fromField) {
  const match = fromField.match(/<(.+)>/);
  return (match ? match[1] : fromField).trim().toLowerCase();
}

module.exports = {
  findAndSaveProspects,
  listProspects,
  updateProspect,
  queueOutreach,
  getProspectMessages,
  handleInboundReply,
};
