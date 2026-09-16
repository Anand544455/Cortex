require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectMongo = require('./config/db.mongo');
const { connectSQL, sequelize } = require('./config/db.sql');
const apiRoutes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler.middleware');
const logger = require('./utils/logger.util');

const app = express();

// --- Security & parsing middleware ---
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- Rate limiting (protects login/register and the whole API from abuse) ---
const limiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

// --- Routes ---
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CORTEX Platform API — Phase 1 (Core Skeleton) is running.',
    docs: '/api/health',
  });
});

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectMongo();
    await connectSQL();

    // sync() creates tables if they don't exist yet - fine for Phase 1
    // development. Once schema stabilizes, switch to sql/schema.sql +
    // real migrations instead of relying on sync() in production.
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    logger.info('SQL models synced.');

    app.listen(PORT, () => {
      logger.info(`CORTEX API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

start();

module.exports = app;
