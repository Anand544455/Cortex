/**
 * Scores how "extractable" a piece of content is as a direct answer -
 * the format signals AI Overviews, featured snippets, and chatbot
 * answers tend to pull from. Rule-based, self-hosted, same spirit as
 * onPageScorer.js in Content Studio but focused on answer-format
 * rather than keyword optimization.
 */
function scoreAnswerFormat({ bodyText = '', headings = [] }) {
  const checks = [];

  const firstParagraph = bodyText.split(/\n+/).find((p) => p.trim().length > 20) || '';
  const firstParagraphWordCount = firstParagraph.split(/\s+/).filter(Boolean).length;
  const hasConciseDirectAnswer = firstParagraphWordCount > 0 && firstParagraphWordCount <= 60;
  checks.push({
    check: 'Concise direct-answer opening',
    passed: hasConciseDirectAnswer,
    weight: 25,
    detail: hasConciseDirectAnswer
      ? `Opening paragraph is ${firstParagraphWordCount} words - short enough to quote directly.`
      : 'Opening paragraph is too long (or missing) to work as a standalone quoted answer. Aim for a 1-2 sentence direct answer up top.',
  });

  const questionHeadings = headings.filter((h) => /\?\s*$/.test(h.text.trim()));
  const hasQuestionHeadings = questionHeadings.length > 0;
  checks.push({
    check: 'Question-format headings',
    passed: hasQuestionHeadings,
    weight: 20,
    detail: hasQuestionHeadings
      ? `${questionHeadings.length} heading(s) phrased as questions - these map directly to how people ask AI assistants.`
      : 'No headings are phrased as questions. Consider rephrasing key headings as the actual question someone would ask.',
  });

  const hasList = /(?:^|\n)\s*[-*•]\s+\S/.test(bodyText) || /(?:^|\n)\s*\d+[.)]\s+\S/.test(bodyText);
  checks.push({
    check: 'Contains a list',
    passed: hasList,
    weight: 20,
    detail: hasList
      ? 'Content includes a bulleted or numbered list - a format AI answers frequently lift wholesale.'
      : 'No lists detected. Steps, options, or criteria are easier to extract as a list than as prose.',
  });

  const sentences = bodyText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? bodyText.split(/\s+/).length / sentences.length : 0;
  const sentencesAreShort = avgSentenceLength > 0 && avgSentenceLength <= 20;
  checks.push({
    check: 'Short, quotable sentences',
    passed: sentencesAreShort,
    weight: 15,
    detail: `Average sentence length: ${avgSentenceLength.toFixed(1)} words. Under 20 is easier to extract as a standalone quote.`,
  });

  const hasDefinitionPattern = /\bis\s+(a|an|the)\b/i.test(firstParagraph) || /\brefers to\b/i.test(firstParagraph);
  checks.push({
    check: 'Clear definitional statement',
    passed: hasDefinitionPattern,
    weight: 20,
    detail: hasDefinitionPattern
      ? 'Opening contains a clear "X is a/an Y" definitional pattern.'
      : 'No clear definitional sentence detected near the top - "[Term] is a/an [category] that [does what]" is the most commonly extracted pattern.',
  });

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = checks.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  return { score, checks };
}

module.exports = { scoreAnswerFormat };
