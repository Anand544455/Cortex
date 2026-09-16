const { getConfiguredLlmProviders } = require('./llmProviders');
const { getSerpProvider } = require('../serp');
const { AiCitation } = require('../../models/mongo');

/**
 * Runs one prompt against every configured LLM (Claude, ChatGPT - see
 * llmProviders/index.js) and checks whether the response mentions the
 * site's own domain. Separately, Google's AI Overview can't be queried
 * directly (no public API for it) - instead this reuses the
 * ai_overview_present / ai_overview_cites_site fields that Phase 3's
 * SERP provider already captures when checking that same prompt as a
 * search query, so AI Overview visibility is covered without needing
 * any extra integration.
 */
async function trackCitation(site, prompt) {
  const results = [];
  const siteDomain = site.domain.replace(/^www\./, '');
  const providers = getConfiguredLlmProviders();

  for (const { engine, provider } of providers) {
    try {
      const responseText = await provider.ask(prompt);
      const wasCited = responseText.toLowerCase().includes(siteDomain.toLowerCase());

      const record = await AiCitation.create({
        site_id: site.id,
        engine,
        prompt,
        was_cited: wasCited,
        raw_response_excerpt: responseText.slice(0, 500),
        checked_at: new Date(),
      });

      results.push({ engine, wasCited, citationId: record._id });
    } catch (err) {
      results.push({ engine, error: err.message });
    }
  }

  // AI Overview check via the SERP provider (reusing Phase 3 infrastructure).
  try {
    const serpProvider = getSerpProvider();
    const serp = await serpProvider.search(prompt, {});
    const citedInOverview = serp.ai_overview_cites_domains?.includes(siteDomain) || false;

    const record = await AiCitation.create({
      site_id: site.id,
      engine: 'google_ai_overview',
      prompt,
      was_cited: citedInOverview,
      cited_url: citedInOverview ? site.domain : undefined,
      competitor_domains_cited: (serp.ai_overview_cites_domains || []).filter((d) => d !== siteDomain),
      checked_at: new Date(),
    });

    results.push({ engine: 'google_ai_overview', wasCited: citedInOverview, citationId: record._id });
  } catch (err) {
    results.push({ engine: 'google_ai_overview', error: err.message });
  }

  return results;
}

/**
 * Aggregate citation share-of-voice for a site across all checks so far.
 */
async function getCitationShareOfVoice(siteId) {
  const records = await AiCitation.find({ site_id: siteId });

  const byEngine = {};
  records.forEach((r) => {
    if (!byEngine[r.engine]) byEngine[r.engine] = { total: 0, cited: 0 };
    byEngine[r.engine].total += 1;
    if (r.was_cited) byEngine[r.engine].cited += 1;
  });

  const summary = Object.entries(byEngine).map(([engine, { total, cited }]) => ({
    engine,
    totalChecks: total,
    citedCount: cited,
    citationRate: total > 0 ? Math.round((cited / total) * 100) : 0,
  }));

  return summary;
}

module.exports = { trackCitation, getCitationShareOfVoice };
