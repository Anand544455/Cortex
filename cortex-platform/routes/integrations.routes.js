const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const integrationsController = require('../controllers/integrations.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.get('/', integrationsController.listConnections);
router.get(
  '/google/:provider/connect',
  requireWorkspaceRole(['owner', 'manager']),
  integrationsController.startGoogleConnect
);
router.delete('/:provider', requireWorkspaceRole(['owner', 'manager']), integrationsController.disconnect);

router.get('/google_search_console/properties', integrationsController.gscProperties);
router.post(
  '/google_search_console/select-property',
  [body('propertyUrl').notEmpty()],
  validate,
  integrationsController.gscSelectProperty
);
router.get('/google_search_console/analytics', integrationsController.gscAnalytics);
router.post(
  '/google_search_console/inspect-url',
  [body('url').isURL()],
  validate,
  integrationsController.gscInspectUrl
);
router.post('/google_search_console/submit-sitemap', integrationsController.gscSubmitSitemap);

router.get('/google_analytics/properties', integrationsController.ga4Properties);
router.post(
  '/google_analytics/select-property',
  [body('propertyId').notEmpty()],
  validate,
  integrationsController.ga4SelectProperty
);
router.get('/google_analytics/overview', integrationsController.ga4Overview);

router.get('/google_tag_manager/containers', integrationsController.gtmContainers);
router.post(
  '/google_tag_manager/select-container',
  [body('containerPath').notEmpty()],
  validate,
  integrationsController.gtmSelectContainer
);
router.post(
  '/google_tag_manager/create-ga4-tag',
  [body('measurementId').notEmpty()],
  validate,
  requireWorkspaceRole(['owner', 'manager']),
  integrationsController.gtmCreateGa4Tag
);

router.get('/pagespeed', integrationsController.pagespeed);

router.post('/indexnow/submit', requireWorkspaceRole(['owner', 'manager', 'analyst']), integrationsController.indexNowSubmit);
router.get('/indexnow/generate-key', integrationsController.indexNowGenerateKey);

router.get('/bing/performance', integrationsController.bingPerformance);

module.exports = router;
