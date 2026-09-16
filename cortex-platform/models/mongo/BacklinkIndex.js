const mongoose = require('mongoose');

const backlinkIndexSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    source_url: { type: String, required: true },
    source_domain: { type: String, required: true, index: true },
    target_url: { type: String, required: true },
    anchor_text: { type: String },
    link_type: { type: String, enum: ['dofollow', 'nofollow', 'ugc', 'sponsored'], default: 'dofollow' },
    domain_score: { type: Number, min: 0, max: 100, default: 0 },
    is_toxic: { type: Boolean, default: false },
    toxic_reason: { type: String },
    first_seen: { type: Date, default: Date.now },
    last_seen: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'lost'], default: 'active' },
  },
  { timestamps: true }
);

backlinkIndexSchema.index({ site_id: 1, source_url: 1, target_url: 1 }, { unique: true });

module.exports = mongoose.model('BacklinkIndex', backlinkIndexSchema);
