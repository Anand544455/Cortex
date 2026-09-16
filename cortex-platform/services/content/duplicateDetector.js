const { hammingDistance } = require('../../utils/simhash.util');

/**
 * Compares every crawled page's content fingerprint against every
 * other page ON THE SAME SITE and flags pairs that are near-identical.
 * Threshold is calibrated for realistic page lengths (a few hundred
 * words+) - see utils/simhash.util.js for verification notes. Very
 * short pages (thin content) may need a stricter threshold; tune via
 * the second parameter if needed.
 *
 * This checks the site's OWN pages against each other (internal
 * duplicate content - a real, common SEO problem: near-identical
 * category/tag pages, boilerplate product descriptions, etc.). It does
 * NOT check against the wider web - that requires a paid plagiarism
 * API (Copyscape-style); see PLAGIARISM_API_* in .env if you want to
 * wire one in later, following the same provider-abstraction pattern
 * used for SERP and backlink data.
 */
function findDuplicateContent(pages, maxHammingDistance = 8) {
  const withFingerprints = pages.filter((p) => p.content_fingerprint);
  const duplicatePairs = [];

  for (let i = 0; i < withFingerprints.length; i++) {
    for (let j = i + 1; j < withFingerprints.length; j++) {
      const distance = hammingDistance(withFingerprints[i].content_fingerprint, withFingerprints[j].content_fingerprint);
      if (distance <= maxHammingDistance) {
        duplicatePairs.push({
          pageA: withFingerprints[i].url,
          pageB: withFingerprints[j].url,
          hammingDistance: distance,
          similarity: `${Math.round(((64 - distance) / 64) * 100)}%`,
        });
      }
    }
  }

  return duplicatePairs.sort((a, b) => a.hammingDistance - b.hammingDistance);
}

module.exports = { findDuplicateContent };
