const mongoose = require('mongoose');

const outreachMessageSchema = new mongoose.Schema(
  {
    prospect_id: { type: String, required: true, index: true },
    site_id: { type: String, required: true, index: true },
    direction: { type: String, enum: ['outbound', 'inbound'], required: true },
    subject: { type: String },
    body_excerpt: { type: String }, // truncated preview, not the full raw email body
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'bounced', 'received'],
      default: 'queued',
    },
    error_message: { type: String },
    sent_at: { type: Date },
    received_at: { type: Date },
  },
  { timestamps: true }
);

outreachMessageSchema.index({ prospect_id: 1, createdAt: -1 });

module.exports = mongoose.model('OutreachMessage', outreachMessageSchema);
