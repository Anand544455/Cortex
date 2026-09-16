const { getSerpProvider } = require('./serp');
const { RankHistory } = require('../models/sql');
const { SerpSnapshot } = require('../models/mongo');
const logger = require('../utils/logger.util');

/**
 * For every TrackedKeyword row passed in:
 *   1. Ask the active SERP provider for the current top results
 *   2. Find the site's own domain in that list (or null if not ranked)
 *   3. Write one RankHistory row (SQL - queried for trend charts)
 *   4. Write one SerpSnapshot document (Mongo - full result list + features)
 *
 * Runs sequentially with a small delay between checks, not in parallel -
 * this avoids hammering whichever SERP provider is configured (matters
 * even more for the Puppeteer fallback, to reduce CAPTCHA risk).
 */
async function trackKeywords(site, trackedKeywords, onProgress = () => {}) {
  const provider = getSerpProvider();
  const siteDomain = site.domain.replace(/^www\./, '');

  let checked = 0;
  let found = 0;
  let notFound = 0;
  let errors = 0;

  for (const tk of trackedKeywords) {
    try {
      const serp = await provider.search(tk.keyword, {
        device: tk.device,
        location: tk.location,
        searchEngine: tk.search_engine,
      });

      const match = serp.results.find((r) => r.domain === siteDomain);
      const position = match ? match.position : null;

      await RankHistory.create({
        site_id: site.id,
        keyword: tk.keyword,
        position,
        search_engine: tk.search_engine,
        device: tk.device,
        location: tk.location,
        checked_at: new Date(),
      });

      await SerpSnapshot.create({
        site_id: site.id,
        keyword: tk.keyword,
        search_engine: tk.search_engine,
        location: tk.location,
        results: serp.results,
        serp_features: serp.serp_features,
        ai_overview_present: serp.ai_overview_present,
        ai_overview_cites_site: serp.ai_overview_cites_domains?.includes(siteDomain) || false,
        captured_at: new Date(),
      });

      position ? found++ : notFound++;
      checked++;
      onProgress({ checked, total: trackedKeywords.length, keyword: tk.keyword, position });
    } catch (err) {
      errors++;
      logger.error(`Rank check failed for "${tk.keyword}" (${site.domain}): ${err.message}`);
    }

    // Small pacing delay between keyword checks.
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return { checked, found, notFound, errors, total: trackedKeywords.length };
}

module.exports = { trackKeywords };
