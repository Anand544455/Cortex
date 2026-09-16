const mongoose = require('mongoose');

/**
 * Powers the AEO/GEO Lab module: tracks whether a site is cited
 * when a given prompt is asked to an LLM-based answer engine.
 */
const aiCitationSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    engine: {
      type: String,
      enum: ['chatgpt', 'claude', 'gemini', 'perplexity', 'google_ai_overview', 'copilot'],
      required: true,
    },
    prompt: { type: String, required: true },
    was_cited: { type: Boolean, default: false },
    cited_url: { type: String },
    citation_position: { type: Number }, // order among cited sources, if applicable
    competitor_domains_cited: [{ type: String }],
    raw_response_excerpt: { type: String }, // short excerpt only, not full text, for audit purposes
    checked_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

aiCitationSchema.index({ site_id: 1, engine: 1, checked_at: -1 });

module.exports = mongoose.model('AiCitation', aiCitationSchema);
