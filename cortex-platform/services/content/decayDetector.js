const { Op } = require('sequelize');
const { RankHistory } = require('../../models/sql');

/**
 * "Content decay" = a page that used to rank well is sliding over time.
 * Detected by comparing average position in the recent window against
 * the window before it, per tracked keyword - reuses RankHistory data
 * Phase 3 is already collecting, no new crawling needed.
 */
async function findContentDecay(siteId, { recentDays = 14, priorDays = 14, minPositionDrop = 3 } = {}) {
  const now = new Date();
  const recentStart = new Date(now);
  recentStart.setDate(recentStart.getDate() - recentDays);

  const priorStart = new Date(recentStart);
  priorStart.setDate(priorStart.getDate() - priorDays);

  const rows = await RankHistory.findAll({
    where: { site_id: siteId, checked_at: { [Op.gte]: priorStart }, position: { [Op.ne]: null } },
    order: [['checked_at', 'ASC']],
  });

  const byKeyword = {};
  rows.forEach((row) => {
    if (!byKeyword[row.keyword]) byKeyword[row.keyword] = [];
    byKeyword[row.keyword].push(row);
  });

  const findings = [];

  for (const [keyword, history] of Object.entries(byKeyword)) {
    const priorWindow = history.filter((r) => r.checked_at < recentStart);
    const recentWindow = history.filter((r) => r.checked_at >= recentStart);

    if (priorWindow.length === 0 || recentWindow.length === 0) continue;

    const avg = (rows) => rows.reduce((sum, r) => sum + r.position, 0) / rows.length;
    const priorAvg = avg(priorWindow);
    const recentAvg = avg(recentWindow);
    const positionDrop = recentAvg - priorAvg; // positive = got worse (higher number = lower rank)

    if (positionDrop >= minPositionDrop) {
      findings.push({
        keyword,
        priorAveragePosition: Math.round(priorAvg * 10) / 10,
        recentAveragePosition: Math.round(recentAvg * 10) / 10,
        positionDrop: Math.round(positionDrop * 10) / 10,
      });
    }
  }

  return findings.sort((a, b) => b.positionDrop - a.positionDrop);
}

module.exports = { findContentDecay };
