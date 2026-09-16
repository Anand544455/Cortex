const mongoose = require('mongoose');

/**
 * One document per crawled URL. site_id is a plain string that
 * matches the UUID of a Site row in SQL - Mongo and SQL are linked
 * by convention (shared UUID), not a database-level foreign key.
 */
const pageRawSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    url: { type: String, required: true },
    status_code: { type: Number },
    title: { type: String },
    meta_description: { type: String },
    h1: { type: String },
    word_count: { type: Number },
    content_fingerprint: { type: String }, // 64-bit simhash (hex) - powers duplicate/near-duplicate detection
    canonical_url: { type: String },
    is_indexable: { type: Boolean, default: true },
    schema_types_found: [{ type: String }], // e.g. ["FAQPage", "Article"]
    core_web_vitals: {
      lcp: Number,
      cls: Number,
      inp: Number,
    },
    internal_links_out: { type: Number, default: 0 },
    internal_links_to: [{ type: String }], // actual URLs this page links to internally - powers internal-link suggestions
    external_links_out: { type: Number, default: 0 },
    crawled_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

pageRawSchema.index({ site_id: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('PageRaw', pageRawSchema);
