const BaseLlmProvider = require('./baseProvider');

/**
 * Uses your own Anthropic API key to ask Claude a prompt and check
 * whether your site gets cited in the answer. Configure via .env:
 *   ANTHROPIC_API_KEY=sk-ant-...
 */
class AnthropicProvider extends BaseLlmProvider {
  constructor() {
    super();
    this.apiKey = process.env.ANTHROPIC_API_KEY;
  }

  async ask(prompt) {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set - cannot query Claude for citation checks.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API request failed: HTTP ${response.status}`);
    }

    const json = await response.json();
    const textBlocks = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text);
    return textBlocks.join('\n');
  }
}

module.exports = AnthropicProvider;
