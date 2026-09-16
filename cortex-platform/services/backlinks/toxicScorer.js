/**
 * Rule-based toxic link detection - no ML model, just the heuristics
 * real link-audit workflows actually use. Runs in two passes: (1) a
 * per-link check using only that link's own data, and (2) a whole-index
 * pass that looks for patterns only visible across many links at once
 * (like the same exact-match anchor showing up from dozens of domains -
 * a classic PBN/link-farm signature).
 */
const SPAM_TLDS = new Set(['xyz', 'top', 'club', 'work', 'click', 'loan', 'win', 'review', 'stream', 'gq', 'tk', 'ml', 'cf', 'ga', 'racing', 'download']);

const SPAM_ANCHOR_KEYWORDS = [
  'casino', 'viagra', 'cialis', 'porn', 'xxx', 'loan shark', 'payday loan',
  'replica watch', 'weight loss pill', 'forex signal', 'bitcoin doubler',
];

function scoreLink(link) {
  const reasons = [];
  const tld = (link.source_domain || '').split('.').pop();

  if (SPAM_TLDS.has(tld)) {
    reasons.push(`Source domain uses a commonly-abused TLD (.${tld}).`);
  }

  const anchorLower = (link.anchor_text || '').toLowerCase();
  const matchedKeyword = SPAM_ANCHOR_KEYWORDS.find((kw) => anchorLower.includes(kw));
  if (matchedKeyword) {
    reasons.push(`Anchor text contains a known spam pattern ("${matchedKeyword}").`);
  }

  if (link.domain_score === 0) {
    reasons.push('Source domain has no measurable authority (score of 0).');
  }

  return { isToxic: reasons.length > 0, reasons };
}

/**
 * @param {object[]} links - full backlink list for one site
 * @returns {object[]} same links, each annotated with is_toxic + toxic_reason
 */
function scoreBacklinkIndex(links) {
  // Pass 2: exact-match anchor repeated from 5+ distinct low-authority domains
  // pointing at the same target is a link-farm/PBN pattern.
  const anchorTargetGroups = {};
  links.forEach((link) => {
    if (!link.anchor_text) return;
    const key = `${link.anchor_text.toLowerCase().trim()}|${link.target_url}`;
    if (!anchorTargetGroups[key]) anchorTargetGroups[key] = new Set();
    anchorTargetGroups[key].add(link.source_domain);
  });

  return links.map((link) => {
    const { isToxic: perLinkToxic, reasons } = scoreLink(link);

    const key = `${(link.anchor_text || '').toLowerCase().trim()}|${link.target_url}`;
    const distinctSources = anchorTargetGroups[key]?.size || 0;
    const isRepeatedPattern = link.anchor_text && distinctSources >= 5 && link.domain_score < 20;

    if (isRepeatedPattern) {
      reasons.push(
        `Exact-match anchor "${link.anchor_text}" repeated from ${distinctSources} low-authority domains - link-farm pattern.`
      );
    }

    return {
      ...link,
      is_toxic: perLinkToxic || isRepeatedPattern,
      toxic_reason: reasons.join(' '),
    };
  });
}

module.exports = { scoreLink, scoreBacklinkIndex };
