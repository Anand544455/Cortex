const { Op } = require('sequelize');
const { RankHistory } = require('../../models/sql');
const { PageRaw, BacklinkIndex } = require('../../models/mongo');
const { getCitationShareOfVoice } = require('../aeo/citationTracker');

/**
 * Single place that pulls together everything a report needs, so the
 * PDF builder, CSV export, and JSON export endpoints all read from the
 * exact same numbers rather than three slightly-different queries.
 */
async function gatherSiteReportData(siteId, { days = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [pages, backlinkStats, rankHistory, citationSummary] = await Promise.all([
    PageRaw.find({ site_id: siteId }).lean(),
    Promise.all([
      BacklinkIndex.countDocuments({ site_id: siteId, status: 'active' }),
      BacklinkIndex.countDocuments({ site_id: siteId, status: 'lost' }),
      BacklinkIndex.countDocuments({ site_id: siteId, is_toxic: true, status: 'active' }),
      BacklinkIndex.distinct('source_domain', { site_id: siteId, status: 'active' }),
    ]),
    RankHistory.findAll({
      where: { site_id: siteId, checked_at: { [Op.gte]: since } },
      order: [['checked_at', 'DESC']],
    }),
    getCitationShareOfVoice(siteId),
  ]);

  const [totalActive, totalLost, totalToxic, referringDomains] = backlinkStats;

  let auditSummary = { totalPages: 0, healthScore: null, issues: {} };
  if (pages.length > 0) {
    const issues = {
      brokenPages: pages.filter((p) => p.status_code >= 400 || p.status_code === 0).length,
      missingTitle: pages.filter((p) => !p.title).length,
      missingMetaDescription: pages.filter((p) => !p.meta_description).length,
      thinContent: pages.filter((p) => p.word_count > 0 && p.word_count < 300).length,
    };
    const totalIssueWeight =
      issues.brokenPages * 3 + issues.missingTitle * 2 + issues.missingMetaDescription + issues.thinContent;
    const healthScore = Math.max(0, Math.round(100 - (totalIssueWeight / (pages.length * 7)) * 100));
    auditSummary = { totalPages: pages.length, healthScore, issues };
  }

  return {
    auditSummary,
    backlinkSummary: {
      totalActiveLinks: totalActive,
      totalLostLinks: totalLost,
      totalToxicLinks: totalToxic,
      referringDomains: referringDomains.length,
    },
    rankHistory: rankHistory.map((r) => ({
      keyword: r.keyword,
      position: r.position,
      checked_at: r.checked_at,
    })),
    citationSummary,
  };
}

module.exports = { gatherSiteReportData };
