import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}/integrations`;

export const integrationsApi = {
  list: (w, s) => client.get(base(w, s)),
  connectGoogleUrl: (w, s, provider) => `${client.defaults.baseURL}${base(w, s)}/google/${provider}/connect`,
  disconnect: (w, s, provider) => client.delete(`${base(w, s)}/${provider}`),

  gscProperties: (w, s) => client.get(`${base(w, s)}/google_search_console/properties`),
  gscSelectProperty: (w, s, propertyUrl) => client.post(`${base(w, s)}/google_search_console/select-property`, { propertyUrl }),
  gscAnalytics: (w, s, dimensions) => client.get(`${base(w, s)}/google_search_console/analytics`, { params: { dimensions: dimensions?.join(',') } }),
  gscInspectUrl: (w, s, url) => client.post(`${base(w, s)}/google_search_console/inspect-url`, { url }),
  gscSubmitSitemap: (w, s) => client.post(`${base(w, s)}/google_search_console/submit-sitemap`),

  ga4Properties: (w, s) => client.get(`${base(w, s)}/google_analytics/properties`),
  ga4SelectProperty: (w, s, propertyId) => client.post(`${base(w, s)}/google_analytics/select-property`, { propertyId }),
  ga4Overview: (w, s) => client.get(`${base(w, s)}/google_analytics/overview`),

  gtmContainers: (w, s) => client.get(`${base(w, s)}/google_tag_manager/containers`),
  gtmSelectContainer: (w, s, containerPath) => client.post(`${base(w, s)}/google_tag_manager/select-container`, { containerPath }),
  gtmCreateGa4Tag: (w, s, measurementId) => client.post(`${base(w, s)}/google_tag_manager/create-ga4-tag`, { measurementId }),

  pagespeed: (w, s, url, strategy) => client.get(`${base(w, s)}/pagespeed`, { params: { url, strategy } }),

  indexNowGenerateKey: (w, s) => client.get(`${base(w, s)}/indexnow/generate-key`),
  indexNowSubmit: (w, s, urls) => client.post(`${base(w, s)}/indexnow/submit`, { urls }),

  bingPerformance: (w, s) => client.get(`${base(w, s)}/bing/performance`),
};
