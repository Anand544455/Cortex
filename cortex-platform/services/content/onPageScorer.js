/**
 * Scores a piece of content against a target keyword using rules any
 * real on-page checklist uses - no external API, runs instantly as
 * someone types (the "live optimizer score" from the feature map).
 */
function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = haystack.match(new RegExp(escaped, 'gi'));
  return matches ? matches.length : 0;
}

/**
 * Flesch Reading Ease - classic, well-documented formula, computed
 * with a simple syllable-counting heuristic (not perfect, but standard
 * for this kind of tool).
 */
function fleschReadingEase(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return 0;

  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllableCount / words.length;

  return Math.round(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord);
}

function countSyllables(word) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length <= 3) return 1;
  const vowelGroups = cleaned.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (cleaned.endsWith('e')) count -= 1;
  return Math.max(count, 1);
}

/**
 * @param {object} input
 * @param {string} input.title
 * @param {string} input.metaDescription
 * @param {string} input.h1
 * @param {string} input.bodyText - plain text content (no HTML)
 * @param {string} input.targetKeyword
 */
function scoreContent({ title = '', metaDescription = '', h1 = '', bodyText = '', targetKeyword = '' }) {
  const checks = [];
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const keywordLower = targetKeyword.toLowerCase();
  const first100Words = bodyText.split(/\s+/).slice(0, 100).join(' ');

  const titleHasKeyword = title.toLowerCase().includes(keywordLower);
  checks.push({
    check: 'Keyword in title',
    passed: titleHasKeyword,
    weight: 15,
    detail: titleHasKeyword ? 'Found in title.' : 'Target keyword is missing from the title.',
  });

  const h1HasKeyword = h1.toLowerCase().includes(keywordLower);
  checks.push({
    check: 'Keyword in H1',
    passed: h1HasKeyword,
    weight: 10,
    detail: h1HasKeyword ? 'Found in H1.' : 'Target keyword is missing from the H1 heading.',
  });

  const introHasKeyword = first100Words.toLowerCase().includes(keywordLower);
  checks.push({
    check: 'Keyword in first 100 words',
    passed: introHasKeyword,
    weight: 10,
    detail: introHasKeyword ? 'Found early in the content.' : 'Mention the keyword within the first 100 words.',
  });

  const metaHasKeyword = metaDescription.toLowerCase().includes(keywordLower);
  checks.push({
    check: 'Keyword in meta description',
    passed: metaHasKeyword,
    weight: 5,
    detail: metaHasKeyword ? 'Found in meta description.' : 'Add the keyword to the meta description.',
  });

  const keywordCount = countOccurrences(bodyText, targetKeyword);
  const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
  const densityOk = density >= 0.3 && density <= 2.5;
  checks.push({
    check: 'Keyword density',
    passed: densityOk,
    weight: 10,
    detail: `Keyword appears ${keywordCount} times (${density.toFixed(2)}% density). Aim for 0.3%-2.5%.`,
  });

  const lengthOk = wordCount >= 600;
  checks.push({
    check: 'Content length',
    passed: lengthOk,
    weight: 15,
    detail: `${wordCount} words. Pages competing for competitive terms typically need 600+.`,
  });

  const metaLengthOk = metaDescription.length >= 70 && metaDescription.length <= 160;
  checks.push({
    check: 'Meta description length',
    passed: metaLengthOk,
    weight: 5,
    detail: `${metaDescription.length} characters. Ideal range is 70-160.`,
  });

  const titleLengthOk = title.length >= 30 && title.length <= 60;
  checks.push({
    check: 'Title length',
    passed: titleLengthOk,
    weight: 5,
    detail: `${title.length} characters. Ideal range is 30-60 (avoids truncation in search results).`,
  });

  const readingEase = fleschReadingEase(bodyText);
  const readable = readingEase >= 50;
  checks.push({
    check: 'Readability',
    passed: readable,
    weight: 10,
    detail: `Flesch Reading Ease score: ${readingEase} (60-70 is "plain English"; below 30 is very difficult).`,
  });

  const hasH1 = h1.trim().length > 0;
  checks.push({
    check: 'Has an H1 heading',
    passed: hasH1,
    weight: 15,
    detail: hasH1 ? 'H1 present.' : 'Page is missing an H1 heading entirely.',
  });

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = checks.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  return { score, wordCount, keywordDensity: Number(density.toFixed(2)), readingEase, checks };
}

module.exports = { scoreContent, fleschReadingEase };
