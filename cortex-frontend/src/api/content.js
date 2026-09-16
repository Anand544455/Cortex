import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}`;

export const contentApi = {
  score: (w, s, payload) => client.post(`${base(w, s)}/content/score`, payload),
  brief: (w, s, keyword) => client.get(`${base(w, s)}/content/brief`, { params: { keyword } }),
  duplicates: (w, s) => client.get(`${base(w, s)}/content/duplicates`),
  cannibalization: (w, s) => client.get(`${base(w, s)}/content/cannibalization`),
  decay: (w, s, params) => client.get(`${base(w, s)}/content/decay`, { params }),
  internalLinks: (w, s) => client.get(`${base(w, s)}/content/internal-links`),
};
