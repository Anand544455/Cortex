require('dotenv').config();

const connectMongo = require('./config/db.mongo');
const { connectSQL } = require('./config/db.sql');
const { startCrawlWorker } = require('./workers/crawlWorker');
const { startRankCheckWorker } = require('./workers/rankCheckWorker');
const { startOutreachWorker } = require('./workers/outreachWorker');
const { startSocialPublishWorker } = require('./workers/socialPublishWorker');
const { closeBrowser } = require('./crawler/browserPool');
const logger = require('./utils/logger.util');

/**
 * This is a SEPARATE process from server.js on purpose. The API
 * process should stay light and responsive; crawling is CPU/memory
 * heavy (Chromium) and can run on its own server(s) entirely, each
 * with a different CRAWL_WORKER_REGION - that's how "crawl across
 * multiple data centers" actually works in practice: run this file
 * on a machine in each region, all pointed at the same Redis/Mongo/SQL.
 *
 * Run with: npm run worker
 */
async function start() {
  await connectMongo();
  await connectSQL();

  const crawlWorker = startCrawlWorker();
  const rankWorker = startRankCheckWorker();
  const outreachWorker = startOutreachWorker();
  const socialWorker = startSocialPublishWorker();
  logger.info(`All workers started (region: ${process.env.CRAWL_WORKER_REGION || 'unknown-region'}).`);

  async function shutdown(signal) {
    logger.info(`${signal} received - shutting down workers gracefully...`);
    await crawlWorker.close();
    await rankWorker.close();
    await outreachWorker.close();
    await socialWorker.close();
    await closeBrowser();
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error(`Worker failed to start: ${err.message}`);
  process.exit(1);
});
