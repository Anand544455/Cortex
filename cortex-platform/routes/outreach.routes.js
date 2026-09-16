const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const outreachController = require('../controllers/outreach.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/find',
  [body('niche').trim().notEmpty().withMessage('niche is required.')],
  validate,
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  outreachController.findAndSaveProspects
);
router.get('/', outreachController.listProspects);
router.patch('/:prospectId', requireWorkspaceRole(['owner', 'manager', 'analyst']), outreachController.updateProspect);
router.post(
  '/:prospectId/outreach',
  requireWorkspaceRole(['owner', 'manager']),
  outreachController.queueOutreach
);
router.get('/:prospectId/messages', outreachController.getProspectMessages);

module.exports = router;
