const { Site } = require('../models/sql');
const { SocialPost } = require('../models/mongo');
const { findMentions } = require('../services/smo/mentionFinder');
const { draftPostsForNewArticles } = require('../services/smo/autoSyndication');
const { socialPublishQueue } = require('../config/queue');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/smo/posts
 * Body: { platform, content, link_url?, media_url?, scheduled_at }
 */
async function createPost(req, res) {
  const { siteId } = req.params;
  const { platform, content, link_url, media_url, scheduled_at } = req.body;

  if (!platform || !content || !scheduled_at) {
    return failure(res, 400, 'platform, content, and scheduled_at are required.');
  }

  const post = await SocialPost.create({
    site_id: siteId,
    platform,
    content,
    link_url,
    media_url,
    scheduled_at: new Date(scheduled_at),
    status: 'draft',
  });

  return success(res, 201, 'Post drafted.', { post });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/smo/posts?status=&platform=
 */
async function listPosts(req, res) {
  const { siteId } = req.params;
  const { status, platform } = req.query;

  const query = { site_id: siteId };
  if (status) query.status = status;
  if (platform) query.platform = platform;

  const posts = await SocialPost.find(query).sort({ scheduled_at: 1 });
  return success(res, 200, 'Posts fetched.', { posts, count: posts.length });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/smo/posts/:postId/queue
 * Moves a draft to "queued" and schedules the actual publish job.
 * Requires SMO_PUBLISH_WEBHOOK_URL to be configured (see webhookSocialProvider.js).
 */
async function queuePost(req, res) {
  const { siteId, postId } = req.params;

  const post = await SocialPost.findOne({ _id: postId, site_id: siteId });
  if (!post) return failure(res, 404, 'Post not found.');
  if (post.status !== 'draft') return failure(res, 409, `Post is already "${post.status}", not a draft.`);

  post.status = 'queued';
  await post.save();

  const delay = Math.max(new Date(post.scheduled_at).getTime() - Date.now(), 0);

  const job = await socialPublishQueue.add(
    'publish-social-post',
    { postId: post._id.toString() },
    { delay, removeOnComplete: 100, removeOnFail: 100 }
  );

  return success(res, 202, 'Post queued for publishing at its scheduled time.', { jobId: job.id, delayMs: delay });
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/smo/syndicate
 * Scans crawled Article-type pages and drafts social posts for new ones.
 */
async function runAutoSyndication(req, res) {
  const { siteId } = req.params;
  const { platforms } = req.body;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const summary = await draftPostsForNewArticles(siteId, platforms || undefined);
  return success(res, 200, 'Auto-syndication scan complete.', summary);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/smo/mentions?brandName=...&platforms=x,linkedin
 */
async function getMentions(req, res) {
  const { brandName, platforms } = req.query;
  if (!brandName) return failure(res, 400, 'brandName query parameter is required.');

  const platformList = platforms ? platforms.split(',').map((p) => p.trim()) : undefined;
  const mentions = await findMentions(brandName, platformList);

  return success(res, 200, 'Mention search complete.', { mentions, count: mentions.length });
}

module.exports = { createPost, listPosts, queuePost, runAutoSyndication, getMentions };
