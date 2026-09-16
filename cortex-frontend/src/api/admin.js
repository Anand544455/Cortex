import client from './client';

export const adminApi = {
  listUsers: () => client.get('/admin/users'),
  updateUser: (userId, payload) => client.patch(`/admin/users/${userId}`, payload),
  listWorkspaces: () => client.get('/admin/workspaces'),
  listWorkspaceSites: (workspaceId) => client.get(`/admin/workspaces/${workspaceId}/sites`),
};
