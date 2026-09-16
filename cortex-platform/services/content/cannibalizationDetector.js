const { SerpSnapshot } = require('../../models/mongo');

/**
 * Cannibalization = two of YOUR OWN pages competing for the same
 * keyword's search results, which usually means neither ranks as well
 * as one consolidated page would. Detected directly from SERP snapshot
 * data already being collected in Phase 3 - no new data source needed.
 */
async function findCannibalization(siteId, siteDomain) {
  const cleanDomain = siteDomain.replace(/^www\./, '');

  // Latest snapshot per keyword only - older snapshots would double-count trends over time.
  const snapshots = await SerpSnapshot.aggregate([
    { $match: { site_id: siteId } },
    { $sort: { captured_at: -1 } },
    { $group: { _id: '$keyword', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
  ]);

  const findings = [];

  for (const snapshot of snapshots) {
    const ownPages = snapshot.results.filter((r) => r.domain === cleanDomain);
    if (ownPages.length >= 2) {
      findings.push({
        keyword: snapshot.keyword,
        competingUrls: ownPages.map((p) => ({ url: p.url, position: p.position })),
        capturedAt: snapshot.captured_at,
      });
    }
  }

  return findings;
}

module.exports = { findCannibalization };
