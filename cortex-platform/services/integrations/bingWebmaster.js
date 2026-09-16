/**
 * Bing Webmaster Tools has a free API (get a key from your Bing
 * Webmaster Tools account -> Settings -> API Access, no cost, no
 * billing account). Parallel to Search Console but for Bing/Yahoo's
 * search index - genuinely different traffic source, worth having
 * both rather than assuming Google is the whole picture.
 *
 * Requires in .env: BING_WEBMASTER_API_KEY=
 */
const API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

function getApiKey() {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) {
    throw new Error('BING_WEBMASTER_API_KEY is not set - get a free key from Bing Webmaster Tools > Settings > API Access.');
  }
  return key;
}

async function callBingApi(method, params = {}) {
  const apiKey = getApiKey();
  const query = new URLSearchParams({ ...params, apikey: apiKey });

  const response = await fetch(`${API_BASE}/${method}?${query.toString()}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Bing Webmaster API request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.d;
}

/**
 * Lists every site verified in this Bing Webmaster Tools account.
 */
async function listSites() {
  const sites = await callBingApi('GetUserSites');
  return (sites || []).map((s) => ({ url: s.Url }));
}

/**
 * Query stats: clicks, impressions, average position - the Bing
 * equivalent of Search Console's search analytics.
 */
async function getSearchPerformance(siteUrl) {
  const stats = await callBingApi('GetRankAndTrafficStats', { siteUrl });
  return (stats || []).map((row) => ({
    date: row.Date,
    clicks: row.Clicks,
    impressions: row.Impressions,
  }));
}

/**
 * Crawl stats and any crawl errors Bing's own crawler has hit on the
 * site - useful cross-check against our own crawl engine's findings.
 */
async function getCrawlIssues(siteUrl) {
  const issues = await callBingApi('GetCrawlIssues', { siteUrl });
  return (issues || []).map((row) => ({ url: row.Url, issueType: row.CrawlIssueType, date: row.Date }));
}

/**
 * Submits a URL directly for near-instant crawling - Bing's own
 * equivalent alongside IndexNow (Bing actually accepts both).
 */
async function submitUrl(siteUrl, url) {
  await callBingApi('SubmitUrl', { siteUrl, url });
  return { submitted: true, url };
}

module.exports = { listSites, getSearchPerformance, getCrawlIssues, submitUrl };
