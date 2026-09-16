const cheerio = require('cheerio');
const { registerVitalsObservers, readVitals } = require('./coreWebVitals');
const { computeSimhash } = require('../utils/simhash.util');
const logger = require('../utils/logger.util');

const TIMEOUT_MS = Number(process.env.CRAWL_REQUEST_TIMEOUT_MS) || 20000;

/**
 * Opens one page in a fresh tab, extracts everything the Crawl &
 * Technical SEO module needs, and closes the tab. Returns a plain
 * object shaped to match the PageRaw Mongoose schema exactly.
 */
async function crawlPage(browser, url, siteDomain) {
  const page = await browser.newPage();
  await page.setUserAgent('CortexBot/1.0 (+https://cortex.example/bot)');
  await page.setViewport({ width: 1366, height: 900 });

  const result = {
    url,
    status_code: null,
    title: null,
    meta_description: null,
    h1: null,
    word_count: 0,
    content_fingerprint: null,
    canonical_url: null,
    is_indexable: true,
    schema_types_found: [],
    core_web_vitals: { lcp: 0, cls: 0, inp: null },
    internal_links_out: 0,
    external_links_out: 0,
    discovered_links: [], // used by siteCrawler.js for BFS, not stored in Mongo
  };

  try {
    await registerVitalsObservers(page); // must run before goto()

    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT_MS,
    });

    result.status_code = response ? response.status() : null;

    const html = await page.content();
    const $ = cheerio.load(html);

    result.title = $('title').first().text().trim() || null;
    result.meta_description = $('meta[name="description"]').attr('content')?.trim() || null;
    result.h1 = $('h1').first().text().trim() || null;
    result.canonical_url = $('link[rel="canonical"]').attr('href') || null;

    const robotsMeta = $('meta[name="robots"]').attr('content') || '';
    result.is_indexable = !/noindex/i.test(robotsMeta);

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    result.word_count = bodyText ? bodyText.split(' ').length : 0;
    result.content_fingerprint = bodyText ? computeSimhash(bodyText) : null;

    // Structured data: JSON-LD @type values + microdata itemtype values
    const schemaTypes = new Set();
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).contents().text());
        const items = Array.isArray(json) ? json : [json];
        items.forEach((item) => {
          if (item['@type']) {
            const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
            types.forEach((t) => schemaTypes.add(t));
          }
        });
      } catch {
        /* malformed JSON-LD block - skip it, don't fail the whole crawl */
      }
    });
    $('[itemtype]').each((_, el) => {
      const itemtype = $(el).attr('itemtype');
      if (itemtype) schemaTypes.add(itemtype.split('/').pop());
    });
    result.schema_types_found = Array.from(schemaTypes);

    // Links: split internal vs external, collect internal ones for BFS crawling
    const seen = new Set();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let absolute;
      try {
        absolute = new URL(href, url).toString();
      } catch {
        return;
      }

      let linkHost;
      try {
        linkHost = new URL(absolute).hostname.replace(/^www\./, '');
      } catch {
        return;
      }

      const isInternal = linkHost === siteDomain.replace(/^www\./, '');
      if (isInternal) {
        result.internal_links_out += 1;
        if (!seen.has(absolute)) {
          seen.add(absolute);
          result.discovered_links.push(absolute);
        }
      } else {
        result.external_links_out += 1;
      }
    });

    result.core_web_vitals = await readVitals(page); // must run after goto()
  } catch (err) {
    logger.warn(`Failed to crawl ${url}: ${err.message}`);
    result.status_code = result.status_code || 0;
  } finally {
    await page.close().catch(() => {});
  }

  return result;
}

module.exports = { crawlPage };
