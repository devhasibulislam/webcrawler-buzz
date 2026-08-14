# Security Policy

## Supported Versions

Only the latest `2.3.x` release line receives security fixes. Older tags are archived.

| Version | Supported |
|---------|-----------|
| 2.3.x   | ✅ Yes    |
| < 2.3   | ❌ No     |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security problems.**

Preferred:

- Open a **private security advisory** at
  <https://github.com/devhasibulislam/webcrawler-buzz/security/advisories/new>.

Fallback:

- Email <devhasibulislam@gmail.com>.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Impact you observed
- Suggested fix if you have one

### Response timeline

- Acknowledgement within 48 hours
- Initial assessment within 1 week
- Fix targets: critical 24–48 h, high 1 week, medium 2 weeks, low next release

I'll credit you in the release notes unless you prefer to stay anonymous.

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
