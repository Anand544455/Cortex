const { WorkspaceMember, Role } = require('../models/sql');
const { failure } = require('../utils/apiResponse.util');

/**
 * Usage: requireWorkspaceRole(['owner', 'manager'])
 * Expects :workspaceId in the route params (or req.body.workspace_id
 * as a fallback) and req.user already set by requireAuth.
 */
function requireWorkspaceRole(allowedRoles = []) {
  return async function (req, res, next) {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspace_id;

      if (!workspaceId) {
        return failure(res, 400, 'workspaceId is required to check permissions.');
      }

      const membership = await WorkspaceMember.findOne({
        where: { workspace_id: workspaceId, user_id: req.user.id },
        include: [{ model: Role, as: 'role' }],
      });

      if (!membership) {
        return failure(res, 403, 'You are not a member of this workspace.');
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role.name)) {
        return failure(res, 403, `This action requires one of these roles: ${allowedRoles.join(', ')}.`);
      }

      req.workspaceRole = membership.role.name;
      req.workspaceId = workspaceId;
      next();
    } catch (err) {
      return failure(res, 500, 'Permission check failed.', err.message);
    }
  };
}

module.exports = { requireWorkspaceRole };
