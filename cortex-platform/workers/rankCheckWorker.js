const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../config/queue');
const { Site, TrackedKeyword } = require('../models/sql');
const { trackKeywords } = require('../services/rankTracker');
const logger = require('../utils/logger.util');

/**
 * One job = check every ACTIVE tracked keyword for one site, once.
 * Scheduling this daily (see DEVELOPER_GUIDE.md Phase 3 section for
 * the node-cron snippet) is what turns this into automatic daily
 * rank tracking.
 */
function startRankCheckWorker() {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.RANK_CHECK,
    async (job) => {
      const { siteId } = job.data;

      const site = await Site.findByPk(siteId);
      if (!site) {
        throw new Error(`Site ${siteId} not found - it may have been deleted.`);
      }

      const trackedKeywords = await TrackedKeyword.findAll({
        where: { site_id: siteId, is_active: true },
      });

      if (trackedKeywords.length === 0) {
        logger.info(`No active tracked keywords for ${site.domain} - nothing to check.`);
        return { checked: 0, found: 0, notFound: 0, errors: 0, total: 0 };
      }

      logger.info(`Rank-checking ${trackedKeywords.length} keyword(s) for ${site.domain} (job ${job.id})`);

      const summary = await trackKeywords(site, trackedKeywords, ({ checked, total }) => {
        job.updateProgress({ checked, total });
      });

      logger.info(
        `Finished rank check for ${site.domain}: ${summary.found}/${summary.total} ranked, ${summary.errors} errors.`
      );

      return summary;
    },
    {
      connection,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => logger.info(`Rank-check job ${job.id} completed.`));
  worker.on('failed', (job, err) => logger.error(`Rank-check job ${job?.id} failed: ${err.message}`));

  return worker;
}

module.exports = { startRankCheckWorker };
