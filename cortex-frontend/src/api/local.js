import client from './client';

const base = (w, s) => `/workspaces/${w}/sites/${s}`;

export const localApi = {
  runGeoGrid: (w, s, payload) => client.post(`${base(w, s)}/local/geo-grid`, payload),
  getGeoGrid: (w, s, keyword) => client.get(`${base(w, s)}/local/geo-grid`, { params: { keyword } }),
  napScan: (w, s, payload) => client.post(`${base(w, s)}/local/nap-scan`, payload),
  reviewLink: (w, s, placeId) => client.get(`${base(w, s)}/local/review-link`, { params: { placeId } }),
  reviewSentiment: (w, s, reviewText) => client.post(`${base(w, s)}/local/review-sentiment`, { reviewText }),
};
