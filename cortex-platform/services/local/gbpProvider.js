/**
 * Google Business Profile management (posts, Q&A) requires OAuth2
 * against Google's Business Profile API - this needs a Google Cloud
 * project, API access request/approval (GBP API access is not
 * self-serve; Google reviews each application), and a completed OAuth
 * consent flow authorizing CORTEX to manage a specific business
 * listing. None of that can be done by code alone - it's a one-time
 * manual setup step on Google's side, same category of limitation as
 * the SMO platform OAuth apps in Phase 5.
 *
 * Once you have a refresh token from that flow, set it in .env:
 *   GBP_REFRESH_TOKEN=...
 *   GBP_CLIENT_ID=...
 *   GBP_CLIENT_SECRET=...
 * and this module handles token refresh + the actual API calls.
 */
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://mybusiness.googleapis.com/v4';

async function getAccessToken() {
  const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;

  if (!GBP_CLIENT_ID || !GBP_CLIENT_SECRET || !GBP_REFRESH_TOKEN) {
    throw new Error(
      'GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN are not set - complete the Google OAuth setup described in the developer guide before using GBP features.'
    );
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GBP_CLIENT_ID,
      client_secret: GBP_CLIENT_SECRET,
      refresh_token: GBP_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error(`Google OAuth token refresh failed: HTTP ${response.status}`);

  const json = await response.json();
  return json.access_token;
}

/**
 * @param {string} accountId - GBP account resource name (accounts/{id})
 * @param {string} locationId - GBP location resource name (locations/{id})
 * @param {object} post - { summary, callToActionType?, callToActionUrl? }
 */
async function createLocalPost(accountId, locationId, post) {
  const accessToken = await getAccessToken();

  const body = {
    languageCode: 'en',
    summary: post.summary,
    ...(post.callToActionType
      ? { callToAction: { actionType: post.callToActionType, url: post.callToActionUrl } }
      : {}),
  };

  const response = await fetch(`${API_BASE}/${accountId}/${locationId}/localPosts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`GBP create post failed: HTTP ${response.status}`);
  return response.json();
}

/**
 * @param {string} accountId
 * @param {string} locationId
 */
async function listQuestions(accountId, locationId) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${API_BASE}/${accountId}/${locationId}/questions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`GBP list questions failed: HTTP ${response.status}`);
  const json = await response.json();
  return json.questions || [];
}

module.exports = { createLocalPost, listQuestions };
