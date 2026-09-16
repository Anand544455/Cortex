import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}`;

export const backlinkApi = {
  importCsv: (w, s, file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post(`${base(w, s)}/backlinks/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  sync: (w, s) => client.post(`${base(w, s)}/backlinks/sync`),
  list: (w, s, params) => client.get(`${base(w, s)}/backlinks`, { params }),
  summary: (w, s) => client.get(`${base(w, s)}/backlinks/summary`),
  rescanToxic: (w, s) => client.post(`${base(w, s)}/backlinks/rescan-toxic`),
  disavowUrl: (w, s) => `${client.defaults.baseURL}${base(w, s)}/backlinks/disavow`,
};

export const outreachApi = {
  findProspects: (w, s, payload) => client.post(`${base(w, s)}/prospects/find`, payload),
  list: (w, s, params) => client.get(`${base(w, s)}/prospects`, { params }),
  update: (w, s, prospectId, payload) => client.patch(`${base(w, s)}/prospects/${prospectId}`, payload),
  queueOutreach: (w, s, prospectId, payload) => client.post(`${base(w, s)}/prospects/${prospectId}/outreach`, payload),
  messages: (w, s, prospectId) => client.get(`${base(w, s)}/prospects/${prospectId}/messages`),
};
