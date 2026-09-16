const mongoose = require('mongoose');

const socialMentionSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    platform: { type: String, enum: ['facebook', 'instagram', 'x', 'linkedin', 'pinterest'], required: true },
    post_url: { type: String },
    author_handle: { type: String },
    content_excerpt: { type: String },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
    engagement: {
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
    },
    detected_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

socialMentionSchema.index({ site_id: 1, platform: 1, detected_at: -1 });

module.exports = mongoose.model('SocialMention', socialMentionSchema);
