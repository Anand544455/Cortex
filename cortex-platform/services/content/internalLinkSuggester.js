const { clusterKeywords } = require('../keywordClustering');

/**
 * Reuses the same TF-IDF/cosine-similarity clustering built for
 * keywords (Phase 3) - this time clustering page TITLES to find
 * topically related pages, then checking the crawled link graph
 * (PageRaw.internal_links_to) to see which related pairs don't
 * already link to each other.
 */
function suggestInternalLinks(pages, similarityThreshold = 0.3) {
  const validPages = pages.filter((p) => p.title);
  if (validPages.length < 2) return [];

  const titles = validPages.map((p) => p.title);
  const clusters = clusterKeywords(titles, similarityThreshold);

  const urlByTitle = {};
  validPages.forEach((p) => {
    urlByTitle[p.title] = p;
  });

  const suggestions = [];

  clusters
    .filter((cluster) => cluster.keywords.length >= 2)
    .forEach((cluster) => {
      const clusterPages = cluster.keywords.map((title) => urlByTitle[title]).filter(Boolean);

      for (let i = 0; i < clusterPages.length; i++) {
        for (let j = i + 1; j < clusterPages.length; j++) {
          const pageA = clusterPages[i];
          const pageB = clusterPages[j];

          const aLinksToB = (pageA.internal_links_to || []).includes(pageB.url);
          const bLinksToA = (pageB.internal_links_to || []).includes(pageA.url);

          if (!aLinksToB && !bLinksToA) {
            suggestions.push({
              pageA: { url: pageA.url, title: pageA.title },
              pageB: { url: pageB.url, title: pageB.title },
              reason: 'Topically related (similar title/content) but no internal link exists between them.',
            });
          }
        }
      }
    });

  return suggestions;
}

module.exports = { suggestInternalLinks };
