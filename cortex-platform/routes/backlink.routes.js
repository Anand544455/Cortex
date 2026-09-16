const express = require('express');
const router = express.Router({ mergeParams: true });
const backlinkController = require('../controllers/backlink.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const upload = require('../config/upload');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/import',
  requireWorkspaceRole(['owner', 'manager', 'analyst']),
  upload.single('file'),
  backlinkController.importBacklinksCsv
);
router.post('/sync', requireWorkspaceRole(['owner', 'manager', 'analyst']), backlinkController.syncBacklinksFromApi);
router.get('/', backlinkController.listBacklinks);
router.get('/summary', backlinkController.getBacklinkSummary);
router.post('/rescan-toxic', requireWorkspaceRole(['owner', 'manager', 'analyst']), backlinkController.rescanToxicLinks);
router.get('/disavow', backlinkController.getDisavowFile);

module.exports = router;
