const { parse } = require('csv-parse/sync');

/**
 * Ahrefs, SEMrush, and Moz all export backlinks as CSV but with
 * slightly different column names. Rather than requiring one exact
 * format, this looks for common header variants (case-insensitive)
 * so a real export from any of the three "just works" without the
 * user having to rename columns first.
 */
const HEADER_ALIASES = {
  source_url: ['referring page url', 'source url', 'url from', 'source_url', 'referring page'],
  target_url: ['target url', 'url to', 'target_url', 'landing page url'],
  anchor_text: ['anchor', 'anchor text', 'anchor_text'],
  domain_score: ['domain rating', 'domain score', 'dr', 'da', 'domain_rating', 'domain authority'],
  link_type: ['type', 'link type', 'nofollow', 'follow type'],
};

function findColumn(headers, aliases) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

/**
 * @param {Buffer|string} fileContent - raw CSV file content
 * @returns {{ source_url, source_domain, target_url, anchor_text, link_type, domain_score }[]}
 */
function parseBacklinkCsv(fileContent) {
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (records.length === 0) return [];

  const headers = Object.keys(records[0]);
  const columnMap = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    columnMap[field] = findColumn(headers, aliases);
  }

  if (!columnMap.source_url || !columnMap.target_url) {
    throw new Error(
      'Could not find "source URL" and "target URL" columns in this CSV. Supported exports: Ahrefs, SEMrush, Moz backlink reports.'
    );
  }

  return records
    .map((row) => {
      const sourceUrl = row[columnMap.source_url];
      const targetUrl = row[columnMap.target_url];
      if (!sourceUrl || !targetUrl) return null;

      const rawLinkType = columnMap.link_type ? String(row[columnMap.link_type]).toLowerCase() : '';
      const linkType = rawLinkType.includes('nofollow') || rawLinkType === 'true' ? 'nofollow' : 'dofollow';

      return {
        source_url: sourceUrl,
        source_domain: safeHostname(sourceUrl),
        target_url: targetUrl,
        anchor_text: columnMap.anchor_text ? row[columnMap.anchor_text] || '' : '',
        link_type: linkType,
        domain_score: columnMap.domain_score ? Number(row[columnMap.domain_score]) || 0 : 0,
      };
    })
    .filter(Boolean);
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

module.exports = { parseBacklinkCsv };
