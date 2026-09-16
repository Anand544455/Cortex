const crypto = require('crypto');

/**
 * IndexNow (indexnow.org) is an open protocol - not a Google product,
 * not owned by any single company - jointly adopted by Bing, Yandex,
 * and Seznam (Google does not participate in IndexNow; use the Search
 * Console sitemap submission in searchConsole.js for Google specifically).
 * It costs nothing and needs no OAuth: generate a random key once,
 * host it as a plain text file at your site's root, and ping search
 * engines whenever a page is created/updated/deleted for near-instant
 * awareness instead of waiting for the next scheduled crawl.
 *
 * Requires in .env: INDEXNOW_KEY= (any random hex string you generate once)
 */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Generates a fresh key - run this once per site and save the result
 * to INDEXNOW_KEY, then host it at https://yoursite.com/<key>.txt
 * containing just the key itself as plain text (that file IS your
 * proof of ownership - no account, no approval process).
 */
function generateKey() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * @param {string} host - e.g. "example.com"
 * @param {string[]} urls - the specific URLs that changed (up to 10,000 per call)
 */
async function submitUrls(host, urls) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    throw new Error(
      'INDEXNOW_KEY is not set - generate one with generateKey(), save it to .env, and host it at https://yourdomain.com/<key>.txt first.'
    );
  }
  if (urls.length === 0) return { submitted: 0 };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `https://${host}/${key}.txt`,
      urlList: urls.slice(0, 10000),
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow submission failed: HTTP ${response.status}`);
  }

  return { submitted: urls.length, status: response.status };
}

/**
 * Convenience wrapper for the most common case: "I just finished
 * crawling this site, ping IndexNow for every page found" - call this
 * from the end of a crawl job if you want every discovered page
 * automatically pinged.
 */
async function submitCrawlResults(siteDomain, pageUrls) {
  return submitUrls(siteDomain, pageUrls);
}

module.exports = { generateKey, submitUrls, submitCrawlResults };
