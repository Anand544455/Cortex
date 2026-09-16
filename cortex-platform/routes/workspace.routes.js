const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const workspaceController = require('../controllers/workspace.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Workspace name is required.')],
  validate,
  workspaceController.createWorkspace
);

router.get('/', workspaceController.listWorkspaces);

// No POST /:workspaceId/members route exists, intentionally - see the
// comment in controllers/workspace.controller.js. Every workspace has
// exactly one member (its owner) for the lifetime of the app.

module.exports = router;
