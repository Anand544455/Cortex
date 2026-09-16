const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../config/queue');
const { Site } = require('../models/sql');
const { OutreachProspect } = require('../models/mongo');
const { sendOutreachEmail } = require('../services/outreach/sequenceRunner');
const logger = require('../utils/logger.util');

/**
 * Sends outreach emails from the queue rather than inline during the
 * API request - keeps the request fast and lets failed sends retry
 * (BullMQ retries failed jobs automatically per its default settings)
 * without the user having to resubmit anything.
 */
function startOutreachWorker() {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.OUTREACH_SEND,
    async (job) => {
      const { prospectId, siteId, niche, senderName } = job.data;

      const [site, prospect] = await Promise.all([
        Site.findByPk(siteId),
        OutreachProspect.findById(prospectId),
      ]);

      if (!site) throw new Error(`Site ${siteId} not found.`);
      if (!prospect) throw new Error(`Prospect ${prospectId} not found.`);

      return sendOutreachEmail(prospect, site, { niche, senderName });
    },
    { connection, concurrency: 3 }
  );

  worker.on('completed', (job) => logger.info(`Outreach email sent (job ${job.id}).`));
  worker.on('failed', (job, err) => logger.error(`Outreach send job ${job?.id} failed: ${err.message}`));

  return worker;
}

module.exports = { startOutreachWorker };
