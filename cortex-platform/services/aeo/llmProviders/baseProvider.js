/**
 * Every LLM provider just needs to answer one question: given a
 * prompt, what text did the model generate? Citation-checking logic
 * (does the site's domain appear in that text?) lives one layer up in
 * citationTracker.js and is identical regardless of which model answered.
 */
class BaseLlmProvider {
  // eslint-disable-next-line no-unused-vars
  async ask(prompt) {
    throw new Error('ask() must be implemented by a concrete LLM provider.');
  }
}

module.exports = BaseLlmProvider;
