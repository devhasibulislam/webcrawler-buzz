import { describe, it, expect } from 'vitest';
import {
  extractRootDomain,
  normalizeUrl,
  isValidUrl,
  isInternalLink,
  resolveUrl,
} from '../../src/utils/url.utils';

describe('extractRootDomain', () => {
  it('extracts domain from full URL', () => {
    expect(extractRootDomain('https://www.example.com/path')).toBe('example.com');
  });

  it('strips www. prefix', () => {
    expect(extractRootDomain('https://www.amplifying.ai/foo')).toBe('amplifying.ai');
  });

  it('keeps non-www subdomains intact', () => {
    expect(extractRootDomain('https://blog.example.com')).toBe('blog.example.com');
  });

  it('handles URL with port', () => {
    expect(extractRootDomain('http://example.com:8080/page')).toBe('example.com');
  });
});

describe('normalizeUrl', () => {
  it('removes trailing slash', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
  });

  it('keeps root slash', () => {
    const result = normalizeUrl('https://example.com/');
    expect(result).toBe('https://example.com/');
  });

  it('removes fragment', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('lowercases host', () => {
    expect(normalizeUrl('https://EXAMPLE.COM/Path')).toBe('https://example.com/Path');
  });

  it('returns original string for invalid URL', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });
});

describe('isValidUrl', () => {
  it('accepts http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('accepts https URLs', () => {
    expect(isValidUrl('https://example.com/path')).toBe(true);
  });

  it('rejects ftp URLs', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('rejects non-URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

describe('isInternalLink', () => {
  it('recognizes same-domain links as internal', () => {
    expect(isInternalLink('https://example.com/page', 'example.com')).toBe(true);
  });

  it('recognizes www variant as internal', () => {
    expect(isInternalLink('https://www.example.com/page', 'example.com')).toBe(true);
  });

  it('rejects external domains', () => {
    expect(isInternalLink('https://other.com/page', 'example.com')).toBe(false);
  });

  it('rejects subdomains other than www', () => {
    expect(isInternalLink('https://blog.example.com/page', 'example.com')).toBe(false);
  });

  it('rejects non-http protocols', () => {
    expect(isInternalLink('mailto:test@example.com', 'example.com')).toBe(false);
  });
});

describe('resolveUrl', () => {
  it('resolves relative paths against base', () => {
    const result = resolveUrl('/about', 'https://example.com/page');
    expect(result).toBe('https://example.com/about');
  });

  it('returns absolute URLs unchanged', () => {
    const result = resolveUrl('https://other.com/page', 'https://example.com');
    expect(result).toBe('https://other.com/page');
  });

  it('returns null for invalid hrefs', () => {
    expect(resolveUrl('javascript:void(0)', 'https://example.com')).toBeNull();
  });

  it('returns null for mailto links', () => {
    expect(resolveUrl('mailto:test@test.com', 'https://example.com')).toBeNull();
  });
});
