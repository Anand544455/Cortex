import client from './client';

export const agentApi = {
  runAudit: (w, s) => client.post(`/workspaces/${w}/sites/${s}/agent/audit`),
};
