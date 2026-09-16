const ApiBacklinkProvider = require('./apiBacklinkProvider');

let cachedProvider = null;

/**
 * Currently only the licensed-API provider is "live" (fetchBacklinks()).
 * CSV import is handled separately via csvImportService.js since it's
 * triggered by a file upload, not a fetch-by-domain call - both feed
 * the same BacklinkIndex through linkDiffer.js either way.
 */
function getBacklinkProvider() {
  if (!cachedProvider) {
    cachedProvider = new ApiBacklinkProvider();
  }
  return cachedProvider;
}

module.exports = { getBacklinkProvider };
