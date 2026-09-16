const { failure } = require('../utils/apiResponse.util');

/**
 * External services (email providers, etc.) can't hold a user JWT, so
 * webhook endpoints are protected by a shared secret instead - the
 * provider must send it back on every request, configured on their
 * side when you set up the webhook URL.
 */
function requireWebhookSecret(req, res, next) {
  const provided = req.headers['x-webhook-secret'];
  const expected = process.env.OUTREACH_WEBHOOK_SECRET;

  if (!expected) {
    return failure(res, 500, 'OUTREACH_WEBHOOK_SECRET is not configured on the server.');
  }
  if (!provided || provided !== expected) {
    return failure(res, 401, 'Invalid or missing webhook secret.');
  }
  next();
}

module.exports = { requireWebhookSecret };
