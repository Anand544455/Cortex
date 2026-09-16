const { google } = require('googleapis');
const { getAuthenticatedClient } = require('./googleOAuth');

/**
 * GA4's Data API is free (no cost per call, standard property quotas
 * are generous for a single-site dashboard use case). This replaces
 * needing any paid traffic-estimation service - real visit counts,
 * straight from the source.
 */
async function getClient(siteId) {
  const auth = await getAuthenticatedClient(siteId, 'google_analytics');
  return google.analyticsdata({ version: 'v1beta', auth });
}

/**
 * Lists GA4 properties this account can access, via the Admin API
 * (separate from the Data API used for actually running reports) -
 * used right after connecting to let the user pick which property
 * matches this CORTEX site.
 */
async function listProperties(siteId) {
  const auth = await getAuthenticatedClient(siteId, 'google_analytics');
  const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth });

  const { data } = await analyticsadmin.accountSummaries.list();
  const properties = [];
  (data.accountSummaries || []).forEach((account) => {
    (account.propertySummaries || []).forEach((p) => {
      properties.push({ propertyId: p.property, displayName: p.displayName, account: account.displayName });
    });
  });
  return properties;
}

/**
 * @param {string} siteId
 * @param {string} propertyId - e.g. "properties/123456789"
 * @param {object} options - { startDate, endDate }
 */
async function getTrafficOverview(siteId, propertyId, { startDate = '28daysAgo', endDate = 'today' } = {}) {
  const analyticsdata = await getClient(siteId);

  const { data } = await analyticsdata.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' },
      ],
    },
  });

  const row = data.rows?.[0];
  if (!row) return null;

  const metricNames = data.metricHeaders.map((h) => h.name);
  const values = row.metricValues.map((v) => Number(v.value));
  return Object.fromEntries(metricNames.map((name, i) => [name, values[i]]));
}

/**
 * Top landing pages by sessions - the GA4 equivalent of "which pages
 * actually drive traffic", to cross-reference against Content Studio's
 * decay/cannibalization findings.
 */
async function getTopPages(siteId, propertyId, { startDate = '28daysAgo', endDate = 'today', limit = 25 } = {}) {
  const analyticsdata = await getClient(siteId);

  const { data } = await analyticsdata.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'conversions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    },
  });

  return (data.rows || []).map((row) => ({
    page: row.dimensionValues[0].value,
    sessions: Number(row.metricValues[0].value),
    activeUsers: Number(row.metricValues[1].value),
    conversions: Number(row.metricValues[2].value),
  }));
}

/**
 * Traffic by acquisition channel (organic search, direct, referral,
 * paid, social) - shows how much of your traffic organic SEO work is
 * actually responsible for, versus other channels.
 */
async function getChannelBreakdown(siteId, propertyId, { startDate = '28daysAgo', endDate = 'today' } = {}) {
  const analyticsdata = await getClient(siteId);

  const { data } = await analyticsdata.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
  });

  return (data.rows || []).map((row) => ({
    channel: row.dimensionValues[0].value,
    sessions: Number(row.metricValues[0].value),
    conversions: Number(row.metricValues[1].value),
  }));
}

module.exports = { listProperties, getTrafficOverview, getTopPages, getChannelBreakdown };
