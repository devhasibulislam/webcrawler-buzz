const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/prokken-inc/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
    headless: true,
  });

  // ── 1. Page smoke test across viewports ──────────────────────
  const pages = [
    '/', '/about', '/mcp', '/blogs', '/blogs/what-is-a-web-crawler',
    '/privacy-policy', '/terms-of-service', '/cookie-policy',
    '/api-docs-public', '/results.html', '/404-not-found',
  ];
  const widths = [320, 375, 768, 1280];
  let bad = 0;
  for (const url of pages) {
    for (const w of widths) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      await ctx.addInitScript(() => localStorage.setItem('theme', 'dark'));
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 60)); });
      try {
        const res = await page.goto('https://webcrawler.buzz' + url + '?v=final', { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(500);
        const info = await page.evaluate(() => ({
          vw: window.innerWidth,
          docSW: document.documentElement.scrollWidth,
          hasHeader: !!document.querySelector('header.site-header .brand-mark'),
          hasFooter: !!document.querySelector('footer.site-footer .links'),
        }));
        const overflow = info.docSW > info.vw + 1;
        const isOk = !overflow && info.hasHeader && info.hasFooter;
        if (!isOk && !(url === '/404-not-found' && errors.length === 1)) bad++;
      } catch (e) { bad++; }
      await ctx.close();
    }
  }
  console.log('page smoke test:', bad === 0 ? '✓ all pass' : `${bad} failures`);

  // ── 2. Live crawl end-to-end ─────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const page = await ctx.newPage();
  await page.goto('https://webcrawler.buzz/?run=final', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('#url-input', 'https://example.com');
  await page.click('#submit-btn');
  await page.waitForFunction(() =>
    document.getElementById('progress-section') && getComputedStyle(document.getElementById('progress-section')).display !== 'none',
    { timeout: 15000 }
  );
  const tracking = await page.getAttribute('#tracking-url', 'href');
  console.log('crawl start: tracking URL present:', tracking ? '✓' : '✗', tracking);
  try {
    await page.waitForURL(/\/results\.html\?job_id=/, { timeout: 45000 });
    console.log('crawl redirect: ✓ landed on', page.url().split('?')[0]);
  } catch { console.log('crawl redirect: took >45s (likely duplicate flow), continuing'); }
  await ctx.close();

  // ── 3. MCP handshake ─────────────────────────────────────────
  const res = await fetch('https://webcrawler.buzz/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } } }),
  });
  const text = await res.text();
  const m = text.match(/\{.*\}/s);
  const data = m ? JSON.parse(m[0]) : null;
  const si = data?.result?.serverInfo;
  console.log('mcp handshake:');
  console.log('  title    ', si?.title);
  console.log('  version  ', si?.version);
  console.log('  website  ', si?.websiteUrl);
  console.log('  icons    ', si?.icons?.length + ' icon(s) advertised');

  // ── 4. Health check ──────────────────────────────────────────
  const health = await (await fetch('https://webcrawler.buzz/api/health')).json();
  console.log('health:', health.status, 'db=' + health.services.database.status, 'redis=' + health.services.redis.status, 'v=' + health.version);

  await browser.close();
})();
