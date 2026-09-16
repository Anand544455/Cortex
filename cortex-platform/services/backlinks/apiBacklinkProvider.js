const BaseBacklinkProvider = require('./baseProvider');
const logger = require('../../utils/logger.util');

/**
 * Talks to a licensed backlink data API. Configure via .env:
 *   BACKLINK_API_URL=https://api.example.com/v3/backlinks
 *   BACKLINK_API_KEY=your_key_here
 *
 * This adapter assumes a generic { backlinks: [...] } response shape
 * with fields close to what Ahrefs/Moz/Majestic-style APIs return. If
 * your chosen provider's response differs, adjust normalizeResponse()
 * only - nothing else in the app needs to change.
 */
class ApiBacklinkProvider extends BaseBacklinkProvider {
  constructor() {
    super();
    this.apiUrl = process.env.BACKLINK_API_URL;
    this.apiKey = process.env.BACKLINK_API_KEY;

    if (!this.apiUrl || !this.apiKey) {
      logger.warn(
        'BACKLINK_API_URL / BACKLINK_API_KEY not set - ApiBacklinkProvider will fail on first use. Use the CSV import endpoint instead if you don\'t have an API key yet.'
      );
    }
  }

  async fetchBacklinks(domain) {
    const params = new URLSearchParams({ target: domain, api_key: this.apiKey, limit: '1000' });

    const response = await fetch(`${this.apiUrl}?${params.toString()}`, {
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`Backlink API request failed: HTTP ${response.status}`);
    }

    const json = await response.json();
    return this.normalizeResponse(json);
  }

  normalizeResponse(json) {
    const rows = json.backlinks || json.results || [];
    return rows
      .map((row) => ({
        source_url: row.source_url || row.url_from,
        source_domain: safeHostname(row.source_url || row.url_from),
        target_url: row.target_url || row.url_to,
        anchor_text: row.anchor_text || row.anchor || '',
        link_type: row.nofollow ? 'nofollow' : row.link_type || 'dofollow',
        domain_score: Number(row.domain_score || row.domain_rating || 0),
      }))
      .filter((r) => r.source_url && r.target_url);
  }
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

module.exports = ApiBacklinkProvider;
