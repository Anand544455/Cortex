const robotsParser = require('robots-parser');
const logger = require('../utils/logger.util');

/**
 * Fetches and parses robots.txt for a domain. Returns a robots-parser
 * instance with an isAllowed(url, userAgent) method. If robots.txt is
 * missing or unreachable, we default to "crawling is allowed" (the
 * standard convention) rather than blocking the whole crawl.
 */
async function getRobotsRules(baseUrl) {
  const robotsUrl = new URL('/robots.txt', baseUrl).toString();

  try {
    const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      logger.warn(`robots.txt not found at ${robotsUrl} (status ${response.status}). Allowing all paths.`);
      return robotsParser(robotsUrl, '');
    }
    const body = await response.text();
    return robotsParser(robotsUrl, body);
  } catch (err) {
    logger.warn(`Could not fetch robots.txt for ${baseUrl}: ${err.message}. Allowing all paths.`);
    return robotsParser(robotsUrl, '');
  }
}

module.exports = { getRobotsRules };
