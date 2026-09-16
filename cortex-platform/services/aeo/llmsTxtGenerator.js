/**
 * Generates an llms.txt file per the emerging community convention
 * (https://llmstxt.org) - a markdown file at the site root that helps
 * LLM-based tools understand what a site is and which pages matter
 * most, similar in spirit to sitemap.xml but written for language
 * models rather than search engine crawlers.
 */
function generateLlmsTxt({ siteName, description, keyPages = [] }) {
  const lines = [`# ${siteName}`, '', description || '', ''];

  if (keyPages.length > 0) {
    lines.push('## Key Pages', '');
    keyPages.forEach((page) => {
      lines.push(`- [${page.title}](${page.url})${page.summary ? `: ${page.summary}` : ''}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { generateLlmsTxt };
