const { getSerpProvider } = require('../serp');

/**
 * True citation-tracking tools (Moz Local, Whitespark) maintain their
 * own direct integrations with each directory. Without one configured,
 * this falls back to checking whether the business is indexed on each
 * directory at all via a SERP search - it confirms presence, not the
 * exact phone/address text shown there (that would need actually
 * fetching and parsing each directory's listing page, which varies
 * wildly in structure site to site). Good for a first-pass "are we even
 * listed here" check; manual verification of the actual NAP details is
 * still worthwhile before relying on this alone.
 */
const COMMON_DIRECTORIES = [
  { name: 'Google Business Profile', domainFilter: 'google.com/maps' },
  { name: 'Facebook', domainFilter: 'facebook.com' },
  { name: 'Justdial', domainFilter: 'justdial.com' },
  { name: 'Sulekha', domainFilter: 'sulekha.com' },
  { name: 'IndiaMART', domainFilter: 'indiamart.com' },
  { name: 'Yelp', domainFilter: 'yelp.com' },
  { name: 'Bing Places', domainFilter: 'bing.com/maps' },
];

async function scanNapConsistency(businessName, phone) {
  const provider = getSerpProvider();
  const findings = [];

  for (const directory of COMMON_DIRECTORIES) {
    const query = phone
      ? `site:${directory.domainFilter} "${businessName}" "${phone}"`
      : `site:${directory.domainFilter} "${businessName}"`;

    const serp = await provider.search(query, {});
    const found = serp.results.length > 0;

    findings.push({
      directory: directory.name,
      found,
      matchedUrl: found ? serp.results[0].url : null,
    });

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  const listedCount = findings.filter((f) => f.found).length;

  return {
    businessName,
    directoriesChecked: findings.length,
    listedCount,
    coveragePercent: Math.round((listedCount / findings.length) * 100),
    findings,
  };
}

module.exports = { scanNapConsistency, COMMON_DIRECTORIES };
