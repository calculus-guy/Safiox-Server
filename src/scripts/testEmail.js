require('dotenv').config();
const { sendEmail } = require('../config/email');

(async () => {
  try {
    await sendEmail({
      to: 'sakariyauabdullateef993@gmail.com',
      subject: 'Safiox — Email Test',
      html: '<h2>It works!</h2><p>Brevo email is configured correctly on Safiox.</p>',
      text: 'It works! Brevo email is configured correctly on Safiox.',
    });
    console.log('✅ Test email sent successfully');
  } catch (err) {
    console.error('❌ Failed to send test email:', err.message);
  }
})();
