const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.sql');
const { v4: uuidv4 } = require('uuid');

/**
 * Every "connect your own account" integration (Google Search Console,
 * Google Analytics 4, Google Tag Manager, Bing Webmaster Tools) stores
 * its tokens here. GBP reuses the same shape but via env vars today
 * (see services/local/gbpProvider.js) since it was built pre-multi-tenant;
 * a future pass could migrate it to this table too.
 *
 * Tokens belong to the SITE, not the workspace - a workspace can have
 * many sites, each connected to a different GSC/GA4 property.
 */
const IntegrationConnection = sequelize.define(
  'IntegrationConnection',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    site_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    provider: {
      type: DataTypes.ENUM('google_search_console', 'google_analytics', 'google_tag_manager', 'bing_webmaster'),
      allowNull: false,
    },
    connected_account_email: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    api_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'integration_connections',
    indexes: [{ unique: true, fields: ['site_id', 'provider'] }],
  }
);

module.exports = IntegrationConnection;
