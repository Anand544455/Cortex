/**
 * Run once after first setup: npm run seed
 * Creates the fixed roles that RBAC depends on everywhere else.
 * Safe to run multiple times - uses findOrCreate.
 */
require('dotenv').config();
const { sequelize, Role } = require('../models/sql');
const logger = require('../utils/logger.util');

const ROLES = [
  { name: 'owner', description: 'Full control: billing, members, all sites and settings.' },
  { name: 'manager', description: 'Can manage sites, members, and run all modules except billing.' },
  { name: 'analyst', description: 'Can view and run reports/audits, cannot manage members or billing.' },
  { name: 'client_viewer', description: 'Read-only access - built for sharing with the end client.' },
];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    for (const role of ROLES) {
      const [record, created] = await Role.findOrCreate({
        where: { name: role.name },
        defaults: role,
      });
      logger.info(`${created ? 'Created' : 'Already exists'}: role "${record.name}"`);
    }

    logger.info('Seeding complete.');
    process.exit(0);
  } catch (err) {
    logger.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
}

seed();
