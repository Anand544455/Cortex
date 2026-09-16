const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    platform: { type: String, enum: ['facebook', 'instagram', 'x', 'linkedin', 'pinterest'], required: true },
    content: { type: String, required: true },
    link_url: { type: String },
    media_url: { type: String },
    source: { type: String, enum: ['manual', 'auto_syndication'], default: 'manual' },
    source_page_url: { type: String }, // set when created via auto-syndication from a crawled article
    scheduled_at: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'queued', 'posted', 'failed'], default: 'draft' },
    posted_at: { type: Date },
    error_message: { type: String },
  },
  { timestamps: true }
);

socialPostSchema.index({ site_id: 1, scheduled_at: 1 });

module.exports = mongoose.model('SocialPost', socialPostSchema);
