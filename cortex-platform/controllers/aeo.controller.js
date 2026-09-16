const { Site } = require('../models/sql');
const { AiCitation, PageRaw } = require('../models/mongo');
const { trackCitation, getCitationShareOfVoice } = require('../services/aeo/citationTracker');
const schemaGenerator = require('../services/aeo/schemaGenerator');
const { scoreAnswerFormat } = require('../services/aeo/answerScorer');
const { generateLlmsTxt } = require('../services/aeo/llmsTxtGenerator');
const { auditAiCrawlerAccess } = require('../services/aeo/aiCrawlerAuditor');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/aeo/citations/check
 * Body: { prompt }
 */
async function checkCitation(req, res) {
  const { siteId } = req.params;
  const { prompt } = req.body;
  if (!prompt) return failure(res, 400, 'prompt is required.');

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const results = await trackCitation(site, prompt);
  return success(res, 200, 'Citation check complete.', { prompt, results });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/aeo/citations?engine=&page=
 */
async function listCitations(req, res) {
  const { siteId } = req.params;
  const { engine } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Number(req.query.pageSize) || 25, 100);

  const query = { site_id: siteId };
  if (engine) query.engine = engine;

  const [citations, total] = await Promise.all([
    AiCitation.find(query).sort({ checked_at: -1 }).skip((page - 1) * pageSize).limit(pageSize),
    AiCitation.countDocuments(query),
  ]);

  return success(res, 200, 'Citations fetched.', {
    citations,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/aeo/citations/share-of-voice
 */
async function shareOfVoice(req, res) {
  const { siteId } = req.params;
  const summary = await getCitationShareOfVoice(siteId);
  return success(res, 200, 'Citation share-of-voice calculated.', { summary });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/aeo/schema/:type
 * type = faq | howto | article | product
 */
async function generateSchema(req, res) {
  const { type } = req.params;

  const generators = {
    faq: () => schemaGenerator.generateFaqSchema(req.body.faqs || []),
    howto: () => schemaGenerator.generateHowToSchema(req.body),
    article: () => schemaGenerator.generateArticleSchema(req.body),
    product: () => schemaGenerator.generateProductSchema(req.body),
  };

  const generator = generators[type];
  if (!generator) return failure(res, 400, 'type must be one of: faq, howto, article, product.');

  const schema = generator();
  return success(res, 200, 'Structured data generated.', {
    schema,
    embedTag: `<script type="application/ld+json">${JSON.stringify(schema)}</script>`,
  });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/aeo/answer-score
 * Body: { bodyText, headings: [{ text }] }
 */
async function scoreAnswerFormatting(req, res) {
  const { bodyText, headings } = req.body;
  if (!bodyText) return failure(res, 400, 'bodyText is required.');

  const result = scoreAnswerFormat({ bodyText, headings: headings || [] });
  return success(res, 200, 'Answer-format score generated.', result);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/aeo/llms-txt
 * Builds from the site's already-crawled pages - top pages by word
 * count as a simple proxy for "most substantial content".
 */
async function getLlmsTxt(req, res) {
  const { siteId } = req.params;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const topPages = await PageRaw.find({ site_id: siteId, title: { $ne: null } })
    .sort({ word_count: -1 })
    .limit(20)
    .lean();

  const content = generateLlmsTxt({
    siteName: site.display_name || site.domain,
    description: `Content indexed by CORTEX from ${site.domain}.`,
    keyPages: topPages.map((p) => ({ title: p.title, url: p.url, summary: p.meta_description })),
  });

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="llms.txt"');
  return res.status(200).send(content);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/aeo/ai-crawler-audit
 */
async function getAiCrawlerAudit(req, res) {
  const { siteId } = req.params;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const audit = await auditAiCrawlerAccess(`https://${site.domain}`);
  return success(res, 200, 'AI crawler access audit complete.', { audit });
}

module.exports = {
  checkCitation,
  listCitations,
  shareOfVoice,
  generateSchema,
  scoreAnswerFormatting,
  getLlmsTxt,
  getAiCrawlerAudit,
};
