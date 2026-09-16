/**
 * Generates valid, ready-to-embed JSON-LD structured data. This is
 * pure templating against the documented Schema.org spec - no AI
 * involved, no guessing at content, the caller supplies the real data.
 */
function generateFaqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

function generateHowToSchema({ name, description, steps, totalTimeMinutes }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(totalTimeMinutes ? { totalTime: `PT${totalTimeMinutes}M` } : {}),
    step: steps.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

function generateArticleSchema({ headline, description, authorName, datePublished, dateModified, imageUrl, url }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    author: { '@type': 'Person', name: authorName },
    datePublished,
    dateModified: dateModified || datePublished,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(url ? { mainEntityOfPage: url } : {}),
  };
}

function generateProductSchema({ name, description, imageUrl, price, currency, availability, ratingValue, reviewCount }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(price
      ? {
          offers: {
            '@type': 'Offer',
            price: String(price),
            priceCurrency: currency || 'INR',
            availability: `https://schema.org/${availability || 'InStock'}`,
          },
        }
      : {}),
    ...(ratingValue && reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(ratingValue),
            reviewCount: String(reviewCount),
          },
        }
      : {}),
  };
}

module.exports = {
  generateFaqSchema,
  generateHowToSchema,
  generateArticleSchema,
  generateProductSchema,
};
