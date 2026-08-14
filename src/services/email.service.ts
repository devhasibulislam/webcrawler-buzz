import nodemailer from 'nodemailer';
import dns from 'dns';

// VPS advertises AAAA (IPv6) records but has no IPv6 egress, causing ENETUNREACH
// on smtp.gmail.com. Force IPv4 for all DNS lookups in this process.
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
} as any);

// Verify SMTP connection on startup
transporter.verify()
  .then(() => console.log('[Email] SMTP connection verified ✅'))
  .catch((err) => console.error('[Email] SMTP connection FAILED ❌:', err.message));

const BRAND_URL = process.env.APP_BASE_URL || 'https://webcrawler.buzz';
const LOGO_URL = `${BRAND_URL}/icon-192x192.png`;

// Shared shell — mirrors the site's monochrome tokens (see public/theme.css).
// Email clients strip <style> unreliably, so every rule is inlined.
function renderEmail(opts: {
  preheader: string;
  headline: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  noticeHtml?: string;
  fallbackUrl: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.headline)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fafafa;color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;">
    <span style="display:none !important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(opts.preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:20px 28px;border-bottom:1px solid #e4e4e7;">
                <a href="${BRAND_URL}" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#0a0a0a;">
                  <img src="${LOGO_URL}" alt="" width="24" height="24" style="display:block;border:0;border-radius:6px;" />
                  <span style="font-size:15px;font-weight:600;letter-spacing:-0.01em;color:#0a0a0a;">webcrawler</span>
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px 28px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:#0a0a0a;">${opts.headline}</h1>
                <p style="margin:0;font-size:15px;line-height:1.55;color:#52525b;">${opts.intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 8px 28px;">
                <a href="${opts.ctaUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:-0.005em;">${opts.ctaLabel}</a>
              </td>
            </tr>
            ${opts.noticeHtml ? `<tr><td style="padding:16px 28px 8px 28px;"><div style="font-size:13px;line-height:1.5;color:#52525b;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:12px 14px;">${opts.noticeHtml}</div></td></tr>` : ''}
            <tr>
              <td style="padding:16px 28px 28px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">Or paste this link into your browser:<br /><a href="${opts.fallbackUrl}" style="color:#52525b;word-break:break-all;">${opts.fallbackUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #e4e4e7;background:#fafafa;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">
                  © ${new Date().getFullYear()} <a href="${BRAND_URL}" style="color:#52525b;text-decoration:none;">WebCrawler.buzz</a> ·
                  <a href="${BRAND_URL}/privacy-policy" style="color:#52525b;text-decoration:none;">Privacy</a> ·
                  <a href="${BRAND_URL}/terms-of-service" style="color:#52525b;text-decoration:none;">Terms</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

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
    const trackingUrl = `${BRAND_URL}/results?job_id=${jobId}`;
    const safeDomain = escapeHtml(domain);
    const pageWord = totalPages === 1 ? 'page' : 'pages';

    const html = renderEmail({
      preheader: `Your crawl for ${domain} finished — ${totalPages} ${pageWord} indexed.`,
      headline: `Crawl finished for ${safeDomain}`,
      intro: `We indexed <strong style="color:#0a0a0a;font-weight:600;">${totalPages.toLocaleString()}</strong> ${pageWord} across <strong style="color:#0a0a0a;font-weight:600;">${safeDomain}</strong>. Open the results to browse the pages, filter by status, or export a CSV.`,
      ctaLabel: 'View results',
      ctaUrl: trackingUrl,
      noticeHtml: 'Results are kept for <strong style="color:#0a0a0a;font-weight:600;">1 hour</strong>, then automatically deleted. Export a CSV before then if you want to keep them.',
      fallbackUrl: trackingUrl,
    });

    await transporter.sendMail({
      from: `"WebCrawler.buzz" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `Crawl finished for ${domain} — ${totalPages} ${pageWord}`,
      html,
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
    const safeDomain = escapeHtml(domain);
    const pageWord = totalPages === 1 ? 'page' : 'pages';

    const html = renderEmail({
      preheader: `Your CSV export for ${domain} is ready.`,
      headline: `CSV export ready for ${safeDomain}`,
      intro: `Your CSV contains <strong style="color:#0a0a0a;font-weight:600;">${totalPages.toLocaleString()}</strong> ${pageWord} from <strong style="color:#0a0a0a;font-weight:600;">${safeDomain}</strong>, including status codes, response times, and link counts.`,
      ctaLabel: 'Download CSV',
      ctaUrl: downloadUrl,
      noticeHtml: 'This download link expires in <strong style="color:#0a0a0a;font-weight:600;">5 minutes</strong> for security.',
      fallbackUrl: downloadUrl,
    });

    await transporter.sendMail({
      from: `"WebCrawler.buzz" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `CSV export ready for ${domain}`,
      html,
    });

    console.log(`[Email] Export download link sent to ${toEmail}`);
  },
};
