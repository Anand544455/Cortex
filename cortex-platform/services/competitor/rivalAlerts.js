const { SerpSnapshot } = require('../../models/mongo');

/**
 * Reuses the SERP snapshot history Phase 3 already collects (no new
 * data source) - for each tracked keyword, compares the two most
 * recent snapshots and reports how each competitor domain's position
 * changed between them.
 */
async function findRivalRankingChanges(siteId, competitorDomains) {
  const cleanCompetitors = competitorDomains.map((d) => d.replace(/^www\./, ''));

  const keywords = await SerpSnapshot.distinct('keyword', { site_id: siteId });
  const alerts = [];

  for (const keyword of keywords) {
    const [latest, previous] = await SerpSnapshot.find({ site_id: siteId, keyword })
      .sort({ captured_at: -1 })
      .limit(2);

    if (!latest || !previous) continue;

    const findPosition = (snapshot, domain) => {
      const match = snapshot.results.find((r) => r.domain === domain);
      return match ? match.position : null;
    };

    for (const domain of cleanCompetitors) {
      const latestPosition = findPosition(latest, domain);
      const previousPosition = findPosition(previous, domain);

      if (latestPosition === previousPosition) continue; // no change, including both-null

      alerts.push({
        keyword,
        domain,
        previousPosition,
        latestPosition,
        change:
          previousPosition === null
            ? 'newly ranking'
            : latestPosition === null
              ? 'dropped out of results'
              : latestPosition < previousPosition
                ? 'improved'
                : 'declined',
        capturedAt: latest.captured_at,
      });
    }
  }

  return alerts;
}

module.exports = { findRivalRankingChanges };
