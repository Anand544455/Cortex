/**
 * Captures an approximation of Core Web Vitals directly from a
 * Puppeteer-controlled page load.
 *
 * Honest limitation: LCP and CLS can be measured this way because they
 * are lab-observable during a single page load. INP (Interaction to
 * Next Paint) genuinely requires a real user interacting with the page,
 * which a headless, unattended crawl cannot produce. We return `inp: null`
 * here rather than inventing a number - real INP should come from the
 * Chrome UX Report (CrUX) API using real field data, which is a good
 * candidate for a Phase 5 integration (see Integrations Hub module).
 */
async function registerVitalsObservers(page) {
  await page.evaluateOnNewDocument(() => {
    window.__cortexLCP = 0;
    window.__cortexCLS = 0;

    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) window.__cortexLCP = last.renderTime || last.loadTime || 0;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      /* LCP observer not supported in this Chromium build */
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__cortexCLS += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      /* CLS observer not supported in this Chromium build */
    }
  });

}

/**
 * Call AFTER page.goto() has resolved. Gives the observers a short
 * moment to settle (late layout shifts, final LCP candidate) then reads
 * the values back out of the page context.
 */
async function readVitals(page) {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const vitals = await page.evaluate(() => ({
    lcp: Math.round(window.__cortexLCP || 0),
    cls: Number((window.__cortexCLS || 0).toFixed(4)),
  }));

  return {
    lcp: vitals.lcp,
    cls: vitals.cls,
    inp: null, // requires real-user field data (CrUX API) - see note above
  };
}

module.exports = { registerVitalsObservers, readVitals };
