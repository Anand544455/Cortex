const cheerio = require('cheerio');
const { getUrlsFromSitemap } = require('../../crawler/sitemapParser');
const logger = require('../../utils/logger.util');

/**
 * Reads a competitor's sitemap.xml (reusing Phase 2's parser - the same
 * technique, just pointed at a domain outside your own tracked sites)
 * and pulls datePublished from each page's JSON-LD, if present, to
 * estimate how often they publish new content. Lightweight fetch, not
 * a full crawl - capped at a sample of pages, not the whole sitemap.
 */
async function extractPublishDate(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'CortexBot/1.0 (+https://cortex.example/bot)' },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    let datePublished = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (datePublished) return;
      try {
        const json = JSON.parse($(el).contents().text());
        const items = Array.isArray(json) ? json : [json];
        items.forEach((item) => {
          if (item.datePublished) datePublished = item.datePublished;
        });
      } catch {
        /* malformed JSON-LD - skip */
      }
    });

    return datePublished ? new Date(datePublished) : null;
  } catch (err) {
    logger.warn(`Could not read publish date for ${url}: ${err.message}`);
    return null;
  }
}

/**
 * @param {string} competitorDomain
 * @param {number} sampleSize - how many sitemap URLs to check (keep modest - each is a live fetch)
 */
async function analyzeContentCadence(competitorDomain, sampleSize = 20) {
  const baseUrl = `https://${competitorDomain}`;
  const sitemapUrls = await getUrlsFromSitemap(baseUrl);

  if (sitemapUrls.length === 0) {
    return { competitorDomain, note: 'No sitemap.xml found - cannot estimate publishing cadence.', dates: [] };
  }

  const sample = sitemapUrls.slice(0, sampleSize);
  const dates = (await Promise.all(sample.map(extractPublishDate))).filter(Boolean).sort((a, b) => a - b);

  if (dates.length < 2) {
    return {
      competitorDomain,
      note: 'Not enough pages with datePublished structured data to estimate cadence.',
      pagesChecked: sample.length,
      datesFound: dates.length,
    };
  }

  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24)); // days
  }
  const avgGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  return {
    competitorDomain,
    pagesChecked: sample.length,
    datesFound: dates.length,
    earliestDate: dates[0],
    latestDate: dates[dates.length - 1],
    averageDaysBetweenPosts: Math.round(avgGapDays * 10) / 10,
    estimatedPostsPerMonth: Math.round((30 / avgGapDays) * 10) / 10,
  };
}

module.exports = { analyzeContentCadence };
