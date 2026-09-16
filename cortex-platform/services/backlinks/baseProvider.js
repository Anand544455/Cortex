/**
 * Every backlink source normalizes to this shape:
 * {
 *   source_url, source_domain, target_url, anchor_text,
 *   link_type: 'dofollow'|'nofollow'|'ugc'|'sponsored',
 *   domain_score: 0-100
 * }
 *
 * Being upfront about what's realistic here: no self-hosted tool can
 * build a web-scale "who links to any domain" index from scratch -
 * that requires crawling a meaningful fraction of the entire web,
 * which is what Ahrefs/SEMrush/Moz have spent years and enormous
 * infrastructure doing. CORTEX's backlink data comes from two honest
 * sources instead: (1) a licensed backlink API you already pay for or
 * plan to, or (2) importing exports from tools you already use. Both
 * feed the same BacklinkIndex, so scoring/toxic-detection/disavow all
 * work identically regardless of where the data came from.
 */
class BaseBacklinkProvider {
  // eslint-disable-next-line no-unused-vars
  async fetchBacklinks(domain) {
    throw new Error('fetchBacklinks() must be implemented by a concrete backlink provider.');
  }
}

module.exports = BaseBacklinkProvider;
