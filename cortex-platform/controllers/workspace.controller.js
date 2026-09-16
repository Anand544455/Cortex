const { Workspace, WorkspaceMember, Role } = require('../models/sql');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces
 * Creates an additional workspace for an already-logged-in user
 * (e.g. tracking a second, entirely separate business).
 */
async function createWorkspace(req, res) {
  const { name, plan } = req.body;
  if (!name) return failure(res, 400, 'name is required.');

  const workspace = await Workspace.create({
    name,
    owner_user_id: req.user.id,
    plan: plan || 'trial',
    credits_balance: 100,
  });

  const ownerRole = await Role.findOne({ where: { name: 'owner' } });
  await WorkspaceMember.create({
    workspace_id: workspace.id,
    user_id: req.user.id,
    role_id: ownerRole.id,
  });

  return success(res, 201, 'Workspace created.', { workspace });
}

/**
 * GET /api/workspaces
 * Lists every workspace the logged-in user belongs to.
 */
async function listWorkspaces(req, res) {
  const memberships = await WorkspaceMember.findAll({
    where: { user_id: req.user.id },
    include: [
      { model: Workspace, as: 'workspace' },
      { model: Role, as: 'role', attributes: ['name'] },
    ],
  });

  const workspaces = memberships.map((m) => ({
    ...m.workspace.toJSON(),
    myRole: m.role.name,
  }));

  return success(res, 200, 'Workspaces fetched.', { workspaces });
}

/**
 * Team invites are intentionally NOT implemented. Every workspace has
 * exactly one member - its owner - forever. This is what makes full
 * data isolation between users a structural guarantee rather than a
 * setting someone could misconfigure: there is no code path anywhere
 * in the app that adds a second user to a workspace. The only way to
 * see another user's data is the separate, explicit platform-admin
 * system (see middleware/admin.middleware.js and controllers/admin.controller.js).
 */

module.exports = { createWorkspace, listWorkspaces };
