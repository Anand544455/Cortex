const mongoose = require('mongoose');

const crawlLogSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    job_type: {
      type: String,
      enum: ['full_crawl', 'single_page', 'serp_check', 'backlink_scan', 'ai_citation_check'],
      required: true,
    },
    worker_region: { type: String }, // e.g. "ap-south-1"
    status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued' },
    pages_processed: { type: Number, default: 0 },
    errors_count: { type: Number, default: 0 },
    error_details: [{ url: String, message: String }],
    started_at: { type: Date },
    finished_at: { type: Date },
  },
  { timestamps: true }
);

crawlLogSchema.index({ site_id: 1, createdAt: -1 });

module.exports = mongoose.model('CrawlLog', crawlLogSchema);
