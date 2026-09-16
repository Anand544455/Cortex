const { SerpSnapshot } = require('../../models/mongo');

/**
 * "Share of voice" here = how often the site appears in the top 10
 * across its tracked keywords, relative to how often each competitor
 * domain appears in those SAME keyword's SERPs - reusing the full
 * result lists Phase 3 already stores in SerpSnapshot rather than
 * requiring a new data source.
 */
async function calculateShareOfVoice(siteId, siteDomain, competitorDomains, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await SerpSnapshot.aggregate([
    { $match: { site_id: siteId, captured_at: { $gte: since } } },
    { $sort: { captured_at: -1 } },
    { $group: { _id: '$keyword', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
  ]);

  const cleanSite = siteDomain.replace(/^www\./, '');
  const cleanCompetitors = competitorDomains.map((d) => d.replace(/^www\./, ''));

  const presence = { [cleanSite]: 0 };
  cleanCompetitors.forEach((d) => (presence[d] = 0));

  snapshots.forEach((snapshot) => {
    const top10 = snapshot.results.filter((r) => r.position <= 10);
    const domainsInTop10 = new Set(top10.map((r) => r.domain));

    if (domainsInTop10.has(cleanSite)) presence[cleanSite] += 1;
    cleanCompetitors.forEach((d) => {
      if (domainsInTop10.has(d)) presence[d] += 1;
    });
  });

  const totalKeywords = snapshots.length;
  const shareOfVoice = Object.entries(presence).map(([domain, count]) => ({
    domain,
    isSite: domain === cleanSite,
    keywordsInTop10: count,
    sharePercent: totalKeywords > 0 ? Math.round((count / totalKeywords) * 100) : 0,
  }));

  return {
    totalKeywordsAnalyzed: totalKeywords,
    windowDays: days,
    shareOfVoice: shareOfVoice.sort((a, b) => b.keywordsInTop10 - a.keywordsInTop10),
  };
}

module.exports = { calculateShareOfVoice };
