const logger = require('../../utils/logger.util');

/**
 * Being straight about multi-platform posting: Facebook, Instagram,
 * X, LinkedIn, and Pinterest each require their own OAuth app
 * registration, developer approval process, and API integration -
 * that's real infrastructure only you (or whoever owns those
 * developer accounts) can set up, no amount of code here can create
 * API access to accounts it doesn't have credentials for.
 *
 * Rather than shipping four half-working OAuth stubs that would fail
 * the moment you tried them, this posts each scheduled item to ONE
 * webhook URL you control - point that at a Zapier "Catch Hook",
 * Make.com webhook, or your own middleware, and let THAT service
 * handle the actual per-platform posting using its own established
 * OAuth connections. This is how many real scheduling tools work
 * under the hood anyway. Swap this file for real per-platform API
 * calls later if/when you set up your own developer apps - nothing
 * else in the SMO module needs to change, since callers only ever see
 * publish() succeed or throw.
 */
async function publish(post) {
  const webhookUrl = process.env.SMO_PUBLISH_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error(
      'SMO_PUBLISH_WEBHOOK_URL is not configured - set it to a Zapier/Make webhook (or your own endpoint) that fans out to each platform.'
    );
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: post.platform,
      content: post.content,
      link_url: post.link_url,
      media_url: post.media_url,
      scheduled_at: post.scheduled_at,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Webhook publish failed: HTTP ${response.status}`);
  }

  logger.info(`Social post for ${post.platform} sent to publishing webhook.`);
  return { externalRef: null }; // most webhook automations don't hand back a post ID synchronously
}

module.exports = { publish };
