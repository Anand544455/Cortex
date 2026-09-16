const express = require('express');
const router = express.Router({ mergeParams: true });
const reportingController = require('../controllers/reporting.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.get('/pdf', reportingController.downloadPdfReport);
router.get('/json', reportingController.getJsonReport);
router.get('/export/:dataset', reportingController.exportCsv);
router.post('/forecast', reportingController.getForecast);

module.exports = router;
