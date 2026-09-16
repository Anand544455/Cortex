const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const workspaceRoutes = require('./workspace.routes');
const siteRoutes = require('./site.routes');
const webhookRoutes = require('./webhook.routes');
const adminRoutes = require('./admin.routes');
const integrationsController = require('../controllers/integrations.controller');

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/workspaces/:workspaceId/sites', siteRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin', adminRoutes);

// Public - Google redirects the user's browser here directly after OAuth
// consent, with no way to attach our JWT. Safe because `state` is an
// opaque token WE generated (see services/integrations/googleOAuth.js)
// and the code itself is only valid coming from Google's own flow.
router.get('/integrations/google/callback', integrationsController.googleCallback);

// Simple health check - useful for uptime monitors and load balancers
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'CORTEX API is healthy.', timestamp: new Date().toISOString() });
});

module.exports = router;
