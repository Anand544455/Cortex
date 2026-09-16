const { getSerpProvider } = require('./serp');

/**
 * For each keyword, runs one live SERP check and reports where the
 * site ranks vs. where each competitor domain ranks. A keyword is
 * flagged as a "gap" when at least one competitor ranks in the top 10
 * and the site does not (or ranks worse than every competitor).
 */
async function analyzeKeywordGap(siteDomain, competitorDomains, keywords, options = {}) {
  const provider = getSerpProvider();
  const cleanSite = siteDomain.replace(/^www\./, '');
  const cleanCompetitors = competitorDomains.map((d) => d.replace(/^www\./, ''));

  const rows = [];

  for (const keyword of keywords) {
    const serp = await provider.search(keyword, options);

    const findPosition = (domain) => {
      const match = serp.results.find((r) => r.domain === domain);
      return match ? match.position : null;
    };

    const sitePosition = findPosition(cleanSite);
    const competitorPositions = {};
    cleanCompetitors.forEach((domain) => {
      competitorPositions[domain] = findPosition(domain);
    });

    const bestCompetitorPosition = Math.min(
      ...Object.values(competitorPositions).filter((p) => p !== null),
      Infinity
    );

    const isGap =
      bestCompetitorPosition <= 10 && (sitePosition === null || sitePosition > bestCompetitorPosition);

    rows.push({
      keyword,
      sitePosition,
      competitorPositions,
      isGap,
    });

    await new Promise((resolve) => setTimeout(resolve, 800)); // pacing, same reasoning as rankTracker
  }

  return {
    totalKeywords: keywords.length,
    gapCount: rows.filter((r) => r.isGap).length,
    rows,
  };
}

module.exports = { analyzeKeywordGap };
