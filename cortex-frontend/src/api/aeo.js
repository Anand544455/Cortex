import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}`;

export const aeoApi = {
  checkCitation: (w, s, prompt) => client.post(`${base(w, s)}/aeo/citations/check`, { prompt }),
  listCitations: (w, s, params) => client.get(`${base(w, s)}/aeo/citations`, { params }),
  shareOfVoice: (w, s) => client.get(`${base(w, s)}/aeo/citations/share-of-voice`),
  generateSchema: (w, s, type, payload) => client.post(`${base(w, s)}/aeo/schema/${type}`, payload),
  answerScore: (w, s, payload) => client.post(`${base(w, s)}/aeo/answer-score`, payload),
  llmsTxtUrl: (w, s) => `${client.defaults.baseURL}${base(w, s)}/aeo/llms-txt`,
  crawlerAudit: (w, s) => client.get(`${base(w, s)}/aeo/ai-crawler-audit`),
};
