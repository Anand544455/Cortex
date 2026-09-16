const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const keywordController = require('../controllers/keyword.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/',
  [body('keywords').isArray({ min: 1 }).withMessage('keywords must be a non-empty array.')],
  validate,
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  keywordController.addTrackedKeywords
);
router.get('/', keywordController.listTrackedKeywords);
router.delete(
  '/:keywordId',
  requireWorkspaceRole(['owner', 'manager']),
  keywordController.removeTrackedKeyword
);

router.post(
  '/check',
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  keywordController.enqueueRankCheck
);

router.get('/clusters', keywordController.getKeywordClusters);
router.get('/expand', keywordController.expandKeyword);

router.post(
  '/gap',
  [body('competitorDomains').isArray({ min: 1 }).withMessage('competitorDomains must be a non-empty array.')],
  validate,
  keywordController.getKeywordGap
);

module.exports = router;
