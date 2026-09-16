const mongoose = require('mongoose');

/**
 * One document per (keyword, grid point, check date) - the geo-grid
 * view plots these as a heatmap: dense pins near the business location,
 * position color-coded, showing exactly where local pack visibility
 * drops off.
 */
const geoGridResultSchema = new mongoose.Schema(
  {
    site_id: { type: String, required: true, index: true },
    keyword: { type: String, required: true },
    grid_lat: { type: Number, required: true },
    grid_lng: { type: Number, required: true },
    distance_from_center_km: { type: Number },
    local_pack_position: { type: Number }, // null = not present in the local pack at this point
    organic_position: { type: Number }, // null = not present in top results either
    captured_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

geoGridResultSchema.index({ site_id: 1, keyword: 1, captured_at: -1 });

module.exports = mongoose.model('GeoGridResult', geoGridResultSchema);
