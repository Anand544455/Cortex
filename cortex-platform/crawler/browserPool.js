const puppeteer = require('puppeteer');
const logger = require('../utils/logger.util');

let browserInstance = null;

/**
 * Reuses ONE Chromium instance across many crawl jobs (launching a new
 * browser per page would be far too slow and memory-heavy). Individual
 * pages/tabs are still opened and closed per-URL - see pageCrawler.js.
 */
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  browserInstance = await puppeteer.launch(launchOptions);
  logger.info('Puppeteer browser instance launched.');

  browserInstance.on('disconnected', () => {
    logger.warn('Puppeteer browser instance disconnected.');
    browserInstance = null;
  });

  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    logger.info('Puppeteer browser instance closed.');
  }
}

module.exports = { getBrowser, closeBrowser };
