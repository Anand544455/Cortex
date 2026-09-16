const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const competitorController = require('../controllers/competitor.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/share-of-voice',
  [body('competitorDomains').isArray({ min: 1 }).withMessage('competitorDomains must be a non-empty array.')],
  validate,
  competitorController.getShareOfVoice
);
router.get('/content-cadence', competitorController.getContentCadence);
router.post(
  '/alerts',
  [body('competitorDomains').isArray({ min: 1 }).withMessage('competitorDomains must be a non-empty array.')],
  validate,
  competitorController.getRivalAlerts
);
router.post(
  '/traffic-estimate',
  [body('keywordData').isArray({ min: 1 }).withMessage('keywordData must be a non-empty array.')],
  validate,
  competitorController.getTrafficEstimate
);

module.exports = router;
