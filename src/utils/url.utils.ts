/**
 * Extract the root domain from a URL, stripping www. prefix.
 * e.g. "https://www.amplifying.ai/foo" → "amplifying.ai"
 */
export function extractRootDomain(urlStr: string): string {
  const parsed = new URL(urlStr);
  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }
  return hostname;
}

/**
 * Normalize a URL: lowercase host, strip trailing slash, strip fragment.
 */
export function normalizeUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    parsed.hash = '';
    let result = parsed.toString();
    // Remove trailing slash unless it's root
    if (result.endsWith('/') && parsed.pathname !== '/') {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return urlStr;
  }
}

/**
 * Validate that a string is a valid HTTP/HTTPS URL.
 */
export function isValidUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if a discovered href is an internal link for the given root domain.
 * Blocks subdomains (only root domain and www. variant are allowed).
 */
export function isInternalLink(href: string, rootDomain: string): boolean {
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname === rootDomain;
  } catch {
    return false;
  }
}

/**
 * Resolve a potentially relative href against a base URL.
 * Returns null for non-crawlable schemes (mailto:, tel:, javascript:, #-only).
 */
export function resolveUrl(href: string, baseUrl: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed === '#') return null;
  if (
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  ) {
    return null;
  }
  try {
    const resolved = new URL(trimmed, baseUrl);
    return normalizeUrl(resolved.toString());
  } catch {
    return null;
  }
}
