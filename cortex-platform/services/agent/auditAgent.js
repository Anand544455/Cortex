const { TrackedKeyword } = require('../../models/sql');
const { PageRaw, BacklinkIndex } = require('../../models/mongo');
const { findDuplicateContent } = require('../content/duplicateDetector');
const { findCannibalization } = require('../content/cannibalizationDetector');
const { findContentDecay } = require('../content/decayDetector');
const { suggestInternalLinks } = require('../content/internalLinkSuggester');
const { auditAiCrawlerAccess } = require('../aeo/aiCrawlerAuditor');

/**
 * This is "our own AI agent" in the honest sense: not a wrapper around
 * a paid LLM, but an orchestration layer that runs EVERY self-hosted
 * analysis module already built across the platform, combines the
 * results into one prioritized list, and scores overall site health.
 * Zero external cost, zero third-party dependency - every signal here
 * comes from data CORTEX already collected itself (crawl, backlinks,
 * rank history) or from free official APIs you've optionally connected
 * (Search Console, PageSpeed Insights).
 *
 * Runs entirely deterministically - same input data always produces
 * the same findings, in the same order. suggestionEngine.js is the
 * layer on top that turns these findings into readable prose.
 */
async function runFullAudit(site) {
  const findings = [];

  const [pages, duplicates, cannibalization, decay, internalLinks, toxicBacklinks, crawlerAudit] = await Promise.all([
    PageRaw.find({ site_id: site.id }).lean(),
    findDuplicateContent(await PageRaw.find({ site_id: site.id }, 'url content_fingerprint').lean()),
    findCannibalization(site.id, site.domain),
    findContentDecay(site.id),
    suggestInternalLinks(await PageRaw.find({ site_id: site.id }, 'url title internal_links_to').lean()),
    BacklinkIndex.find({ site_id: site.id, is_toxic: true, status: 'active' }).lean(),
    auditAiCrawlerAccess(`https://${site.domain}`).catch(() => []),
  ]);

  if (pages.length === 0) {
    findings.push(sev('high', 'crawl', 'No crawl data yet', 'This site has never been crawled - run a crawl first so the agent has anything to analyze.', []));
  } else {
    const broken = pages.filter((p) => p.status_code >= 400 || p.status_code === 0);
    if (broken.length > 0) {
      findings.push(sev('high', 'technical', `${broken.length} broken page(s)`, 'Pages returning errors lose both users and crawl budget.', broken.slice(0, 10).map((p) => p.url)));
    }

    const missingTitles = pages.filter((p) => !p.title);
    if (missingTitles.length > 0) {
      findings.push(sev('high', 'technical', `${missingTitles.length} page(s) missing a title tag`, 'Every indexable page needs a unique, descriptive title tag.', missingTitles.slice(0, 10).map((p) => p.url)));
    }

    const thin = pages.filter((p) => p.word_count > 0 && p.word_count < 300);
    if (thin.length > 0) {
      findings.push(sev('medium', 'content', `${thin.length} thin-content page(s) (under 300 words)`, 'Thin pages rarely rank for competitive terms and can dilute overall site quality signals.', thin.slice(0, 10).map((p) => p.url)));
    }

    const noSchema = pages.filter((p) => (!p.schema_types_found || p.schema_types_found.length === 0) && p.title);
    if (noSchema.length > pages.length * 0.5) {
      findings.push(sev('low', 'aeo', 'Most pages have no structured data', 'Adding FAQ/Article/HowTo schema (AEO/GEO Lab module) improves eligibility for rich results and AI-answer citation.', []));
    }
  }

  if (duplicates.length > 0) {
    findings.push(sev('medium', 'content', `${duplicates.length} near-duplicate page pair(s)`, 'Near-identical pages can split ranking signals and confuse which version Google should show.', duplicates.slice(0, 5).map((d) => `${d.pageA} ~ ${d.pageB}`)));
  }
  if (cannibalization.length > 0) {
    findings.push(sev('high', 'content', `${cannibalization.length} keyword(s) with cannibalization`, 'Two of your own pages are competing for the same search results - typically both rank worse than one consolidated page would.', cannibalization.slice(0, 5).map((c) => c.keyword)));
  }
  if (decay.length > 0) {
    findings.push(sev('high', 'content', `${decay.length} keyword(s) trending downward`, 'These pages used to rank better and are sliding - often fixable with a content refresh.', decay.slice(0, 5).map((d) => `${d.keyword} (${d.priorAveragePosition} -> ${d.recentAveragePosition})`)));
  }
  if (internalLinks.length > 0) {
    findings.push(sev('low', 'content', `${internalLinks.length} internal-linking opportunity/opportunities`, 'Topically related pages that could reinforce each other with an internal link.', internalLinks.slice(0, 5).map((s) => `${s.pageA.title} <-> ${s.pageB.title}`)));
  }

  if (toxicBacklinks.length > 0) {
    findings.push(sev('medium', 'backlinks', `${toxicBacklinks.length} toxic backlink(s) flagged`, 'Consider reviewing and disavowing these (Backlink Engine module has a one-click disavow.txt export).', toxicBacklinks.slice(0, 10).map((b) => b.source_domain)));
  }

  const blockedBots = (crawlerAudit || []).filter((b) => !b.allowed);
  if (blockedBots.length > 0) {
    findings.push(sev('medium', 'aeo', `${blockedBots.length} AI crawler(s) blocked in robots.txt`, 'Blocking these prevents citation eligibility in that AI assistant entirely, even with great content.', blockedBots.map((b) => `${b.name} (${b.owner})`)));
  }

  const trackedCount = await TrackedKeyword.count({ where: { site_id: site.id, is_active: true } });
  if (trackedCount === 0) {
    findings.push(sev('low', 'keywords', 'No keywords being tracked', 'Add keywords in the Keyword Intelligence module to unlock rank tracking, decay detection, and cannibalization checks.', []));
  }

  return {
    site: { id: site.id, domain: site.domain },
    generatedAt: new Date().toISOString(),
    healthScore: computeHealthScore(findings),
    totalFindings: findings.length,
    findings: findings.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]),
  };
}

const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };

function sev(severity, category, title, description, affected) {
  return { severity, category, title, description, affectedCount: affected.length, affectedSample: affected };
}

function computeHealthScore(findings) {
  const penalty = findings.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity] * 5, 0);
  return Math.max(0, 100 - penalty);
}

module.exports = { runFullAudit };
