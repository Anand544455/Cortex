import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}`;

export const competitorApi = {
  shareOfVoice: (w, s, payload) => client.post(`${base(w, s)}/competitors/share-of-voice`, payload),
  contentCadence: (w, s, domain) => client.get(`${base(w, s)}/competitors/content-cadence`, { params: { domain } }),
  alerts: (w, s, payload) => client.post(`${base(w, s)}/competitors/alerts`, payload),
  trafficEstimate: (w, s, payload) => client.post(`${base(w, s)}/competitors/traffic-estimate`, payload),
};

export const reportingApi = {
  pdfUrl: (w, s, days) => `${client.defaults.baseURL}${base(w, s)}/reports/pdf?days=${days || 30}`,
  json: (w, s, days) => client.get(`${base(w, s)}/reports/json`, { params: { days } }),
  exportCsvUrl: (w, s, dataset) => `${client.defaults.baseURL}${base(w, s)}/reports/export/${dataset}`,
  forecast: (w, s, payload) => client.post(`${base(w, s)}/reports/forecast`, payload),
};
