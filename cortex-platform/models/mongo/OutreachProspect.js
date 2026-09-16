const mongoose = require('mongoose');

const outreachProspectSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    domain: { type: String, required: true },
    page_url: { type: String },
    page_title: { type: String },
    prospect_type: { type: String, enum: ['guest_post', 'resource_page', 'broken_link', 'manual'], default: 'manual' },
    discovered_via_query: { type: String },
    contact_email: { type: String },
    contact_name: { type: String },
    status: {
      type: String,
      enum: ['new', 'queued', 'contacted', 'replied', 'accepted', 'rejected', 'bounced'],
      default: 'new',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

outreachProspectSchema.index({ site_id: 1, domain: 1 }, { unique: true });

module.exports = mongoose.model('OutreachProspect', outreachProspectSchema);
