const { getSerpProvider } = require('../serp');

/**
 * Real social listening tools use each platform's own search/streaming
 * API (which needs its own developer approval per platform, same
 * caveat as webhookSocialProvider.js) or a paid listening API
 * (Brandwatch, Mention.com, etc). Without either configured yet, this
 * provides a directional fallback: searching site:platform.com
 * "brand name" through whichever SERP provider is already configured
 * (Phase 3). It will surface public, indexed mentions - it will NOT
 * see everything a real listening tool would (private posts, very
 * recent posts not yet indexed, platform-specific engagement metrics).
 */
const PLATFORM_DOMAINS = {
  x: 'x.com OR twitter.com',
  facebook: 'facebook.com',
  instagram: 'instagram.com',
  linkedin: 'linkedin.com',
  pinterest: 'pinterest.com',
  reddit: 'reddit.com', // not a scheduling platform, but a very common place brand mentions show up
};

async function findMentions(brandName, platforms = Object.keys(PLATFORM_DOMAINS)) {
  const provider = getSerpProvider();
  const mentions = [];

  for (const platform of platforms) {
    const domainFilter = PLATFORM_DOMAINS[platform];
    if (!domainFilter) continue;

    const query = `site:(${domainFilter}) "${brandName}"`;
    const serp = await provider.search(query, {});

    serp.results.forEach((r) => {
      mentions.push({
        platform,
        post_url: r.url,
        page_title: r.title,
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return mentions;
}

module.exports = { findMentions };
