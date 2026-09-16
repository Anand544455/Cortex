const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.sql');
const { v4: uuidv4 } = require('uuid');

/**
 * The keyword LIST a site wants tracked (managed by the user).
 * Every time the rank-check job runs, it reads this table, checks
 * each keyword's current position, and appends a row to RankHistory
 * (the time series). This table itself never grows unbounded per check -
 * only per keyword added.
 */
const TrackedKeyword = sequelize.define(
  'TrackedKeyword',
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
    keyword: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    search_engine: {
      type: DataTypes.ENUM('google', 'bing'),
      defaultValue: 'google',
    },
    device: {
      type: DataTypes.ENUM('desktop', 'mobile'),
      defaultValue: 'desktop',
    },
    location: {
      type: DataTypes.STRING(120),
      defaultValue: 'India',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    tag: {
      type: DataTypes.STRING(80),
      allowNull: true, // free-form label, e.g. "data-recovery", "money-page"
    },
  },
  {
    tableName: 'tracked_keywords',
    indexes: [{ unique: true, fields: ['site_id', 'keyword', 'device', 'location', 'search_engine'] }],
  }
);

module.exports = TrackedKeyword;
