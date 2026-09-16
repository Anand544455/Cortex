const { getSerpProvider } = require('../serp');

/**
 * Finds link-building prospects using common "footprint" search queries -
 * the same manual technique link builders use, just automated through
 * whichever SERP provider is configured (see services/serp/).
 *
 * Honest scope note: true broken-link building (finding dead pages on
 * OTHER sites and offering your content as a replacement) needs to
 * cross-reference a target site's dead links against your own content -
 * that requires crawling the prospect's site too, which this function
 * does not do. What it returns here is a directional prospect list
 * (candidate domains/pages worth manually reviewing and reaching out
 * to), not a fully verified "this exact link is broken" report.
 */
const FOOTPRINTS = {
  guest_post: [
    '"{niche}" "write for us"',
    '"{niche}" "guest post guidelines"',
    '"{niche}" "contribute" "guest author"',
  ],
  resource_page: [
    '"{niche}" "resources" intitle:resources',
    '"{niche}" "useful links" inurl:resources',
    '"{niche}" "helpful resources"',
  ],
  broken_link: [
    '"{niche}" "resources" "link to us"',
    '"{niche}" "recommended links" -"write for us"',
  ],
};

/**
 * @param {string} niche - seed topic/keyword, e.g. "data recovery"
 * @param {string[]} prospectTypes - subset of ['guest_post','resource_page','broken_link']
 */
async function findProspects(niche, prospectTypes = ['guest_post', 'resource_page']) {
  const provider = getSerpProvider();
  const prospects = [];
  const seenDomains = new Set();

  for (const type of prospectTypes) {
    const queries = (FOOTPRINTS[type] || []).map((q) => q.replace('{niche}', niche));

    for (const query of queries) {
      const serp = await provider.search(query, {});

      for (const result of serp.results) {
        if (!result.domain || seenDomains.has(result.domain)) continue;
        seenDomains.add(result.domain);

        prospects.push({
          domain: result.domain,
          page_url: result.url,
          page_title: result.title,
          prospect_type: type,
          discovered_via_query: query,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 800)); // same pacing reasoning as rankTracker
    }
  }

  return prospects;
}

module.exports = { findProspects };
