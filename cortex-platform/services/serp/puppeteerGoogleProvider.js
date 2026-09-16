const BaseSerpProvider = require('./baseProvider');
const { getBrowser } = require('../../crawler/browserPool');
const logger = require('../../utils/logger.util');

/**
 * DEVELOPMENT / TESTING FALLBACK ONLY.
 *
 * Opens a real Google search results page and reads what's visible.
 * This is here so a developer can test the rank-tracking pipeline
 * end-to-end without a paid API key. It is NOT recommended for real
 * production tracking:
 *   - Google's terms of service restrict automated querying
 *   - Result markup changes often and silently breaks selectors
 *   - Frequent automated requests can trigger a CAPTCHA challenge
 *
 * This provider does NOT attempt to detect, solve, or bypass CAPTCHAs.
 * If Google serves a CAPTCHA/consent wall instead of results, this
 * provider simply logs a warning and returns an empty result set -
 * the caller should treat that as "no data this run", not an error to
 * retry aggressively. For any real workspace, set:
 *   SERP_PROVIDER=api
 * and use a licensed SERP API instead (see apiSerpProvider.js).
 */
class PuppeteerGoogleProvider extends BaseSerpProvider {
  async search(keyword, options = {}) {
    const { device = 'desktop', location = 'India' } = options;

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        device === 'mobile'
          ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile Safari/537.36'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
      );
      await page.setViewport(device === 'mobile' ? { width: 412, height: 915 } : { width: 1366, height: 900 });

      const query = encodeURIComponent(keyword);
      const url = `https://www.google.com/search?q=${query}&gl=in&num=20`;

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const isCaptcha = await page.evaluate(() =>
        Boolean(document.querySelector('form#captcha-form, div#recaptcha'))
      );

      if (isCaptcha) {
        logger.warn(
          `Google served a CAPTCHA for "${keyword}". Skipping this check - switch SERP_PROVIDER=api for reliable tracking.`
        );
        return {
          results: [],
          local_pack_results: [],
          serp_features: [],
          ai_overview_present: false,
          ai_overview_cites_domains: [],
        };
      }

      const data = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('div.g, div[data-sokoban-container]').forEach((el) => {
          const link = el.querySelector('a');
          const titleEl = el.querySelector('h3');
          if (link && titleEl && link.href) {
            items.push({ url: link.href, title: titleEl.textContent });
          }
        });

        const hasFeaturedSnippet = Boolean(document.querySelector('div.xpdopen, div[data-attrid="wa:/description"]'));
        const hasPAA = Boolean(document.querySelector('div[jsname="Cpkphb"]'));

        return { items, hasFeaturedSnippet, hasPAA };
      });

      const results = data.items.slice(0, 20).map((item, idx) => ({
        position: idx + 1,
        url: item.url,
        title: item.title,
        domain: safeHostname(item.url),
      }));

      const serpFeatures = [];
      if (data.hasFeaturedSnippet) serpFeatures.push('featured_snippet');
      if (data.hasPAA) serpFeatures.push('people_also_ask');

      return {
        results,
        local_pack_results: [], // not reliably scrapable headlessly - use SERP_PROVIDER=api for local pack / geo-grid data
        serp_features: serpFeatures,
        // Google's AI Overview markup is not reliably scrapable headlessly -
        // this provider intentionally never claims to detect it.
        ai_overview_present: false,
        ai_overview_cites_domains: [],
      };
    } finally {
      await page.close().catch(() => {});
    }
  }
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

module.exports = PuppeteerGoogleProvider;
