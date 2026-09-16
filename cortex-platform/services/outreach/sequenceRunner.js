const { sendMail } = require('./mailer');
const { TEMPLATES, renderTemplate } = require('./templates');
const { OutreachMessage, OutreachProspect } = require('../../models/mongo');
const logger = require('../../utils/logger.util');

/**
 * Sends ONE outreach email to ONE prospect and logs it. "Sequence" in
 * Phase 4 means "the first touch, using the right template for the
 * prospect type" - follow-up steps (day 3, day 7 nudges) are a natural
 * next addition on top of this same OutreachMessage log, not a
 * structural change.
 */
async function sendOutreachEmail(prospect, site, { niche, senderName, templateOverride } = {}) {
  if (!prospect.contact_email) {
    throw new Error('Prospect has no contact_email set - add one before sending outreach.');
  }

  const template = templateOverride || TEMPLATES[prospect.prospect_type] || TEMPLATES.manual;

  const variables = {
    domain: prospect.domain,
    page_title: prospect.page_title || prospect.domain,
    niche: niche || 'this topic',
    site_domain: site.domain,
    sender_name: senderName || 'The team',
  };

  const subject = renderTemplate(template.subject, variables);
  const body = renderTemplate(template.body, variables);

  const message = await OutreachMessage.create({
    prospect_id: prospect.id.toString(),
    site_id: site.id,
    direction: 'outbound',
    subject,
    body_excerpt: body.slice(0, 280),
    status: 'queued',
  });

  try {
    await sendMail({ to: prospect.contact_email, subject, text: body });

    message.status = 'sent';
    message.sent_at = new Date();
    await message.save();

    prospect.status = 'contacted';
    await prospect.save();

    return { sent: true, messageId: message._id };
  } catch (err) {
    message.status = 'failed';
    message.error_message = err.message;
    await message.save();

    logger.error(`Outreach send failed for prospect ${prospect._id}: ${err.message}`);
    throw err;
  }
}

module.exports = { sendOutreachEmail };
