import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}`;

export const smoApi = {
  createPost: (w, s, payload) => client.post(`${base(w, s)}/smo/posts`, payload),
  listPosts: (w, s, params) => client.get(`${base(w, s)}/smo/posts`, { params }),
  queuePost: (w, s, postId) => client.post(`${base(w, s)}/smo/posts/${postId}/queue`),
  syndicate: (w, s, platforms) => client.post(`${base(w, s)}/smo/syndicate`, { platforms }),
  mentions: (w, s, params) => client.get(`${base(w, s)}/smo/mentions`, { params }),
};
