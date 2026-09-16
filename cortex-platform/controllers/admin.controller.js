const { User, Workspace, Site } = require('../models/sql');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * GET /api/admin/users
 * Every registered user on the platform - not scoped to any workspace.
 */
async function listUsers(req, res) {
  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'is_active', 'is_platform_admin', 'last_login_at', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
  return success(res, 200, 'Users fetched.', { users, count: users.length });
}

/**
 * PATCH /api/admin/users/:userId
 * Body: { is_platform_admin?: boolean, is_active?: boolean }
 * The "settings toggle" for promoting/demoting admin access, and a
 * kill switch (is_active) for disabling an account without deleting it.
 */
async function updateUser(req, res) {
  const { userId } = req.params;
  const { is_platform_admin, is_active } = req.body;

  if (userId === req.user.id && is_platform_admin === false) {
    return failure(res, 400, "You can't remove your own admin access. Have another admin do it.");
  }

  const user = await User.findByPk(userId);
  if (!user) return failure(res, 404, 'User not found.');

  if (is_platform_admin !== undefined) user.is_platform_admin = is_platform_admin;
  if (is_active !== undefined) user.is_active = is_active;
  await user.save();

  return success(res, 200, 'User updated.', {
    user: { id: user.id, name: user.name, email: user.email, is_platform_admin: user.is_platform_admin, is_active: user.is_active },
  });
}

/**
 * GET /api/admin/workspaces
 * Every workspace on the platform, across every user - the whole point
 * of platform-admin access. Ordinary users never see this list; each
 * only ever sees their own single workspace via GET /api/workspaces.
 */
async function listAllWorkspaces(req, res) {
  const workspaces = await Workspace.findAll({
    include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
  });
  return success(res, 200, 'Workspaces fetched.', { workspaces, count: workspaces.length });
}

/**
 * GET /api/admin/workspaces/:workspaceId/sites
 * Read-only oversight into any workspace's tracked sites, bypassing
 * the normal workspace-membership check entirely - that's the point
 * of this route living under /api/admin instead of /api/workspaces.
 */
async function listWorkspaceSites(req, res) {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findByPk(workspaceId, {
    include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
  });
  if (!workspace) return failure(res, 404, 'Workspace not found.');

  const sites = await Site.findAll({ where: { workspace_id: workspaceId }, order: [['createdAt', 'DESC']] });
  return success(res, 200, 'Workspace sites fetched.', { workspace, sites, count: sites.length });
}

module.exports = { listUsers, updateUser, listAllWorkspaces, listWorkspaceSites };
