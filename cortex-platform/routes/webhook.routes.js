const express = require('express');
const router = express.Router();
const outreachController = require('../controllers/outreach.controller');
const { requireWebhookSecret } = require('../middleware/webhookSecret.middleware');

/**
 * POST /api/webhooks/outreach-inbound
 * Configure this URL (with the X-Webhook-Secret header) in your email
 * provider's inbound-parse / routes settings to enable reply detection.
 */
router.post('/outreach-inbound', requireWebhookSecret, outreachController.handleInboundReply);

module.exports = router;
