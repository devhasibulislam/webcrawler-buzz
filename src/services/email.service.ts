import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  // Force IPv4 — many VPS providers advertise AAAA but have no IPv6 egress,
  // causing ENETUNREACH on the IPv6 address that DNS returns first.
  family: 4,
});

// Verify SMTP connection on startup
transporter.verify()
  .then(() => console.log('[Email] SMTP connection verified ✅'))
  .catch((err) => console.error('[Email] SMTP connection FAILED ❌:', err.message));

export const emailService = {
  /**
   * Send a crawl-complete notification email.
   */
  async sendCrawlCompleteEmail(
    toEmail: string,
    domain: string,
    totalPages: number,
    jobId: string
  ): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
    const trackingUrl = `${baseUrl}/results?job_id=${jobId}`;

    const htmlBody = `
      <div style="font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a73e8;">✅ Your crawl for <em>${domain}</em> is complete!</h1>
        <p style="font-size: 16px; color: #333;">
          We finished crawling <strong>${domain}</strong> and found
          <strong>${totalPages}</strong> page${totalPages !== 1 ? 's' : ''}.
        </p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${trackingUrl}"
             style="background-color: #1a73e8; color: #fff; text-decoration: none;
                    padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            View Full Results →
          </a>
        </div>
        <p style="font-size: 13px; color: #e53e3e; font-weight: 600;">
          ⚠️ These results will be automatically deleted in 1 hour. Make sure to export your CSV before then!
        </p>
        <p style="font-size: 13px; color: #888;">
          You can also paste this link into your browser:<br/>
          <a href="${trackingUrl}">${trackingUrl}</a>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Domain Crawler" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `✅ Your crawl for ${domain} is complete!`,
      html: htmlBody,
    });

    console.log(`[Email] Notification sent to ${toEmail} for job ${jobId}`);
  },

  /**
   * Send a CSV export ready email with download link.
   */
  async sendExportReadyEmail(
    toEmail: string,
    domain: string,
    totalPages: number,
    downloadUrl: string
  ): Promise<void> {
    const htmlBody = `
      <div style="font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a73e8;">📥 Your CSV export for <em>${domain}</em> is ready!</h1>
        <p style="font-size: 16px; color: #333;">
          We've generated a CSV file with <strong>${totalPages}</strong> crawled page${totalPages !== 1 ? 's' : ''} for <strong>${domain}</strong>.
        </p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${downloadUrl}"
             style="background-color: #16a34a; color: #fff; text-decoration: none;
                    padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            Download CSV →
          </a>
        </div>
        <p style="font-size: 13px; color: #e53e3e; font-weight: 600;">
          ⚠️ This link expires in 5 minutes.
        </p>
        <p style="font-size: 13px; color: #888;">
          You can also paste this link into your browser:<br/>
          <a href="${downloadUrl}">${downloadUrl}</a>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Domain Crawler" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `📥 Your CSV export for ${domain} is ready!`,
      html: htmlBody,
    });

    console.log(`[Email] Export download link sent to ${toEmail}`);
  },
};
