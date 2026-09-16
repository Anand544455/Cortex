const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const aeoController = require('../controllers/aeo.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/citations/check',
  [body('prompt').trim().notEmpty().withMessage('prompt is required.')],
  validate,
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  aeoController.checkCitation
);
router.get('/citations', aeoController.listCitations);
router.get('/citations/share-of-voice', aeoController.shareOfVoice);

router.post('/schema/:type', aeoController.generateSchema);
router.post('/answer-score', aeoController.scoreAnswerFormatting);
router.get('/llms-txt', aeoController.getLlmsTxt);
router.get('/ai-crawler-audit', aeoController.getAiCrawlerAudit);

module.exports = router;
