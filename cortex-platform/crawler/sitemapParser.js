const { XMLParser } = require('fast-xml-parser');
const logger = require('../utils/logger.util');

const parser = new XMLParser({ ignoreAttributes: false });

/**
 * Fetches sitemap.xml (or a sitemap index that points to child sitemaps)
 * and returns a flat array of page URLs. Falls back to an empty array
 * if no sitemap exists - the crawler then just starts from the homepage.
 */
async function getUrlsFromSitemap(baseUrl, depth = 0) {
  if (depth > 2) return []; // guard against sitemap-index loops

  const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();

  try {
    const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      logger.warn(`No sitemap.xml at ${sitemapUrl} (status ${response.status}).`);
      return [];
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);

    // Sitemap index: <sitemapindex><sitemap><loc>...</loc></sitemap>...</sitemapindex>
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      const entries = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap];

      const childResults = await Promise.all(
        entries.slice(0, 20).map((entry) => fetchChildSitemap(entry.loc, depth))
      );
      return childResults.flat();
    }

    // Regular sitemap: <urlset><url><loc>...</loc></url>...</urlset>
    if (parsed.urlset && parsed.urlset.url) {
      const entries = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
      return entries.map((e) => e.loc).filter(Boolean);
    }

    return [];
  } catch (err) {
    logger.warn(`Failed to read sitemap for ${baseUrl}: ${err.message}`);
    return [];
  }
}

async function fetchChildSitemap(url, parentDepth) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    const xml = await response.text();
    const parsed = parser.parse(xml);
    if (parsed.urlset && parsed.urlset.url) {
      const entries = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
      return entries.map((e) => e.loc).filter(Boolean);
    }
    return getUrlsFromSitemap(url, parentDepth + 1);
  } catch {
    return [];
  }
}

module.exports = { getUrlsFromSitemap };
