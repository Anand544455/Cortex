const ApiSerpProvider = require('./apiSerpProvider');
const PuppeteerGoogleProvider = require('./puppeteerGoogleProvider');

let cachedProvider = null;

/**
 * SERP_PROVIDER=api        -> licensed third-party SERP API (recommended)
 * SERP_PROVIDER=puppeteer  -> local dev/testing fallback (see puppeteerGoogleProvider.js)
 */
function getSerpProvider() {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.SERP_PROVIDER || 'puppeteer').toLowerCase();

  if (providerName === 'api') {
    cachedProvider = new ApiSerpProvider();
  } else {
    cachedProvider = new PuppeteerGoogleProvider();
  }

  return cachedProvider;
}

module.exports = { getSerpProvider };
