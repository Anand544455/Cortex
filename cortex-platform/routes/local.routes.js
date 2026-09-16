const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const localController = require('../controllers/local.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/geo-grid',
  [
    body('keyword').trim().notEmpty().withMessage('keyword is required.'),
    body('centerLat').isFloat().withMessage('centerLat must be a number.'),
    body('centerLng').isFloat().withMessage('centerLng must be a number.'),
  ],
  validate,
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  localController.runGeoGrid
);
router.get('/geo-grid', localController.getLatestGeoGrid);

router.post(
  '/nap-scan',
  [body('businessName').trim().notEmpty().withMessage('businessName is required.')],
  validate,
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  localController.runNapScan
);

router.get('/review-link', localController.getReviewLink);
router.post(
  '/review-sentiment',
  [body('reviewText').trim().notEmpty().withMessage('reviewText is required.')],
  validate,
  localController.scoreSentiment
);

router.post(
  '/gbp/posts',
  requireWorkspaceRole(['owner', 'manager']),
  localController.createGbpPost
);
router.get('/gbp/questions', localController.getGbpQuestions);

module.exports = router;
