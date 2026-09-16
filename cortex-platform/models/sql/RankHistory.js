const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db.sql');
const { v4: uuidv4 } = require('uuid');

/**
 * Time-series rank data lives in SQL (not Mongo) because it's queried
 * with heavy joins/aggregations (e.g. "avg position per site per week").
 */
const RankHistory = sequelize.define(
  'RankHistory',
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
    position: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = not ranked in top 100
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
      allowNull: true,
    },
    checked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'rank_history',
    indexes: [
      { fields: ['site_id', 'keyword'] },
      { fields: ['checked_at'] },
    ],
  }
);

module.exports = RankHistory;
