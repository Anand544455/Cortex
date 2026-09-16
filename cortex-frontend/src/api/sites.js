import client from './client';

export const siteApi = {
  list: (workspaceId) => client.get(`/workspaces/${workspaceId}/sites`),
  create: (workspaceId, payload) => client.post(`/workspaces/${workspaceId}/sites`, payload),
  get: (workspaceId, siteId) => client.get(`/workspaces/${workspaceId}/sites/${siteId}`),
};
