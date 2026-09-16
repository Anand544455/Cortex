import client from './client';

export const workspaceApi = {
  list: () => client.get('/workspaces'),
  create: (payload) => client.post('/workspaces', payload),
};
