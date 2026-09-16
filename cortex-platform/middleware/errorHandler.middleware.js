const logger = require('../utils/logger.util');
const { failure } = require('../utils/apiResponse.util');

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message);
    return failure(res, 400, 'Validation failed.', messages);
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return failure(res, 400, 'Validation failed.', messages);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Something went wrong on our end.' : err.message;

  return failure(res, statusCode, message);
}

function notFound(req, res) {
  return failure(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

module.exports = { errorHandler, notFound };
