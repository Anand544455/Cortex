const localLlm = require('./localLlmProvider');
const logger = require('../../utils/logger.util');

/**
 * Template-based recommendation text per category+severity - this is
 * what runs by default, for every single user, with zero setup and
 * zero cost. Deliberately specific rather than generic, since these
 * are written once and reused, not generated per-request.
 */
const ACTION_TEMPLATES = {
  crawl: 'Run a crawl for this site from the Crawl & Technical SEO module before anything else - every other module depends on that data.',
  technical: 'Open the Crawl & Technical SEO module, sort the page list by the flagged issue, and work through them - these are usually quick, mechanical fixes.',
  content: 'Open the Content Studio module and use the on-page scorer on the affected pages - it will show exactly which checks are failing.',
  backlinks: 'Open the Backlink Engine module, review the flagged links, and download the disavow.txt if you agree they look toxic.',
  aeo: 'Open the AEO/GEO Lab module - the Schema Generator and AI Crawler Audit tabs address this directly.',
  keywords: 'Open the Keyword Intelligence module and add your priority target keywords - this unlocks rank tracking and decay/cannibalization detection for them.',
};

/**
 * Builds a prioritized, human-readable action plan from the agent's
 * findings. Uses a local LLM (Ollama) to write more natural
 * explanations IF one is configured - otherwise (the default, for
 * everyone) falls back to the templates above, which are perfectly
 * usable on their own. Never fails the whole request if the LLM step
 * fails - that's an enhancement, not a dependency.
 */
async function buildActionPlan(auditResult) {
  const { findings, healthScore, site } = auditResult;

  const plan = findings.map((finding, index) => ({
    priority: index + 1,
    severity: finding.severity,
    category: finding.category,
    title: finding.title,
    whatWeFound: finding.description,
    whatToDoNextSteps: ACTION_TEMPLATES[finding.category] || 'Review this finding in the relevant module.',
    affectedCount: finding.affectedCount,
    affectedSample: finding.affectedSample,
  }));

  let narrativeSummary = buildTemplateSummary(site.domain, healthScore, findings);

  if (localLlm.isConfigured()) {
    try {
      narrativeSummary = await buildLlmSummary(site.domain, healthScore, findings);
    } catch (err) {
      logger.warn(`Local LLM summary failed, using template summary instead: ${err.message}`);
    }
  }

  return { narrativeSummary, healthScore, totalFindings: findings.length, plan };
}

function buildTemplateSummary(domain, healthScore, findings) {
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const tone =
    healthScore >= 80 ? 'in good shape' : healthScore >= 50 ? 'showing real opportunities to improve' : 'in need of focused attention';

  let summary = `${domain} is ${tone}, scoring ${healthScore}/100 across ${findings.length} finding(s).`;
  if (highCount > 0) {
    summary += ` ${highCount} of those are high-priority - start with those before the lower-priority items.`;
  }
  return summary;
}

async function buildLlmSummary(domain, healthScore, findings) {
  const findingsList = findings
    .slice(0, 10)
    .map((f) => `- [${f.severity}] ${f.title}: ${f.description}`)
    .join('\n');

  const prompt = `You are an SEO analyst summarizing an audit for a website owner. Be direct and specific, 3-4 sentences, no fluff, no markdown formatting.

Site: ${domain}
Health score: ${healthScore}/100
Findings:
${findingsList}

Write a short summary of the site's overall state and what to prioritize first.`;

  return localLlm.ask(prompt, {
    system: 'You are a precise, no-nonsense SEO analyst. Never invent data not given to you.',
  });
}

module.exports = { buildActionPlan };
