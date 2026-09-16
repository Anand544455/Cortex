import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}`;

export const crawlApi = {
  triggerCrawl: (w, s) => client.post(`${base(w, s)}/crawl`),
  getCrawlLogs: (w, s, limit = 20) => client.get(`${base(w, s)}/crawl-logs`, { params: { limit } }),
  getPages: (w, s, page = 1, pageSize = 25) => client.get(`${base(w, s)}/pages`, { params: { page, pageSize } }),
  getAudit: (w, s) => client.get(`${base(w, s)}/audit`),
};
