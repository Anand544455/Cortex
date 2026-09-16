const { User, Workspace, WorkspaceMember, Role } = require('../models/sql');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt.util');
const { success, failure } = require('../utils/apiResponse.util');
const logger = require('../utils/logger.util');

/**
 * POST /api/auth/register
 * Creates the user AND a default "trial" workspace with them as owner.
 * This mirrors how agencies actually start: sign up -> land in your own workspace.
 */
async function register(req, res) {
  const { name, email, password, workspaceName } = req.body;

  if (!name || !email || !password) {
    return failure(res, 400, 'name, email and password are required.');
  }
  if (password.length < 8) {
    return failure(res, 400, 'Password must be at least 8 characters.');
  }

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    return failure(res, 409, 'An account with this email already exists.');
  }

  const password_hash = await hashPassword(password);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password_hash,
  });

  const workspace = await Workspace.create({
    name: workspaceName || `${name}'s Workspace`,
    owner_user_id: user.id,
    plan: 'trial',
    credits_balance: 100, // starter credits
  });

  const ownerRole = await Role.findOne({ where: { name: 'owner' } });
  if (ownerRole) {
    await WorkspaceMember.create({
      workspace_id: workspace.id,
      user_id: user.id,
      role_id: ownerRole.id,
    });
  }

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  logger.info(`New user registered: ${user.email}`);

  return success(res, 201, 'Account created successfully.', {
    user: { id: user.id, name: user.name, email: user.email },
    workspace: { id: workspace.id, name: workspace.name },
    accessToken,
    refreshToken,
  });
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return failure(res, 400, 'email and password are required.');
  }

  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user || !user.is_active) {
    return failure(res, 401, 'Invalid email or password.');
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    return failure(res, 401, 'Invalid email or password.');
  }

  user.last_login_at = new Date();
  await user.save();

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  return success(res, 200, 'Login successful.', {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
  });
}

/**
 * POST /api/auth/refresh
 */
async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return failure(res, 400, 'refreshToken is required.');
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ userId: decoded.userId });
    return success(res, 200, 'Token refreshed.', { accessToken });
  } catch (err) {
    return failure(res, 401, 'Invalid or expired refresh token.');
  }
}

/**
 * GET /api/auth/me
 */
async function me(req, res) {
  const memberships = await WorkspaceMember.findAll({
    where: { user_id: req.user.id },
    include: [
      { model: Workspace, as: 'workspace', attributes: ['id', 'name', 'plan'] },
      { model: Role, as: 'role', attributes: ['name'] },
    ],
  });

  return success(res, 200, 'Current user fetched.', {
    user: { id: req.user.id, name: req.user.name, email: req.user.email, is_platform_admin: req.user.is_platform_admin },
    workspaces: memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      plan: m.workspace.plan,
      role: m.role.name,
    })),
  });
}

module.exports = { register, login, refresh, me };
