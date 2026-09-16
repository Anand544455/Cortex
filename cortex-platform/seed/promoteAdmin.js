/**
 * Run once, manually, to create your first platform admin - after
 * that, admins can promote/demote other users via
 * PATCH /api/admin/users/:userId instead of ever running this again.
 *
 * Usage:
 *   node seed/promoteAdmin.js you@example.com
 */
require('dotenv').config();
const { sequelize, User } = require('../models/sql');
const logger = require('../utils/logger.util');

async function run() {
  const email = process.argv[2];

  if (!email) {
    logger.error('Usage: node seed/promoteAdmin.js user@example.com');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      logger.error(`No user found with email "${email}". They need to register first.`);
      process.exit(1);
    }

    user.is_platform_admin = true;
    await user.save();

    logger.info(`${user.email} is now a platform admin.`);
    process.exit(0);
  } catch (err) {
    logger.error(`Failed to promote admin: ${err.message}`);
    process.exit(1);
  }
}

run();
