/**
 * PageSpeed Insights API is entirely free - just needs an API key
 * from Google Cloud Console (no billing account required for this
 * particular API, generous free quota). Crucially, it returns BOTH:
 *   - lab data (a Lighthouse run, similar to what our own crawler
 *     estimates in crawler/coreWebVitals.js)
 *   - field data from the Chrome UX Report (CrUX) - REAL measurements
 *     from real Chrome users who've visited the page, including the
 *     one lab data structurally cannot produce: genuine INP from real
 *     interactions. This is the honest fix for the gap explicitly
 *     flagged in Phase 2's coreWebVitals.js.
 *
 * Requires in .env: PAGESPEED_API_KEY=
 * Get one free at: https://console.cloud.google.com/apis/credentials
 * (enable "PageSpeed Insights API" on the project first)
 */
async function analyzeUrl(url, strategy = 'mobile') {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    throw new Error('PAGESPEED_API_KEY is not set - get a free key from Google Cloud Console (no billing required for this API).');
  }

  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy,
    category: 'PERFORMANCE',
  });

  const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PageSpeed Insights request failed: HTTP ${response.status} - ${body.slice(0, 200)}`);
  }

  const data = await response.json();

  const lab = data.lighthouseResult?.audits || {};
  const field = data.loadingExperience?.metrics || {};
  const originField = data.originLoadingExperience?.metrics || {};

  return {
    url,
    strategy,
    performanceScore: Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100),
    lab: {
      lcp: lab['largest-contentful-paint']?.numericValue,
      cls: lab['cumulative-layout-shift']?.numericValue,
      tbt: lab['total-blocking-time']?.numericValue,
      fcp: lab['first-contentful-paint']?.numericValue,
      speedIndex: lab['speed-index']?.numericValue,
    },
    field: {
      lcp: field['LARGEST_CONTENTFUL_PAINT_MS']?.percentile,
      cls: field['CUMULATIVE_LAYOUT_SHIFT_SCORE']?.percentile,
      inp: field['INTERACTION_TO_NEXT_PAINT']?.percentile,
      fcp: field['FIRST_CONTENTFUL_PAINT_MS']?.percentile,
      hasFieldData: Object.keys(field).length > 0,
    },
    originField: {
      lcp: originField['LARGEST_CONTENTFUL_PAINT_MS']?.percentile,
      cls: originField['CUMULATIVE_LAYOUT_SHIFT_SCORE']?.percentile,
      inp: originField['INTERACTION_TO_NEXT_PAINT']?.percentile,
      hasFieldData: Object.keys(originField).length > 0,
    },
  };
}

module.exports = { analyzeUrl };
