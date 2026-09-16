const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.sql');

/**
 * Fixed set of roles used across every workspace.
 * Seeded once via seed/seed.js - do not let users create arbitrary roles.
 */
const Role = sequelize.define(
  'Role',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.ENUM('owner', 'manager', 'analyst', 'client_viewer'),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'roles',
  }
);

module.exports = Role;
