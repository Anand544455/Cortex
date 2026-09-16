/**
 * Groups a flat list of keywords into topic clusters using TF-IDF +
 * cosine similarity - entirely self-hosted, no external embeddings
 * API required. This is intentionally simple (word-overlap based)
 * rather than true semantic clustering.
 *
 * Upgrade path: swap `buildVectors()` for real sentence embeddings
 * (a local model via transformers.js, or an embeddings API) later -
 * the clustering logic (cosineSimilarity + greedy grouping) stays the
 * same either way, only the vector source changes.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'is', 'are',
  'how', 'what', 'why', 'with', 'best', 'top', 'near', 'me', 'vs', 'your',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

function buildVectors(keywords) {
  const tokenized = keywords.map(tokenize);
  const vocabulary = Array.from(new Set(tokenized.flat()));

  const docFrequency = {};
  vocabulary.forEach((term) => {
    docFrequency[term] = tokenized.filter((tokens) => tokens.includes(term)).length;
  });

  const N = keywords.length;

  return tokenized.map((tokens) => {
    const termFrequency = {};
    tokens.forEach((t) => (termFrequency[t] = (termFrequency[t] || 0) + 1));

    return vocabulary.map((term) => {
      const tf = termFrequency[term] || 0;
      if (tf === 0) return 0;
      const idf = Math.log((N + 1) / (docFrequency[term] + 1)) + 1;
      return tf * idf;
    });
  });
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * @param {string[]} keywords
 * @param {number} similarityThreshold 0-1, higher = tighter/smaller clusters
 * @returns {{ label: string, keywords: string[] }[]}
 */
function clusterKeywords(keywords, similarityThreshold = 0.35) {
  if (keywords.length === 0) return [];

  const vectors = buildVectors(keywords);
  const assigned = new Array(keywords.length).fill(false);
  const clusters = [];

  for (let i = 0; i < keywords.length; i++) {
    if (assigned[i]) continue;

    const clusterIndices = [i];
    assigned[i] = true;

    for (let j = i + 1; j < keywords.length; j++) {
      if (assigned[j]) continue;
      const similarity = cosineSimilarity(vectors[i], vectors[j]);
      if (similarity >= similarityThreshold) {
        clusterIndices.push(j);
        assigned[j] = true;
      }
    }

    clusters.push({
      label: keywords[clusterIndices[0]], // shortest/first keyword as the representative label
      keywords: clusterIndices.map((idx) => keywords[idx]),
    });
  }

  // Sort largest clusters first - the most "topic-rich" groupings surface at the top.
  return clusters.sort((a, b) => b.keywords.length - a.keywords.length);
}

module.exports = { clusterKeywords };
