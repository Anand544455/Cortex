const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const smoController = require('../controllers/smo.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/posts',
  [
    body('platform').isIn(['facebook', 'instagram', 'x', 'linkedin', 'pinterest']).withMessage('Invalid platform.'),
    body('content').trim().notEmpty().withMessage('content is required.'),
    body('scheduled_at').isISO8601().withMessage('scheduled_at must be a valid date.'),
  ],
  validate,
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  smoController.createPost
);
router.get('/posts', smoController.listPosts);
router.post(
  '/posts/:postId/queue',
  requireWorkspaceRole(['owner', 'manager']),
  smoController.queuePost
);

router.post(
  '/syndicate',
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  smoController.runAutoSyndication
);
router.get('/mentions', smoController.getMentions);

module.exports = router;
