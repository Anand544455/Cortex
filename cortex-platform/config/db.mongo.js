/**
 * MongoDB connection (the "crawl lake").
 * Holds high-volume, flexible-schema data: crawled pages, backlinks,
 * SERP snapshots, crawl logs, AI-citation records, social mentions.
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger.util');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 4000;

async function connectMongo(retryCount = 0) {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    logger.error('MONGO_URI is missing from environment variables.');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 8000,
    });

    logger.info(`MongoDB connected -> ${mongoose.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      logger.warn(
        `MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectMongo(retryCount + 1);
    }
    logger.error(`MongoDB connection failed permanently: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectMongo;
