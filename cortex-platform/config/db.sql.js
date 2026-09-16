/**
 * SQL connection (the "system of record").
 * Uses Sequelize so the SAME model code runs on either MySQL or
 * PostgreSQL. Switch databases by changing SQL_DIALECT in .env only -
 * no code changes needed anywhere else in the project.
 *
 * Holds: users, workspaces, sites, rank_history, invoices/credits, roles.
 */
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger.util');

const dialect = (process.env.SQL_DIALECT || 'mysql').toLowerCase();

if (!['mysql', 'postgres'].includes(dialect)) {
  logger.error(`Unsupported SQL_DIALECT "${dialect}". Use "mysql" or "postgres".`);
  process.exit(1);
}

const sequelize = new Sequelize(
  process.env.SQL_DATABASE,
  process.env.SQL_USERNAME,
  process.env.SQL_PASSWORD,
  {
    host: process.env.SQL_HOST,
    port: Number(process.env.SQL_PORT) || (dialect === 'postgres' ? 5432 : 3306),
    dialect,
    logging: false,
    pool: {
      max: 15,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      underscored: true, // snake_case columns (created_at, updated_at, etc.)
      timestamps: true,
    },
  }
);

async function connectSQL() {
  try {
    await sequelize.authenticate();
    logger.info(`SQL (${dialect}) connected -> ${process.env.SQL_DATABASE}`);
  } catch (err) {
    logger.error(`SQL connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { sequelize, connectSQL };
