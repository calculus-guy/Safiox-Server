const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Send an email using Brevo Transactional API
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const email = new SibApiV3Sdk.SendSmtpEmail();

  email.sender = {
    name: process.env.EMAIL_FROM_NAME || 'Safiox',
    email: process.env.EMAIL_FROM_ADDRESS || 'support@safiox.com',
  };
  email.to = [{ email: to }];
  email.subject = subject;
  if (html) email.htmlContent = html;
  if (text) email.textContent = text;

  const info = await transactionalApi.sendTransacEmail(email);
  console.log(`📧 Email sent: ${info.messageId}`);
  return info;
};

module.exports = { sendEmail };
