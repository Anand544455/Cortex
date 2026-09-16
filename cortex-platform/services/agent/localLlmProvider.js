/**
 * Ollama (ollama.com) runs open-source language models (Llama 3,
 * Mistral, Qwen, Phi, etc.) entirely on your own hardware - no API
 * key, no per-call cost, no data ever leaving your server. This is
 * the honest self-hosted alternative to a paid LLM API: you pay for
 * compute once (a machine with enough RAM/GPU), not per request,
 * forever. Quality is lower than the frontier paid models, and speed
 * depends entirely on your hardware - a real tradeoff, not a free
 * lunch, but it's genuinely yours and genuinely free to run.
 *
 * The Agent (auditAgent.js / suggestionEngine.js) works completely
 * fine with NO local LLM configured at all - it falls back to
 * template-based, rule-driven suggestions. This is a pure enhancement
 * layer, never a hard requirement, which is why nothing else in the
 * app imports this file directly except suggestionEngine.js.
 *
 * Setup: install Ollama on your server (or any machine reachable from
 * it), run `ollama pull llama3.1` (or any model you prefer), then set:
 *   OLLAMA_BASE_URL=http://127.0.0.1:11434
 *   OLLAMA_MODEL=llama3.1
 */
function isConfigured() {
  return Boolean(process.env.OLLAMA_BASE_URL);
}

async function ask(prompt, { system } = {}) {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL || 'llama3.1';

  if (!baseUrl) {
    throw new Error('OLLAMA_BASE_URL is not set - the agent will use template-based suggestions instead of a local LLM.');
  }

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system: system || undefined,
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: HTTP ${response.status} - is Ollama running and is the model pulled?`);
  }

  const data = await response.json();
  return data.response || '';
}

module.exports = { isConfigured, ask };
