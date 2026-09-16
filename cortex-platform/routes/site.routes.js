const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');
const siteController = require('../controllers/site.controller');
const keywordController = require('../controllers/keyword.controller');
const crawlRoutes = require('./crawl.routes');
const keywordRoutes = require('./keyword.routes');
const backlinkRoutes = require('./backlink.routes');
const outreachRoutes = require('./outreach.routes');
const contentRoutes = require('./content.routes');
const aeoRoutes = require('./aeo.routes');
const smoRoutes = require('./smo.routes');
const localRoutes = require('./local.routes');
const competitorRoutes = require('./competitor.routes');
const reportingRoutes = require('./reporting.routes');
const integrationsRoutes = require('./integrations.routes');
const agentRoutes = require('./agent.routes');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post(
  '/',
  [body('domain').trim().notEmpty().withMessage('domain is required.')],
  validate,
  requireWorkspaceRole(['owner', 'manager']),
  siteController.createSite
);

router.get('/', siteController.listSites);
router.get('/:siteId', siteController.getSite);

// Crawl engine endpoints: /workspaces/:workspaceId/sites/:siteId/crawl, /pages, /audit, /crawl-logs
router.use('/:siteId', crawlRoutes);

// Keyword intelligence endpoints: /workspaces/:workspaceId/sites/:siteId/keywords/*
router.use(
  '/:siteId/keywords',
  requireAuth,
  requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']),
  keywordRoutes
);
router.get(
  '/:siteId/rank-history',
  requireAuth,
  requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']),
  keywordController.getRankHistory
);
router.get(
  '/:siteId/serp-snapshot',
  requireAuth,
  requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']),
  keywordController.getLatestSerpSnapshot
);

// Backlink engine endpoints: /workspaces/:workspaceId/sites/:siteId/backlinks/*
router.use('/:siteId/backlinks', backlinkRoutes);

// Prospect/outreach endpoints: /workspaces/:workspaceId/sites/:siteId/prospects/*
router.use('/:siteId/prospects', outreachRoutes);

// Content Studio endpoints: /workspaces/:workspaceId/sites/:siteId/content/*
router.use('/:siteId/content', contentRoutes);

// AEO/GEO Lab endpoints: /workspaces/:workspaceId/sites/:siteId/aeo/*
router.use('/:siteId/aeo', aeoRoutes);

// SMO Suite endpoints: /workspaces/:workspaceId/sites/:siteId/smo/*
router.use('/:siteId/smo', smoRoutes);

// Local SEO endpoints: /workspaces/:workspaceId/sites/:siteId/local/*
router.use('/:siteId/local', localRoutes);

// Competitor Intelligence endpoints: /workspaces/:workspaceId/sites/:siteId/competitors/*
router.use('/:siteId/competitors', competitorRoutes);

// Reporting endpoints: /workspaces/:workspaceId/sites/:siteId/reports/*
router.use('/:siteId/reports', reportingRoutes);

// Integrations endpoints: /workspaces/:workspaceId/sites/:siteId/integrations/*
router.use('/:siteId/integrations', integrationsRoutes);

// Agent endpoints: /workspaces/:workspaceId/sites/:siteId/agent/*
router.use('/:siteId/agent', agentRoutes);

module.exports = router;
