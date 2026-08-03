# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.2.x   | ✅ Yes             |
| 1.1.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report security issues responsibly by emailing:

📧 **devhasibulislam@gmail.com**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix/patch**: Depends on severity, but we aim for:
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release cycle

### What Happens Next

1. We'll confirm receipt of your report
2. We'll investigate and assess the severity
3. We'll develop and test a fix
4. We'll release the fix and credit you (unless you prefer anonymity)

## Security Measures in Place

WebCrawler.buzz implements the following security measures:

- **Helmet.js**, HTTP security headers (HSTS, XSS protection, etc.)
- **CORS**, Strict origin restriction
- **Rate Limiting**, 200 POST requests per 15 min per IP
- **Input Validation**, All user inputs validated server-side
- **Parameterized Queries**, SQL injection prevention via `pg` parameterized queries
- **No Persistent User Data**, Crawl results auto-delete after 1 hour
- **SSL/TLS**, All database connections use SSL
- **Environment Variables**, Secrets never committed to source control

## Hall of Fame

We thank the following individuals for responsibly disclosing vulnerabilities:

_No reports yet, be the first!_

---

Thank you for helping keep WebCrawler.buzz and its users safe.
