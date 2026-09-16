const BaseSerpProvider = require('./baseProvider');
const logger = require('../../utils/logger.util');

/**
 * Talks to a licensed, paid SERP API (SerpApi, ValueSerp, DataForSEO,
 * Serpstack, etc.) rather than scraping Google directly. This is the
 * RECOMMENDED provider for anything beyond light testing - it's
 * reliable, ToS-compliant, and doesn't get blocked by CAPTCHAs.
 *
 * Configure via .env:
 *   SERP_PROVIDER=api
 *   SERP_API_URL=https://serpapi.com/search.json   (example, any compatible provider works)
 *   SERP_API_KEY=your_key_here
 *
 * This adapter assumes a SerpApi-compatible JSON response shape
 * (organic_results[], answer_box, related_questions, ai_overview).
 * If your chosen provider's response shape differs, adjust the mapping
 * in normalizeResponse() only - nothing else in the app needs to change.
 */
class ApiSerpProvider extends BaseSerpProvider {
  constructor() {
    super();
    this.apiUrl = process.env.SERP_API_URL;
    this.apiKey = process.env.SERP_API_KEY;

    if (!this.apiUrl || !this.apiKey) {
      logger.warn(
        'SERP_API_URL / SERP_API_KEY not set - ApiSerpProvider will fail on first use. Set SERP_PROVIDER=puppeteer for local testing instead.'
      );
    }
  }

  async search(keyword, options = {}) {
    const { device = 'desktop', location = 'India', searchEngine = 'google' } = options;

    const params = new URLSearchParams({
      q: keyword,
      engine: searchEngine,
      location,
      device,
      api_key: this.apiKey,
    });

    const response = await fetch(`${this.apiUrl}?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`SERP API request failed: HTTP ${response.status}`);
    }

    const json = await response.json();
    return this.normalizeResponse(json);
  }

  normalizeResponse(json) {
    const results = (json.organic_results || []).slice(0, 20).map((r, idx) => ({
      position: r.position || idx + 1,
      url: r.link,
      title: r.title,
      domain: safeHostname(r.link),
    }));

    const localPackResults = (json.local_results?.places || json.local_results || []).map((r, idx) => ({
      position: r.position || idx + 1,
      title: r.title,
      place_id: r.place_id,
      address: r.address,
      rating: r.rating,
    }));

    const serpFeatures = [];
    if (json.answer_box) serpFeatures.push('featured_snippet');
    if (json.related_questions?.length) serpFeatures.push('people_also_ask');
    if (json.ai_overview) serpFeatures.push('ai_overview');
    if (localPackResults.length > 0) serpFeatures.push('local_pack');

    return {
      results,
      local_pack_results: localPackResults,
      serp_features: serpFeatures,
      ai_overview_present: Boolean(json.ai_overview),
      ai_overview_cites_domains: (json.ai_overview?.references || [])
        .map((ref) => safeHostname(ref.link))
        .filter(Boolean),
    };
  }
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

module.exports = ApiSerpProvider;
