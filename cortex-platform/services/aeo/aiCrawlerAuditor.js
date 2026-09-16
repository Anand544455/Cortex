const { getRobotsRules } = require('../../crawler/robotsChecker');

/**
 * Reuses the robots.txt parser already built for the Crawl Engine
 * (Phase 2) to check whether known AI-assistant crawlers are allowed
 * in - the prerequisite for a site to even be eligible for citation in
 * tools that respect robots.txt (not all do, but the well-behaved ones do).
 */
const KNOWN_AI_CRAWLERS = [
  { name: 'GPTBot', owner: 'OpenAI (ChatGPT training/browsing)' },
  { name: 'ChatGPT-User', owner: 'OpenAI (ChatGPT browsing plugin)' },
  { name: 'ClaudeBot', owner: 'Anthropic (Claude)' },
  { name: 'Google-Extended', owner: 'Google (Gemini / AI Overviews training)' },
  { name: 'PerplexityBot', owner: 'Perplexity' },
  { name: 'CCBot', owner: 'Common Crawl (used by many AI labs for training data)' },
  { name: 'Bytespider', owner: 'ByteDance' },
];

async function auditAiCrawlerAccess(baseUrl) {
  const robots = await getRobotsRules(baseUrl);

  return KNOWN_AI_CRAWLERS.map((bot) => ({
    ...bot,
    allowed: robots.isAllowed(baseUrl, bot.name) !== false,
  }));
}

module.exports = { auditAiCrawlerAccess, KNOWN_AI_CRAWLERS };
