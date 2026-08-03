# ADR-0003: Cloudflare for SSL Termination and CDN

**Status:** Accepted  
**Date:** 2025-01-15

## Context

The application needs HTTPS. Options considered:
1. Let's Encrypt + Certbot on the VPS (direct SSL)
2. Cloudflare proxy with Origin Certificate (SSL termination at edge)

## Decision

Use Cloudflare in Full (Strict) mode with an Origin Certificate on the Nginx reverse proxy. Cloudflare handles:
- SSL termination for end users
- DDoS protection
- CDN caching for static assets
- DNS management

## Consequences

- **Positive:** Free DDoS protection and CDN without additional infrastructure.
- **Positive:** No certificate renewal automation needed on the VPS (Origin Certificates last 15 years).
- **Positive:** Reduces direct traffic to the VPS.
- **Negative:** Adds dependency on Cloudflare, if their proxy is misconfigured, the site goes down.
- **Negative:** Real client IPs require `CF-Connecting-IP` header extraction (important for rate limiting).
- **Negative:** Cannot serve the site without Cloudflare in the path (Origin Certificate is not publicly trusted).
