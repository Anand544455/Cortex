const express = require('express');
const router = express.Router({ mergeParams: true });
const crawlController = require('../controllers/crawl.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post('/crawl', requireWorkspaceRole(['owner', 'manager', 'analyst']), crawlController.enqueueCrawl);
router.get('/crawl-logs', crawlController.getCrawlLogs);
router.get('/pages', crawlController.getPages);
router.get('/audit', crawlController.getAuditSummary);

module.exports = router;
