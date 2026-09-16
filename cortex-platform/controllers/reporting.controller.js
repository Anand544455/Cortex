const { Site, RankHistory } = require('../models/sql');
const { gatherSiteReportData } = require('../services/reporting/dataGatherer');
const { buildSiteReportPdf } = require('../services/reporting/pdfReportBuilder');
const { toCsv } = require('../services/reporting/csvExport');
const { linearForecast } = require('../services/reporting/forecast');
const { success, failure } = require('../utils/apiResponse.util');

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/reports/pdf?days=30
 * Downloads a branded PDF pulling together every module's data.
 */
async function downloadPdfReport(req, res) {
  const { siteId } = req.params;
  const days = Number(req.query.days) || 30;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const data = await gatherSiteReportData(siteId, { days });
  const pdfBuffer = await buildSiteReportPdf({
    site,
    branding: { companyName: req.query.companyName || 'CORTEX' },
    ...data,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${site.domain}-report.pdf"`);
  return res.status(200).send(pdfBuffer);
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/reports/json?days=30
 * Same underlying data as the PDF, as raw JSON for building your own dashboard view.
 */
async function getJsonReport(req, res) {
  const { siteId } = req.params;
  const days = Number(req.query.days) || 30;

  const site = await Site.findByPk(siteId);
  if (!site) return failure(res, 404, 'Site not found.');

  const data = await gatherSiteReportData(siteId, { days });
  return success(res, 200, 'Report data fetched.', {
    site: { domain: site.domain, display_name: site.display_name },
    ...data,
  });
}

/**
 * GET /api/workspaces/:workspaceId/sites/:siteId/reports/export/:dataset
 * dataset = rank-history (only dataset wired up in this phase; add
 * more by pulling from the relevant model, same pattern).
 */
async function exportCsv(req, res) {
  const { siteId, dataset } = req.params;

  if (dataset !== 'rank-history') {
    return failure(res, 400, 'Only "rank-history" is supported as an export dataset right now.');
  }

  const rows = await RankHistory.findAll({ where: { site_id: siteId }, order: [['checked_at', 'DESC']], raw: true });
  const csv = toCsv(rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${dataset}.csv"`);
  return res.status(200).send(csv);
}

/**
 * POST /api/workspaces/:workspaceId/sites/:siteId/reports/forecast
 * Body: { series: [{ value }], pointsToForecast? }
 * Generic - works for any KPI series the caller already has (rank
 * position, traffic estimate, health score over time, etc).
 */
async function getForecast(req, res) {
  const { series, pointsToForecast } = req.body;

  if (!Array.isArray(series) || series.length < 2) {
    return failure(res, 400, 'series must be an array of at least 2 { value } points.');
  }

  const result = linearForecast(series, pointsToForecast || 4);
  return success(res, 200, 'Forecast generated.', result);
}

module.exports = { downloadPdfReport, getJsonReport, exportCsv, getForecast };
