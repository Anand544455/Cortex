const IORedis = require('ioredis');
const logger = require('../utils/logger.util');

/**
 * BullMQ requires its own Redis connection with maxRetriesPerRequest
 * set to null - it manages retries itself. Never reuse a "normal"
 * app-cache Redis connection object for BullMQ.
 */
function createRedisConnection() {
  const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
  });

  connection.on('connect', () => logger.info('Redis connected (queue backend).'));
  connection.on('error', (err) => logger.error(`Redis connection error: ${err.message}`));

  return connection;
}

module.exports = { createRedisConnection };
