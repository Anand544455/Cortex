const AnthropicProvider = require('./anthropicProvider');
const OpenAiProvider = require('./openAiProvider');

/**
 * Returns only the providers that actually have credentials configured -
 * citation checks run against whichever ones are available, and simply
 * skip the rest rather than failing the whole request. Perplexity and
 * Gemini don't currently offer chat-completion APIs identical enough to
 * drop in here without their own adapter; add one under this same
 * services/aeo/llmProviders/ folder (matching baseProvider.js's ask()
 * interface) when you have a key for either.
 */
function getConfiguredLlmProviders() {
  const providers = [];

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({ engine: 'claude', provider: new AnthropicProvider() });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ engine: 'chatgpt', provider: new OpenAiProvider() });
  }

  return providers;
}

module.exports = { getConfiguredLlmProviders };
