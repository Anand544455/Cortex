const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../config/queue');
const { Site } = require('../models/sql');
const { CrawlLog, PageRaw } = require('../models/mongo');
const { crawlSite } = require('../crawler/siteCrawler');
const indexNow = require('../services/integrations/indexNow');
const logger = require('../utils/logger.util');

const WORKER_REGION = process.env.CRAWL_WORKER_REGION || 'unknown-region';

/**
 * One job = one full site crawl. Kept intentionally simple: fetch the
 * Site row, mark it "crawling", run the crawler, write a CrawlLog
 * either way (success or failure), then mark the Site's final status.
 */
function startCrawlWorker() {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.SITE_CRAWL,
    async (job) => {
      const { siteId } = job.data;

      const site = await Site.findByPk(siteId);
      if (!site) {
        throw new Error(`Site ${siteId} not found - it may have been deleted.`);
      }

      logger.info(`[${WORKER_REGION}] Starting crawl for ${site.domain} (job ${job.id})`);

      site.status = 'crawling';
      await site.save();

      const crawlLog = await CrawlLog.create({
        site_id: site.id,
        job_type: 'full_crawl',
        worker_region: WORKER_REGION,
        status: 'running',
        started_at: new Date(),
      });

      try {
        const summary = await crawlSite(site, ({ pagesProcessed }) => {
          job.updateProgress({ pagesProcessed });
        });

        crawlLog.status = 'completed';
        crawlLog.pages_processed = summary.pages_processed;
        crawlLog.errors_count = summary.errors_count;
        crawlLog.error_details = summary.error_details;
        crawlLog.finished_at = new Date();
        await crawlLog.save();

        site.status = summary.errors_count > summary.pages_processed ? 'error' : 'active';
        site.last_crawled_at = new Date();
        await site.save();

        logger.info(
          `[${WORKER_REGION}] Finished crawl for ${site.domain}: ${summary.pages_processed} pages, ${summary.errors_count} errors.`
        );

        // Best-effort: ping IndexNow with every crawled URL so Bing/Yandex/
        // Seznam know about changes near-instantly, instead of waiting for
        // their own schedule. Never fails the crawl job itself if this
        // isn't configured or the ping fails - it's a bonus, not a dependency.
        if (process.env.INDEXNOW_KEY) {
          try {
            const pages = await PageRaw.find({ site_id: site.id }, 'url').lean();
            await indexNow.submitCrawlResults(site.domain, pages.map((p) => p.url));
            logger.info(`[${WORKER_REGION}] Pinged IndexNow for ${pages.length} URL(s).`);
          } catch (indexNowErr) {
            logger.warn(`IndexNow ping failed (non-fatal): ${indexNowErr.message}`);
          }
        }

        return summary;
      } catch (err) {
        crawlLog.status = 'failed';
        crawlLog.finished_at = new Date();
        crawlLog.error_details = [{ url: site.domain, message: err.message }];
        await crawlLog.save();

        site.status = 'error';
        await site.save();

        logger.error(`[${WORKER_REGION}] Crawl failed for ${site.domain}: ${err.message}`);
        throw err;
      }
    },
    {
      connection,
      concurrency: 2, // number of SITES crawled in parallel by this worker process
    }
  );

  worker.on('completed', (job) => logger.info(`Job ${job.id} completed.`));
  worker.on('failed', (job, err) => logger.error(`Job ${job?.id} failed: ${err.message}`));

  return worker;
}

module.exports = { startCrawlWorker };
