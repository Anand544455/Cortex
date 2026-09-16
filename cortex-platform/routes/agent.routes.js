const express = require('express');
const router = express.Router({ mergeParams: true });
const agentController = require('../controllers/agent.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireWorkspaceRole } = require('../middleware/rbac.middleware');

router.use(requireAuth);
router.use(requireWorkspaceRole(['owner', 'manager', 'analyst', 'client_viewer']));

router.post('/audit', requireWorkspaceRole(['owner', 'manager', 'analyst']), agentController.runAgentAudit);

module.exports = router;
