const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const contentController = require('../controllers/content.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/score',
  [
    body('bodyText').notEmpty().withMessage('bodyText is required.'),
    body('targetKeyword').notEmpty().withMessage('targetKeyword is required.'),
  ],
  validate,
  contentController.scoreOnPageContent
);

router.get('/brief', contentController.getContentBrief);
router.get('/duplicates', contentController.getDuplicateContent);
router.get('/cannibalization', contentController.getCannibalization);
router.get('/decay', contentController.getContentDecay);
router.get('/internal-links', contentController.getInternalLinkSuggestions);

module.exports = router;
