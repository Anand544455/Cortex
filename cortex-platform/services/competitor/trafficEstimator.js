/**
 * Traffic estimation tools like Ahrefs' "Traffic Value" are built on
 * proprietary click-through data from their own huge user panels -
 * that's not something to fake here. Instead, this uses a commonly
 * published, industry-standard CTR-by-position curve (the kind widely
 * cited in SEO research, not exact for any specific niche/query type)
 * applied to a monthly search volume YOU supply (from Google Keyword
 * Planner, Search Console, or a paid keyword tool - this app doesn't
 * have its own search volume data source). The result is a rough
 * estimate range, clearly labeled as such, not a precise figure.
 */
const CTR_BY_POSITION = {
  1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
  6: 0.05, 7: 0.04, 8: 0.03, 9: 0.025, 10: 0.02,
};

function estimateTrafficForKeyword(position, monthlySearchVolume) {
  if (!position || position > 10 || !monthlySearchVolume) {
    return { estimatedMonthlyClicks: 0, ctrUsed: 0, note: 'Position outside top 10 or no volume supplied.' };
  }

  const ctr = CTR_BY_POSITION[Math.round(position)] || 0.01;
  const estimate = Math.round(monthlySearchVolume * ctr);

  return {
    estimatedMonthlyClicks: estimate,
    lowEstimate: Math.round(estimate * 0.7),
    highEstimate: Math.round(estimate * 1.3),
    ctrUsed: ctr,
    note: 'Rough estimate from a published industry-average CTR curve, not measured click data.',
  };
}

/**
 * @param {{ keyword, position, monthlySearchVolume }[]} keywordData
 */
function estimateTotalTraffic(keywordData) {
  const perKeyword = keywordData.map((k) => ({
    keyword: k.keyword,
    position: k.position,
    ...estimateTrafficForKeyword(k.position, k.monthlySearchVolume),
  }));

  const totalEstimated = perKeyword.reduce((sum, k) => sum + (k.estimatedMonthlyClicks || 0), 0);

  return { totalEstimatedMonthlyClicks: totalEstimated, perKeyword };
}

module.exports = { estimateTrafficForKeyword, estimateTotalTraffic, CTR_BY_POSITION };
