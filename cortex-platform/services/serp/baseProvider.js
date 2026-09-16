/**
 * Every SERP provider must resolve to this exact shape so the rest of
 * the app (rankTracker, keywordGap, etc.) never needs to know which
 * provider is actually running underneath.
 *
 * {
 *   results: [{ position: 1, url, title, domain }, ...],   // top N organic results
 *   local_pack_results: [{ position, title, place_id, address, rating }, ...], // Local Pack / Maps results, if any
 *   serp_features: ['featured_snippet', 'people_also_ask', 'ai_overview', 'local_pack'],
 *   ai_overview_present: boolean,
 *   ai_overview_cites_domains: string[],                    // domains cited inside the AI Overview, if any
 * }
 *
 * search(keyword, { device, location, searchEngine }) => Promise<ShapeAbove>
 */
class BaseSerpProvider {
  // eslint-disable-next-line no-unused-vars
  async search(keyword, options = {}) {
    throw new Error('search() must be implemented by a concrete SERP provider.');
  }
}

module.exports = BaseSerpProvider;
