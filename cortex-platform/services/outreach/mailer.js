const nodemailer = require('nodemailer');
const logger = require('../../utils/logger.util');

let transporter = null;

/**
 * Lazily creates the SMTP transport from .env credentials. Nothing in
 * this file sends anything on its own - it's only used when a job in
 * outreachWorker.js explicitly calls sendMail() for a queued message
 * the user created through the API.
 */
function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    logger.warn(
      'SMTP_HOST/SMTP_USER/SMTP_PASSWORD not set - outreach emails cannot be sent until these are configured in .env.'
    );
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  const info = await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html: html || undefined,
  });

  return { messageId: info.messageId };
}

module.exports = { sendMail };
