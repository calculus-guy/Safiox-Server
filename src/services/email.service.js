const { sendEmail } = require('../config/email');

/**
 * Email Service — all email templates used across the application.
 */
class EmailService {
  /**
   * Send unsafe status notification to an emergency contact.
   */
  static async sendUnsafeStatusEmail(contact, { userName }) {
    await sendEmail({
      to: contact.email,
      subject: `⚠️ Safety Alert — ${userName} marked themselves as unsafe`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; border: 2px solid #F59E0B; border-radius: 12px;">
          <h2 style="color: #D97706;">⚠️ Safety Alert</h2>
          <p style="color: #374151; font-size: 15px;">
            Hi ${contact.name}, <strong>${userName}</strong> has marked themselves as <strong>unsafe</strong> on the Safiox app.
          </p>
          <p style="color: #374151; font-size: 15px;">
            Please try to reach them and check if they are okay.
          </p>
          <p style="color: #6B7280; font-size: 13px; margin-top: 20px;">
            This is an automated alert from Safiox Safety App.
          </p>
        </div>
      `,
      text: `Hi ${contact.name}, ${userName} has marked themselves as unsafe on Safiox. Please check on them.`,
    });
  }

  /**
   * Send email verification link.
   */
  static async sendVerificationEmail(user, token) {
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:8081'}/verify-email?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Safiox — Verify Your Email',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px;">
          <h2 style="color: #004A7C;">Welcome to Safiox, ${user.name}! 🎉</h2>
          <p style="color: #374151; font-size: 15px;">
            Thank you for signing up. Please verify your email address to get started.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #004A7C; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
            Verify Email
          </a>
          <p style="color: #6B7280; font-size: 13px;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `Welcome to Safiox, ${user.name}! Verify your email: ${verifyUrl}`,
    });
  }

  /**
   * Send password reset link.
   */
  static async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:8081'}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Safiox — Reset Your Password',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px;">
          <h2 style="color: #004A7C;">Password Reset Request</h2>
          <p style="color: #374151; font-size: 15px;">
            Hi ${user.name}, we received a request to reset your password.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #EF4444; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
            Reset Password
          </a>
          <p style="color: #6B7280; font-size: 13px;">
            This link expires in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
      text: `Reset your Safiox password: ${resetUrl}`,
    });
  }

  /**
   * Send SOS escalation alert to an emergency contact.
   */
  static async sendSOSEscalationEmail(contact, sosData) {
    const trackingUrl = `${process.env.CLIENT_URL || 'http://localhost:8081'}/sos/track/${sosData.trackingToken}`;

    await sendEmail({
      to: contact.email || '',
      subject: '🚨 EMERGENCY — SOS Alert from Safiox',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; border: 2px solid #EF4444; border-radius: 12px;">
          <h2 style="color: #EF4444;">🚨 Emergency SOS Alert</h2>
          <p style="color: #374151; font-size: 15px;">
            <strong>${sosData.userName}</strong> has triggered an SOS alert and needs help.
          </p>
          <div style="background: #FEE2E2; padding: 16px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 4px 0; color: #991B1B;"><strong>Time:</strong> ${new Date(sosData.triggeredAt).toLocaleString()}</p>
            <p style="margin: 4px 0; color: #991B1B;"><strong>Location:</strong> ${sosData.latitude}, ${sosData.longitude}</p>
          </div>
          <a href="${trackingUrl}" style="display: inline-block; background: #EF4444; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0;">
            Track Live Location
          </a>
          <p style="color: #6B7280; font-size: 13px; margin-top: 20px;">
            This is an automated alert from Safiox Safety App.
          </p>
        </div>
      `,
      text: `EMERGENCY: ${sosData.userName} has triggered an SOS alert. Track location: ${trackingUrl}`,
    });
  }

  /**
   * Send SOS resolved notification.
   */
  static async sendSOSResolvedEmail(contact, sosData) {
    await sendEmail({
      to: contact.email || '',
      subject: '✅ SOS Alert Resolved — Safiox',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px;">
          <h2 style="color: #10B981;">✅ SOS Alert Resolved</h2>
          <p style="color: #374151; font-size: 15px;">
            <strong>${sosData.userName}</strong>'s emergency alert has been resolved. They are safe.
          </p>
        </div>
      `,
      text: `${sosData.userName}'s SOS alert has been resolved. They are safe.`,
    });
  }

  /**
   * Send organization registration confirmation.
   */
  static async sendOrgRegistrationEmail(org) {
    await sendEmail({
      to: org.email,
      subject: 'Safiox — Organization Registration Received',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px;">
          <h2 style="color: #004A7C;">Registration Received</h2>
          <p style="color: #374151; font-size: 15px;">
            Hi ${org.name}, your organization registration has been submitted for review.
          </p>
          <p style="color: #374151; font-size: 15px;">
            Our team will verify your details and you will receive an email once approved.
          </p>
        </div>
      `,
      text: `${org.name}, your organization registration has been submitted for review.`,
    });
  }

  /**
   * Send organization verification approval.
   */
  static async sendOrgApprovalEmail(org) {
    await sendEmail({
      to: org.email,
      subject: 'Safiox — Organization Verified ✅',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px;">
          <h2 style="color: #10B981;">You're Verified! ✅</h2>
          <p style="color: #374151; font-size: 15px;">
            Congratulations ${org.name}! Your organization has been verified on Safiox.
          </p>
          <p style="color: #374151; font-size: 15px;">
            You can now access your dashboard and start responding to emergencies.
          </p>
        </div>
      `,
      text: `${org.name}, your organization has been verified on Safiox!`,
    });
  }
}

module.exports = EmailService;
