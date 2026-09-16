const pLimit = require('p-limit');
const { getBrowser } = require('./browserPool');
const { crawlPage } = require('./pageCrawler');
const { getRobotsRules } = require('./robotsChecker');
const { getUrlsFromSitemap } = require('./sitemapParser');
const { PageRaw } = require('../models/mongo');
const logger = require('../utils/logger.util');

const MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES_PER_SITE) || 200;
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY) || 5;

/**
 * Crawls up to MAX_PAGES pages of a site: seeds the queue from
 * sitemap.xml (falling back to the homepage), respects robots.txt,
 * follows internal links breadth-first, and upserts each page into
 * the PageRaw collection.
 *
 * Returns a summary object matching what CrawlLog needs to store.
 */
async function crawlSite(site, onProgress = () => {}) {
  const baseUrl = `https://${site.domain}`;
  const siteId = site.id;

  const browser = await getBrowser();
  const robots = await getRobotsRules(baseUrl);

  const sitemapUrls = await getUrlsFromSitemap(baseUrl);
  const seedQueue = sitemapUrls.length > 0 ? sitemapUrls : [baseUrl];

  const visited = new Set();
  const queue = [...new Set(seedQueue)].slice(0, MAX_PAGES);
  const limit = pLimit(CONCURRENCY);

  let pagesProcessed = 0;
  let errorsCount = 0;
  const errorDetails = [];

  async function processUrl(url) {
    if (visited.size >= MAX_PAGES || visited.has(url)) return;
    visited.add(url);

    if (!robots.isAllowed(url, 'CortexBot')) {
      logger.info(`Skipping (robots.txt disallow): ${url}`);
      return;
    }

    const pageResult = await crawlPage(browser, url, site.domain);

    if (!pageResult.status_code || pageResult.status_code >= 400) {
      errorsCount += 1;
      errorDetails.push({ url, message: `HTTP ${pageResult.status_code || 'no response'}` });
    }

    try {
      const { discovered_links, ...pageData } = pageResult;

      await PageRaw.findOneAndUpdate(
        { site_id: siteId, url },
        { site_id: siteId, ...pageData, internal_links_to: discovered_links, crawled_at: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      pagesProcessed += 1;
      onProgress({ pagesProcessed, url });

      // Enqueue newly discovered internal links for BFS crawling
      for (const link of discovered_links) {
        if (!visited.has(link) && visited.size + queue.length < MAX_PAGES) {
          queue.push(link);
        }
      }
    } catch (err) {
      errorsCount += 1;
      errorDetails.push({ url, message: `DB write failed: ${err.message}` });
      logger.error(`Failed to save PageRaw for ${url}: ${err.message}`);
    }
  }

  // Process the queue in waves so newly-discovered links (pushed during
  // processUrl) still get picked up, up to MAX_PAGES total.
  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const batch = queue.splice(0, CONCURRENCY);
    await Promise.all(batch.map((url) => limit(() => processUrl(url))));
  }

  return {
    pages_processed: pagesProcessed,
    errors_count: errorsCount,
    error_details: errorDetails.slice(0, 50), // cap stored error detail size
  };
}

module.exports = { crawlSite };
