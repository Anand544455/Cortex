/**
 * Simple, honest starter templates - the kind of first-touch email a
 * real outreach campaign sends. Editable per-request via the
 * templateOverride parameter in sequenceRunner.js; these are just
 * sensible defaults, not meant to be sent unedited at scale.
 */
const TEMPLATES = {
  guest_post: {
    subject: 'Guest post idea for {{domain}}',
    body: `Hi there,

I came across {{page_title}} on {{domain}} and really liked your angle on the topic.

I write about {{niche}} over at {{site_domain}}, and had an idea for a guest post that I think would fit well with what you publish. Would you be open to a quick pitch?

Thanks for your time,
{{sender_name}}`,
  },
  resource_page: {
    subject: 'Possible addition to your resource page',
    body: `Hi there,

I noticed your resource page ({{page_title}}) on {{domain}} - it's a genuinely useful list.

We put together a guide on {{niche}} at {{site_domain}} that might be a good fit alongside the other links there. Happy to share it if useful, no pressure either way.

Best,
{{sender_name}}`,
  },
  broken_link: {
    subject: 'Quick heads up about a link on {{domain}}',
    body: `Hi there,

While reading through {{page_title}} on {{domain}}, I noticed one of the outbound links may no longer be working.

We have a similar, up-to-date resource on {{niche}} at {{site_domain}} if it's useful as a replacement - either way, wanted to flag the broken link.

Best,
{{sender_name}}`,
  },
  manual: {
    subject: 'Following up from {{site_domain}}',
    body: `Hi there,

Reaching out from {{site_domain}} regarding {{niche}}. Let me know if you'd like to hear more.

Best,
{{sender_name}}`,
  },
};

function renderTemplate(templateString, variables) {
  return templateString.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

module.exports = { TEMPLATES, renderTemplate };
