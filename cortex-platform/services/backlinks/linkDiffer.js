const { BacklinkIndex } = require('../../models/mongo');
const { scoreBacklinkIndex } = require('./toxicScorer');

/**
 * Upserts a fresh batch of backlinks into the index and (optionally)
 * marks previously-active links that are missing from this batch as
 * "lost". Only set markLostForMissing=true for a FULL sync from an API
 * provider that returns your complete backlink profile each time - a
 * partial CSV export shouldn't be treated as "everything else is gone".
 */
async function syncBacklinks(siteId, freshLinks, { markLostForMissing = false } = {}) {
  const scored = scoreBacklinkIndex(freshLinks);

  let newCount = 0;
  let updatedCount = 0;
  const seenKeys = new Set();

  for (const link of scored) {
    if (!link.source_url || !link.target_url) continue;

    const key = `${link.source_url}|${link.target_url}`;
    seenKeys.add(key);

    const existing = await BacklinkIndex.findOne({
      site_id: siteId,
      source_url: link.source_url,
      target_url: link.target_url,
    });

    if (existing) {
      existing.anchor_text = link.anchor_text;
      existing.link_type = link.link_type;
      existing.domain_score = link.domain_score;
      existing.is_toxic = link.is_toxic;
      existing.toxic_reason = link.toxic_reason;
      existing.last_seen = new Date();
      existing.status = 'active';
      await existing.save();
      updatedCount++;
    } else {
      await BacklinkIndex.create({
        site_id: siteId,
        ...link,
        first_seen: new Date(),
        last_seen: new Date(),
        status: 'active',
      });
      newCount++;
    }
  }

  let lostCount = 0;
  if (markLostForMissing) {
    const activeExisting = await BacklinkIndex.find({ site_id: siteId, status: 'active' });
    for (const record of activeExisting) {
      const key = `${record.source_url}|${record.target_url}`;
      if (!seenKeys.has(key)) {
        record.status = 'lost';
        await record.save();
        lostCount++;
      }
    }
  }

  return { newCount, updatedCount, lostCount, totalProcessed: scored.length };
}

module.exports = { syncBacklinks };
