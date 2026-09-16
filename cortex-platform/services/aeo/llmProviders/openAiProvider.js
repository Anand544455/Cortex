const BaseLlmProvider = require('./baseProvider');

/**
 * Uses your own OpenAI API key to ask ChatGPT a prompt for citation
 * checking. Written against the standard OpenAI-compatible chat
 * completions shape, so it also works unmodified against any
 * OpenAI-API-compatible endpoint you point it at (some providers
 * expose Gemini/other models behind this same interface).
 * Configure via .env:
 *   OPENAI_API_KEY=sk-...
 *   OPENAI_API_URL=https://api.openai.com/v1/chat/completions  (override for compatible endpoints)
 *   OPENAI_MODEL=gpt-4o-mini
 */
class OpenAiProvider extends BaseLlmProvider {
  constructor() {
    super();
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async ask(prompt) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not set - cannot query ChatGPT for citation checks.');
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible API request failed: HTTP ${response.status}`);
    }

    const json = await response.json();
    return json.choices?.[0]?.message?.content || '';
  }
}

module.exports = OpenAiProvider;
