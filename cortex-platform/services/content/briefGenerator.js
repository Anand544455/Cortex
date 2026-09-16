const cheerio = require('cheerio');
const { getSerpProvider } = require('../serp');
const logger = require('../../utils/logger.util');

/**
 * Fetches the current top results for a keyword and does a lightweight
 * (fetch + cheerio, not a full Puppeteer render) pass over each page to
 * pull word count and heading structure. This intentionally does NOT
 * launch a browser per competitor page - that would be needlessly
 * heavy for pages we're just reading, not interacting with.
 */
async function fetchPageOutline(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'CortexBot/1.0 (+https://cortex.example/bot)' },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText ? bodyText.split(' ').length : 0;

    const headings = [];
    $('h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push({ level: el.name, text });
    });

    return { url, wordCount, headings, title: $('title').first().text().trim() };
  } catch (err) {
    logger.warn(`Brief generator could not read ${url}: ${err.message}`);
    return null;
  }
}

/**
 * @param {string} keyword - target keyword to build a brief for
 * @returns {{ targetKeyword, recommendedWordCount, competitorCount, commonHeadings, competitorOutlines }}
 */
async function generateContentBrief(keyword) {
  const provider = getSerpProvider();
  const serp = await provider.search(keyword, {});

  const topUrls = serp.results.slice(0, 10).map((r) => r.url);
  const outlines = (await Promise.all(topUrls.map(fetchPageOutline))).filter(Boolean);

  if (outlines.length === 0) {
    return {
      targetKeyword: keyword,
      recommendedWordCount: null,
      competitorCount: 0,
      commonHeadings: [],
      competitorOutlines: [],
      note: 'Could not read any competitor pages - they may block automated requests, or the SERP provider returned no results.',
    };
  }

  const wordCounts = outlines.map((o) => o.wordCount).filter((w) => w > 0);
  const avgWordCount = wordCounts.length
    ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
    : null;

  // Recommend writing ~10-15% above the current average - a common,
  // simple heuristic (not a guarantee of outranking, just a starting point).
  const recommendedWordCount = avgWordCount ? Math.round(avgWordCount * 1.12) : null;

  // Group similar headings across competitors by normalized text, to
  // surface subtopics that show up again and again (a signal the topic
  // matters to this query, not proof it's required).
  const headingFrequency = {};
  outlines.forEach((outline) => {
    outline.headings.forEach((h) => {
      const key = h.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      if (!key) return;
      headingFrequency[key] = (headingFrequency[key] || { text: h.text, count: 0 }).count
        ? { text: headingFrequency[key].text, count: headingFrequency[key].count + 1 }
        : { text: h.text, count: 1 };
    });
  });

  const commonHeadings = Object.values(headingFrequency)
    .filter((h) => h.count >= 2) // appears on 2+ competitor pages
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    targetKeyword: keyword,
    recommendedWordCount,
    competitorAverageWordCount: avgWordCount,
    competitorCount: outlines.length,
    commonHeadings,
    competitorOutlines: outlines.map((o) => ({ url: o.url, title: o.title, wordCount: o.wordCount })),
  };
}

module.exports = { generateContentBrief };
