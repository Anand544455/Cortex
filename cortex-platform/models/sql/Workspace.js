const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.sql');
const { v4: uuidv4 } = require('uuid');

/**
 * A Workspace is the top level of the multi-tenant hierarchy:
 * Workspace -> Sites (unlimited) -> per-site crawl/keyword/backlink data.
 * An agency using CORTEX for multiple clients creates one workspace per client.
 */
const Workspace = sequelize.define(
  'Workspace',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    owner_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    plan: {
      type: DataTypes.ENUM('trial', 'starter', 'agency', 'enterprise'),
      defaultValue: 'trial',
    },
    credits_balance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'workspaces',
  }
);

module.exports = Workspace;
