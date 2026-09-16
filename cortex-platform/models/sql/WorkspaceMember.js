const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.sql');
const { v4: uuidv4 } = require('uuid');

/**
 * Join table: which user belongs to which workspace, with which role.
 * This is what RBAC middleware checks on every protected request.
 */
const WorkspaceMember = sequelize.define(
  'WorkspaceMember',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    invited_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: 'workspace_members',
    indexes: [{ unique: true, fields: ['workspace_id', 'user_id'] }],
  }
);

module.exports = WorkspaceMember;
