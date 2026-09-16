const mongoose = require('mongoose');

const serpSnapshotSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    keyword: { type: String, required: true },
    search_engine: { type: String, enum: ['google', 'bing'], default: 'google' },
    location: { type: String },
    results: [
      {
        position: Number,
        url: String,
        title: String,
        domain: String,
      },
    ],
    serp_features: [{ type: String }], // e.g. ["featured_snippet", "ai_overview", "people_also_ask", "local_pack"]
    ai_overview_present: { type: Boolean, default: false },
    ai_overview_cites_site: { type: Boolean, default: false },
    captured_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

serpSnapshotSchema.index({ site_id: 1, keyword: 1, captured_at: -1 });

module.exports = mongoose.model('SerpSnapshot', serpSnapshotSchema);
