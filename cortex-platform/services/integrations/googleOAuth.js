const { google } = require('googleapis');
const { IntegrationConnection } = require('../../models/sql');
const logger = require('../../utils/logger.util');

/**
 * One shared OAuth2 setup for every Google product integration
 * (Search Console, Analytics 4, Tag Manager all use the same Google
 * Cloud OAuth consent screen - no reason to duplicate this per
 * integration). Uses the official `googleapis` client library, which
 * is free and open-source (Apache 2.0, maintained by Google) - the
 * only thing that costs nothing-but-setup-time is the OAuth consent
 * screen itself, which you configure once in Google Cloud Console.
 *
 * Requires in .env:
 *   GOOGLE_CLIENT_ID=
 *   GOOGLE_CLIENT_SECRET=
 *   GOOGLE_REDIRECT_URI=https://your-api-domain.com/api/integrations/google/callback
 */
const SCOPES = {
  google_search_console: ['https://www.googleapis.com/auth/webmasters'],
  google_analytics: ['https://www.googleapis.com/auth/analytics.readonly'],
  google_tag_manager: ['https://www.googleapis.com/auth/tagmanager.readonly', 'https://www.googleapis.com/auth/tagmanager.edit.containers'],
};

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI are not set - complete the Google Cloud OAuth setup described in the developer guide first.'
    );
  }

  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

/**
 * Builds the URL the user is sent to for the consent screen.
 * `state` carries the siteId + provider through the redirect so the
 * callback knows which site/integration this connection belongs to.
 */
function getAuthUrl(provider, state) {
  const client = getOAuthClient();
  const scopes = SCOPES[provider];
  if (!scopes) throw new Error(`Unknown Google integration provider: ${provider}`);

  return client.generateAuthUrl({
    access_type: 'offline', // required to get a refresh_token back
    prompt: 'consent', // forces refresh_token on repeat connections too
    scope: scopes,
    state,
  });
}

/**
 * Exchanges the one-time code Google sends back to our callback URL
 * for real access + refresh tokens, and saves them.
 */
async function handleCallback(code, siteId, provider) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  const [connection] = await IntegrationConnection.upsert({
    site_id: siteId,
    provider,
    connected_account_email: profile.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || undefined, // Google only sends this on first consent
    token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    is_active: true,
  });

  logger.info(`Connected ${provider} for site ${siteId} (${profile.email}).`);
  return connection;
}

/**
 * Returns an authenticated OAuth2 client for an already-connected
 * site+provider, refreshing the access token automatically if it's
 * expired (googleapis handles this natively once refresh_token is set).
 */
async function getAuthenticatedClient(siteId, provider) {
  const connection = await IntegrationConnection.findOne({ where: { site_id: siteId, provider, is_active: true } });

  if (!connection || !connection.refresh_token) {
    throw new Error(`No active ${provider} connection for this site. Connect it first.`);
  }

  const client = getOAuthClient();
  client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: connection.token_expires_at ? connection.token_expires_at.getTime() : undefined,
  });

  client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      connection.access_token = tokens.access_token;
      if (tokens.expiry_date) connection.token_expires_at = new Date(tokens.expiry_date);
      await connection.save();
    }
  });

  return client;
}

module.exports = { getAuthUrl, handleCallback, getAuthenticatedClient };
