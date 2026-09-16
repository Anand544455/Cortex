const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.sql');
const { v4: uuidv4 } = require('uuid');

/**
 * A Site is one tracked domain/property inside a workspace.
 * No cap on how many sites a workspace can hold - "no limit websites"
 * is enforced purely by the credits/billing layer, not by a hard limit here.
 */
const Site = sequelize.define(
  'Site',
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
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    display_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'crawling', 'active', 'paused', 'error'),
      defaultValue: 'pending',
    },
    timezone: {
      type: DataTypes.STRING(60),
      defaultValue: 'Asia/Kolkata',
    },
    last_crawled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'sites',
    indexes: [{ unique: true, fields: ['workspace_id', 'domain'] }],
  }
);

module.exports = Site;
