const logger = require('../utils/logger.util');

/**
 * Expands one seed keyword into related search suggestions using
 * Google's public, unauthenticated autocomplete endpoint - the same
 * one the actual Google search box calls as you type. No API key
 * needed, but keep request volume modest and cache results where
 * possible; this is a convenience helper for seed expansion, not a
 * bulk-scraping tool.
 */
const MODIFIERS = ['', 'how to', 'what is', 'why', 'best', 'vs', 'near me', 'price', 'cost', 'for'];

async function fetchSuggestions(query) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const json = await response.json();
    return Array.isArray(json[1]) ? json[1] : [];
  } catch (err) {
    logger.warn(`Autocomplete fetch failed for "${query}": ${err.message}`);
    return [];
  }
}

/**
 * @param {string} seed - e.g. "hard drive data recovery"
 * @param {number} modifierLimit - how many of the built-in modifiers to try (default: all)
 * @returns {Promise<string[]>} deduplicated list of expanded keyword suggestions
 */
async function expandSeedKeyword(seed, modifierLimit = MODIFIERS.length) {
  const modifiersToUse = MODIFIERS.slice(0, modifierLimit);

  const queries = modifiersToUse.map((mod) => (mod ? `${mod} ${seed}` : seed));

  const results = await Promise.all(queries.map((q) => fetchSuggestions(q)));

  const flattened = results.flat().map((s) => s.trim().toLowerCase());
  return Array.from(new Set(flattened)).filter(Boolean);
}

module.exports = { expandSeedKeyword };
