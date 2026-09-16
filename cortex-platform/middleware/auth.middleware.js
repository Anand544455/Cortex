const { verifyAccessToken } = require('../utils/jwt.util');
const { failure } = require('../utils/apiResponse.util');
const { User } = require('../models/sql');

/**
 * Verifies the Bearer token on every protected route and attaches
 * req.user so downstream controllers/middleware can use it.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return failure(res, 401, 'Authentication token missing.');
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'name', 'email', 'is_active', 'is_platform_admin'],
    });

    if (!user || !user.is_active) {
      return failure(res, 401, 'Account not found or deactivated.');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return failure(res, 401, 'Token expired. Please log in again.');
    }
    return failure(res, 401, 'Invalid authentication token.');
  }
}

module.exports = { requireAuth };
