const { getSerpProvider } = require('../serp');
const { GeoGridResult } = require('../../models/mongo');

const EARTH_RADIUS_KM = 6371;

/**
 * Generates an evenly-spaced square grid of lat/lng points around a
 * center coordinate - the standard "geo-grid" visualization local SEO
 * tools use to show how visibility changes with distance from the
 * business location, not just at one single point.
 *
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} radiusKm - half-width of the grid, in km
 * @param {number} gridSize - points per side (gridSize x gridSize total points)
 */
function generateGridPoints(centerLat, centerLng, radiusKm = 5, gridSize = 5) {
  const points = [];
  const step = (radiusKm * 2) / (gridSize - 1);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const offsetKmNorth = -radiusKm + row * step;
      const offsetKmEast = -radiusKm + col * step;

      const lat = centerLat + (offsetKmNorth / EARTH_RADIUS_KM) * (180 / Math.PI);
      const lng =
        centerLng + ((offsetKmEast / EARTH_RADIUS_KM) * (180 / Math.PI)) / Math.cos((centerLat * Math.PI) / 180);

      const distanceFromCenter = Math.sqrt(offsetKmNorth ** 2 + offsetKmEast ** 2);

      points.push({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        distanceFromCenterKm: Number(distanceFromCenter.toFixed(2)),
      });
    }
  }

  return points;
}

/**
 * Runs one keyword check at every grid point and saves the result.
 * NOTE: precise lat/lng-based local geo-targeting support varies a lot
 * between SERP API providers (some use a dedicated "ll"/"uule"/
 * "coordinates" parameter rather than a free-text location string) -
 * services/serp/apiSerpProvider.js passes coordinates as a "lat,lng"
 * location string by default; check your specific provider's docs and
 * adjust that mapping if their geo-grid support works differently.
 */
async function runGeoGridCheck(site, keyword, { centerLat, centerLng, radiusKm = 5, gridSize = 5 }) {
  const provider = getSerpProvider();
  const siteDomain = site.domain.replace(/^www\./, '');
  const points = generateGridPoints(centerLat, centerLng, radiusKm, gridSize);

  const results = [];

  for (const point of points) {
    const serp = await provider.search(keyword, { location: `${point.lat},${point.lng}` });

    const localMatch = (serp.local_pack_results || []).find((r) =>
      (r.title || '').toLowerCase().includes((site.display_name || siteDomain).toLowerCase())
    );
    const organicMatch = serp.results.find((r) => r.domain === siteDomain);

    const record = await GeoGridResult.create({
      site_id: site.id,
      keyword,
      grid_lat: point.lat,
      grid_lng: point.lng,
      distance_from_center_km: point.distanceFromCenterKm,
      local_pack_position: localMatch ? localMatch.position : null,
      organic_position: organicMatch ? organicMatch.position : null,
      captured_at: new Date(),
    });

    results.push(record);
    await new Promise((resolve) => setTimeout(resolve, 800)); // same pacing reasoning as rankTracker
  }

  const visiblePoints = results.filter((r) => r.local_pack_position !== null || r.organic_position !== null).length;

  return {
    keyword,
    totalPoints: results.length,
    visiblePoints,
    visibilityRate: Math.round((visiblePoints / results.length) * 100),
    results,
  };
}

module.exports = { generateGridPoints, runGeoGridCheck };
