const { PageRaw, SocialPost } = require('../../models/mongo');

/**
 * Looks at recently crawled pages carrying Article-type structured
 * data (a reasonable proxy for "this is a blog post/article", since
 * Phase 2's crawler already extracts JSON-LD @type into
 * schema_types_found) and drafts a social post for each one that
 * doesn't already have one. Drafts only - nothing gets scheduled or
 * posted without a human reviewing and confirming via the API.
 */
async function draftPostsForNewArticles(siteId, platforms = ['linkedin', 'x']) {
  const articlePages = await PageRaw.find({
    site_id: siteId,
    schema_types_found: { $in: ['Article', 'BlogPosting', 'NewsArticle'] },
  }).lean();

  let draftedCount = 0;
  const skipped = [];

  for (const page of articlePages) {
    for (const platform of platforms) {
      const existing = await SocialPost.findOne({ site_id: siteId, source_page_url: page.url, platform });
      if (existing) {
        skipped.push({ page: page.url, platform });
        continue;
      }

      const snippet = (page.meta_description || page.title || '').slice(0, 200);

      await SocialPost.create({
        site_id: siteId,
        platform,
        content: `${page.title}\n\n${snippet}`,
        link_url: page.url,
        source: 'auto_syndication',
        source_page_url: page.url,
        scheduled_at: new Date(), // draft - user reschedules before it's ever queued to publish
        status: 'draft',
      });

      draftedCount++;
    }
  }

  return { draftedCount, skippedCount: skipped.length, articlesScanned: articlePages.length };
}

module.exports = { draftPostsForNewArticles };
