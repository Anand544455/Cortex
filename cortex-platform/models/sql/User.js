const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.sql');
const { v4: uuidv4 } = require('uuid');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_platform_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // Platform-wide oversight access across EVERY user's workspaces -
      // distinct from the "owner" role, which only has power within a
      // single workspace. Never set via public API - only through
      // seed/promoteAdmin.js (first admin) or an existing admin toggling
      // another user via PATCH /api/admin/users/:id.
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    indexes: [{ unique: true, fields: ['email'] }],
  }
);

module.exports = User;
