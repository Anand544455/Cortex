import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}`;

export const keywordApi = {
  add: (w, s, keywords) => client.post(`${base(w, s)}/keywords`, { keywords }),
  list: (w, s) => client.get(`${base(w, s)}/keywords`),
  remove: (w, s, keywordId) => client.delete(`${base(w, s)}/keywords/${keywordId}`),
  runCheck: (w, s) => client.post(`${base(w, s)}/keywords/check`),
  rankHistory: (w, s, params) => client.get(`${base(w, s)}/rank-history`, { params }),
  serpSnapshot: (w, s, keyword) => client.get(`${base(w, s)}/serp-snapshot`, { params: { keyword } }),
  clusters: (w, s) => client.get(`${base(w, s)}/keywords/clusters`),
  expand: (w, s, seed) => client.get(`${base(w, s)}/keywords/expand`, { params: { seed } }),
  gap: (w, s, payload) => client.post(`${base(w, s)}/keywords/gap`, payload),
};
