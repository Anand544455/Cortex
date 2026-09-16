const { Queue } = require('bullmq');
const { createRedisConnection } = require('./redis');

/**
 * One queue per job family. The API (server.js/controllers) only ever
 * ADDS jobs here. The actual crawling happens in worker.js, which is
 * a separate process/consumer - keeping crawling load off the API process.
 */
const connection = createRedisConnection();

const crawlQueue = new Queue('site-crawl', { connection });
const rankCheckQueue = new Queue('rank-check', { connection });
const outreachQueue = new Queue('outreach-send', { connection });
const socialPublishQueue = new Queue('social-publish', { connection });

const QUEUE_NAMES = {
  SITE_CRAWL: 'site-crawl',
  RANK_CHECK: 'rank-check',
  OUTREACH_SEND: 'outreach-send',
  SOCIAL_PUBLISH: 'social-publish',
};

module.exports = { crawlQueue, rankCheckQueue, outreachQueue, socialPublishQueue, QUEUE_NAMES, connection };
