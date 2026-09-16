const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth, requireAdmin);

router.get('/users', adminController.listUsers);
router.patch(
  '/users/:userId',
  [
    body('is_platform_admin').optional().isBoolean(),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  adminController.updateUser
);

router.get('/workspaces', adminController.listAllWorkspaces);
router.get('/workspaces/:workspaceId/sites', adminController.listWorkspaceSites);

module.exports = router;
