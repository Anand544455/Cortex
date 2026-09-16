/**
 * Generates Google's official "write a review" deep link - the same
 * URL format Google documents for review-request campaigns, requiring
 * only the business's Google Place ID (found via Google Business
 * Profile or the Google Places API, not something CORTEX invents).
 */
function generateGoogleReviewLink(placeId) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/**
 * Simple lexicon-based sentiment scoring - no ML model, no external
 * API, just a word list. This is intentionally basic: good for a quick
 * triage pass on review text (flagging clearly negative reviews for
 * priority response), not a substitute for actually reading reviews.
 */
const POSITIVE_WORDS = new Set([
  'great', 'excellent', 'amazing', 'good', 'helpful', 'professional', 'fast',
  'friendly', 'recommend', 'best', 'perfect', 'satisfied', 'happy', 'quick',
  'reliable', 'trustworthy', 'affordable', 'efficient', 'thank', 'thanks',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'poor', 'slow', 'rude', 'unprofessional',
  'disappointed', 'waste', 'scam', 'never', 'worst', 'refund', 'complaint',
  'delay', 'delayed', 'ignored', 'overpriced', 'unresponsive', 'horrible',
]);

function analyzeSentiment(reviewText) {
  const words = reviewText.toLowerCase().split(/[^a-z']+/).filter(Boolean);

  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach((word) => {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  });

  let sentiment = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';

  return { sentiment, positiveWordCount: positiveCount, negativeWordCount: negativeCount };
}

module.exports = { generateGoogleReviewLink, analyzeSentiment };
