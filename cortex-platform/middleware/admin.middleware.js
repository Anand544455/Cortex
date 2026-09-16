const { failure } = require('../utils/apiResponse.util');

/**
 * Gates the platform-oversight routes (controllers/admin.controller.js).
 * Completely separate concept from workspace roles (owner/manager/etc) -
 * a workspace "owner" only has power inside their own workspace. This
 * checks a flag on the USER row itself, so it applies across every
 * workspace on the platform, not just one.
 *
 * Must run after requireAuth (needs req.user already set).
 */
function requireAdmin(req, res, next) {
  if (!req.user?.is_platform_admin) {
    return failure(res, 403, 'This action requires platform admin access.');
  }
  next();
}

module.exports = { requireAdmin };
