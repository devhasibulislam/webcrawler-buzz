import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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
};
