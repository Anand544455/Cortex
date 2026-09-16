const { google } = require('googleapis');
const { getAuthenticatedClient } = require('./googleOAuth');

/**
 * This single free integration replaces a huge amount of what paid
 * SERP-tracking APIs try to approximate: Search Console gives you
 * Google's OWN record of your actual clicks, impressions, CTR, and
 * average position per query and page - real data, not an estimate,
 * for zero cost, directly from the source. This is the recommended
 * primary source for your OWN site's ranking data; the SERP provider
 * from Phase 3 (services/serp/) remains useful for competitor
 * positions and geo-grid checks, which Search Console can't tell you
 * (it only reports on properties you've verified ownership of).
 */
async function getClient(siteId) {
  const auth = await getAuthenticatedClient(siteId, 'google_search_console');
  return google.searchconsole({ version: 'v1', auth });
}

/**
 * Lists every property (site) this Google account has Search Console
 * access to - used right after connecting, so the user can pick which
 * verified property matches this CORTEX site.
 */
async function listProperties(siteId) {
  const searchconsole = await getClient(siteId);
  const { data } = await searchconsole.sites.list();
  return (data.siteEntry || []).map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));
}

/**
 * @param {string} siteId - CORTEX site id
 * @param {string} propertyUrl - the verified GSC property, e.g. "https://example.com/" or "sc-domain:example.com"
 * @param {object} options - { startDate, endDate, dimensions: ['query'|'page'|'device'|'country'] }
 */
async function getSearchAnalytics(siteId, propertyUrl, { startDate, endDate, dimensions = ['query'], rowLimit = 100 } = {}) {
  const searchconsole = await getClient(siteId);

  const { data } = await searchconsole.searchanalytics.query({
    siteUrl: propertyUrl,
    requestBody: {
      startDate: startDate || defaultStartDate(),
      endDate: endDate || defaultEndDate(),
      dimensions,
      rowLimit,
    },
  });

  return (data.rows || []).map((row) => ({
    keys: row.keys,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100, // as a percentage
    position: Math.round(row.position * 10) / 10,
  }));
}

/**
 * The URL Inspection API - tells you exactly what Google's own index
 * thinks about a specific URL right now (indexed or not, canonical
 * chosen, last crawl date, mobile usability, etc). Genuinely something
 * no third-party tool can replicate - only Google has this data.
 */
async function inspectUrl(siteId, propertyUrl, inspectedUrl) {
  const searchconsole = await getClient(siteId);
  const { data } = await searchconsole.urlInspection.index.inspect({
    requestBody: { siteUrl: propertyUrl, inspectionUrl: inspectedUrl },
  });
  return data.inspectionResult;
}

/**
 * Submits a sitemap for (re)crawling - lets the crawl engine (Phase 2)
 * trigger a real Google re-crawl request immediately after finishing
 * its own crawl, rather than waiting for Google's normal schedule.
 */
async function submitSitemap(siteId, propertyUrl, sitemapUrl) {
  const searchconsole = await getClient(siteId);
  await searchconsole.sitemaps.submit({ siteUrl: propertyUrl, feedpath: sitemapUrl });
  return { submitted: true, sitemapUrl };
}

async function listSitemaps(siteId, propertyUrl) {
  const searchconsole = await getClient(siteId);
  const { data } = await searchconsole.sitemaps.list({ siteUrl: propertyUrl });
  return data.sitemap || [];
}

function defaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - 28);
  return d.toISOString().split('T')[0];
}
function defaultEndDate() {
  const d = new Date();
  d.setDate(d.getDate() - 3); // GSC data has a ~2-3 day lag
  return d.toISOString().split('T')[0];
}

module.exports = { listProperties, getSearchAnalytics, inspectUrl, submitSitemap, listSitemaps };
