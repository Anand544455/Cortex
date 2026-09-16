const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('../config/queue');
const { SocialPost } = require('../models/mongo');
const { publish } = require('../services/smo/webhookSocialProvider');
const logger = require('../utils/logger.util');

function startSocialPublishWorker() {
  const connection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAMES.SOCIAL_PUBLISH,
    async (job) => {
      const { postId } = job.data;

      const post = await SocialPost.findById(postId);
      if (!post) throw new Error(`Social post ${postId} not found.`);

      try {
        const result = await publish(post);
        post.status = 'posted';
        post.posted_at = new Date();
        await post.save();

        logger.info(`Published social post ${postId} to ${post.platform}.`);
        return result;
      } catch (err) {
        post.status = 'failed';
        post.error_message = err.message;
        await post.save();
        throw err;
      }
    },
    { connection, concurrency: 3 }
  );

  worker.on('completed', (job) => logger.info(`Social publish job ${job.id} completed.`));
  worker.on('failed', (job, err) => logger.error(`Social publish job ${job?.id} failed: ${err.message}`));

  return worker;
}

module.exports = { startSocialPublishWorker };
