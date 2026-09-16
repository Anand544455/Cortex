const { Site, IntegrationConnection } = require('../models/sql');
const { getAuthUrl, handleCallback } = require('../services/integrations/googleOAuth');
const searchConsole = require('../services/integrations/searchConsole');
const analytics = require('../services/integrations/analytics');
const tagManager = require('../services/integrations/tagManager');
const pagespeedInsights = require('../services/integrations/pagespeedInsights');
const indexNow = require('../services/integrations/indexNow');
const bingWebmaster = require('../services/integrations/bingWebmaster');
const { PageRaw } = require('../models/mongo');
const { success, failure } = require('../utils/apiResponse.util');

const GOOGLE_PROVIDERS = ['google_search_console', 'google_analytics', 'google_tag_manager'];

async function listConnections(req, res) {
  const { siteId } = req.params;
  const connections = await IntegrationConnection.findAll({
    where: { site_id: siteId },
    attributes: ['id', 'provider', 'connected_account_email', 'metadata', 'is_active', 'createdAt'],
  });
  return success(res, 200, 'Connections fetched.', { connections });
}

async function startGoogleConnect(req, res) {
  const { siteId, provider } = req.params;
  if (!GOOGLE_PROVIDERS.includes(provider)) return failure(res, 400, 'Unknown Google integration provider.');

  try {
    const state = Buffer.from(JSON.stringify({ siteId, provider })).toString('base64url');
    const url = getAuthUrl(provider, state);
    return res.redirect(url);
  } catch (err) {
    return failure(res, 500, err.message);
  }
}

async function googleCallback(req, res) {
  const { code, state, error: googleError } = req.query;

  if (googleError) {
    return failure(res, 400, `Google denied access: ${googleError}`);
  }
  if (!code || !state) return failure(res, 400, 'Missing code or state from Google.');

  let siteId, provider;
  try {
    ({ siteId, provider } = JSON.parse(Buffer.from(state, 'base64url').toString()));
  } catch {
    return failure(res, 400, 'Invalid state parameter.');
  }

  try {
    await handleCallback(code, siteId, provider);
    const redirectTo = `${process.env.CLIENT_URL || ''}/integrations?connected=${provider}`;
    return res.redirect(redirectTo);
  } catch (err) {
    return failure(res, 500, `Failed to complete connection: ${err.message}`);
  }
}

async function disconnect(req, res) {
  const { siteId, provider } = req.params;
  await IntegrationConnection.destroy({ where: { site_id: siteId, provider } });
  return success(res, 200, 'Disconnected.');
}

async function gscProperties(req, res) {
  try {
    const properties = await searchConsole.listProperties(req.params.siteId);
    return success(res, 200, 'Properties fetched.', { properties });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function gscSelectProperty(req, res) {
  const { siteId } = req.params;
  const { propertyUrl } = req.body;
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider: 'google_search_console' } });
  if (!connection) return failure(res, 404, 'Not connected yet.');
  connection.metadata = { ...connection.metadata, propertyUrl };
  await connection.save();
  return success(res, 200, 'Property selected.');
}

async function gscAnalytics(req, res) {
  const { siteId } = req.params;
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider: 'google_search_console' } });
  if (!connection?.metadata?.propertyUrl) return failure(res, 400, 'Select a GSC property first.');

  try {
    const dimensions = req.query.dimensions ? req.query.dimensions.split(',') : ['query'];
    const rows = await searchConsole.getSearchAnalytics(siteId, connection.metadata.propertyUrl, { dimensions });
    return success(res, 200, 'Search analytics fetched.', { rows });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function gscInspectUrl(req, res) {
  const { siteId } = req.params;
  const { url } = req.body;
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider: 'google_search_console' } });
  if (!connection?.metadata?.propertyUrl) return failure(res, 400, 'Select a GSC property first.');

  try {
    const result = await searchConsole.inspectUrl(siteId, connection.metadata.propertyUrl, url);
    return success(res, 200, 'URL inspected.', { result });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function gscSubmitSitemap(req, res) {
  const { siteId } = req.params;
  const site = await Site.findByPk(siteId);
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider: 'google_search_console' } });
  if (!connection?.metadata?.propertyUrl) return failure(res, 400, 'Select a GSC property first.');

  try {
    const result = await searchConsole.submitSitemap(siteId, connection.metadata.propertyUrl, `https://${site.domain}/sitemap.xml`);
    return success(res, 200, 'Sitemap submitted.', result);
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function ga4Properties(req, res) {
  try {
    const properties = await analytics.listProperties(req.params.siteId);
    return success(res, 200, 'Properties fetched.', { properties });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function ga4SelectProperty(req, res) {
  const { siteId } = req.params;
  const { propertyId } = req.body;
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider: 'google_analytics' } });
  if (!connection) return failure(res, 404, 'Not connected yet.');
  connection.metadata = { ...connection.metadata, propertyId };
  await connection.save();
  return success(res, 200, 'Property selected.');
}

async function ga4Overview(req, res) {
  const { siteId } = req.params;
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider: 'google_analytics' } });
  if (!connection?.metadata?.propertyId) return failure(res, 400, 'Select a GA4 property first.');

  try {
    const [overview, topPages, channels] = await Promise.all([
      analytics.getTrafficOverview(siteId, connection.metadata.propertyId),
      analytics.getTopPages(siteId, connection.metadata.propertyId),
      analytics.getChannelBreakdown(siteId, connection.metadata.propertyId),
    ]);
    return success(res, 200, 'GA4 overview fetched.', { overview, topPages, channels });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function gtmContainers(req, res) {
  try {
    const containers = await tagManager.listContainers(req.params.siteId);
    return success(res, 200, 'Containers fetched.', { containers });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function gtmSelectContainer(req, res) {
  const { siteId } = req.params;
  const { containerPath } = req.body;
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider: 'google_tag_manager' } });
  if (!connection) return failure(res, 404, 'Not connected yet.');
  connection.metadata = { ...connection.metadata, containerPath };
  await connection.save();
  return success(res, 200, 'Container selected.');
}

async function gtmCreateGa4Tag(req, res) {
  const { siteId } = req.params;
  const { measurementId } = req.body;
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider: 'google_tag_manager' } });
  if (!connection?.metadata?.containerPath) return failure(res, 400, 'Select a GTM container first.');

  try {
    const result = await tagManager.createGa4ConfigTag(siteId, connection.metadata.containerPath, measurementId);
    return success(res, 201, 'GA4 tag created.', result);
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function pagespeed(req, res) {
  const { url, strategy } = req.query;
  if (!url) return failure(res, 400, 'url query parameter is required.');

  try {
    const result = await pagespeedInsights.analyzeUrl(url, strategy || 'mobile');
    return success(res, 200, 'PageSpeed analysis complete.', result);
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function indexNowSubmit(req, res) {
  const { siteId } = req.params;
  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  let { urls } = req.body;
  if (!urls || urls.length === 0) {
    const pages = await PageRaw.find({ site_id: siteId }, 'url').lean();
    urls = pages.map((p) => p.url);
  }

  try {
    const result = await indexNow.submitUrls(site.domain, urls);
    return success(res, 200, 'Submitted to IndexNow (Bing, Yandex, Seznam).', result);
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

async function indexNowGenerateKey(req, res) {
  const key = indexNow.generateKey();
  return success(res, 200, 'Key generated - save it to INDEXNOW_KEY and host it at https://yourdomain.com/<key>.txt.', { key });
}

async function bingPerformance(req, res) {
  const { siteId } = req.params;
  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  try {
    const rows = await bingWebmaster.getSearchPerformance(`https://${site.domain}`);
    return success(res, 200, 'Bing performance fetched.', { rows });
  } catch (err) {
    return failure(res, 502, err.message);
  }
}

module.exports = {
  listConnections,
  startGoogleConnect,
  googleCallback,
  disconnect,
  gscProperties,
  gscSelectProperty,
  gscAnalytics,
  gscInspectUrl,
  gscSubmitSitemap,
  ga4Properties,
  ga4SelectProperty,
  ga4Overview,
  gtmContainers,
  gtmSelectContainer,
  gtmCreateGa4Tag,
  pagespeed,
  indexNowSubmit,
  indexNowGenerateKey,
  bingPerformance,
};
