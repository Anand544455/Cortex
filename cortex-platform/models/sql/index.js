/**
 * Every SQL model association lives here, in one place, so the
 * relationships between User / Workspace / Site / Role are never
 * scattered or duplicated across the codebase.
 */
const { sequelize } = require('../../config/db.sql');
const User = require('./User');
const Workspace = require('./Workspace');
const WorkspaceMember = require('./WorkspaceMember');
const Site = require('./Site');
const RankHistory = require('./RankHistory');
const TrackedKeyword = require('./TrackedKeyword');
const IntegrationConnection = require('./IntegrationConnection');
const Invoice = require('./Invoice');
const Role = require('./Role');

// A user can own many workspaces
User.hasMany(Workspace, { foreignKey: 'owner_user_id', as: 'ownedWorkspaces' });
Workspace.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });

// Many-to-many: users <-> workspaces, through WorkspaceMember (carries role_id)
User.belongsToMany(Workspace, { through: WorkspaceMember, foreignKey: 'user_id', as: 'workspaces' });
Workspace.belongsToMany(User, { through: WorkspaceMember, foreignKey: 'workspace_id', as: 'members' });

WorkspaceMember.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
WorkspaceMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
WorkspaceMember.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

// A workspace has many sites (no upper limit enforced here)
Workspace.hasMany(Site, { foreignKey: 'workspace_id', as: 'sites' });
Site.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

// A site has many rank history rows
Site.hasMany(RankHistory, { foreignKey: 'site_id', as: 'rankHistory' });
RankHistory.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// A site has many tracked keywords (the managed list)
Site.hasMany(TrackedKeyword, { foreignKey: 'site_id', as: 'trackedKeywords' });
TrackedKeyword.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// A site has many integration connections (GSC, GA4, GTM, Bing)
Site.hasMany(IntegrationConnection, { foreignKey: 'site_id', as: 'integrations' });
IntegrationConnection.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// A workspace has many invoices
Workspace.hasMany(Invoice, { foreignKey: 'workspace_id', as: 'invoices' });
Invoice.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

module.exports = {
  sequelize,
  User,
  Workspace,
  WorkspaceMember,
  Site,
  RankHistory,
  TrackedKeyword,
  IntegrationConnection,
  Invoice,
  Role,
};
