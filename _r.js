const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/prokken-inc/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
    headless: true,
  });
  for (const w of [375, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript(() => localStorage.setItem('theme', 'dark'));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.err: ' + m.text().slice(0, 100)); });

    await page.goto('https://webcrawler.buzz/?e2e=r' + w, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.fill('#url-input', 'https://example.com');
    await page.click('#submit-btn');
    // Wait for redirect to /results.html
    await page.waitForURL(/\/results\.html/, { timeout: 45000 });
    console.log(`${w}px  → landed on ${page.url().split('?')[0]}`);
    await page.waitForFunction(() => document.getElementById('results-section') && document.getElementById('results-section').style.display !== 'none', { timeout: 20000 });
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => ({
      docSW: document.documentElement.scrollWidth,
      vw: window.innerWidth,
      domainText: document.getElementById('results-domain')?.textContent?.trim(),
      summary: document.getElementById('results-summary')?.textContent?.trim(),
      rows: document.querySelectorAll('#results-tbody tr').length,
      exportBtnLabel: document.getElementById('export-csv-btn')?.textContent?.trim(),
      badges: document.querySelectorAll('.status-badge').length,
    }));
    console.log(`${w}px  overflow=${info.docSW > info.vw + 1 ? info.docSW + '>' + info.vw : 'ok'}  domain=${info.domainText}  rows=${info.rows}  badges=${info.badges}`);
    console.log(`${w}px  summary=${info.summary}`);

    // Try opening the export modal
    await page.click('#export-csv-btn');
    await page.waitForTimeout(400);
    const modalOpen = await page.evaluate(() => document.getElementById('export-modal').classList.contains('open'));
    console.log(`${w}px  export modal opens: ${modalOpen}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const modalClosed = await page.evaluate(() => !document.getElementById('export-modal').classList.contains('open'));
    console.log(`${w}px  esc closes modal: ${modalClosed}`);

    await page.screenshot({ path: `/tmp/results-${w}.png`, fullPage: false });
    console.log(`${w}px  errors=${errors.length}${errors.length ? ' ' + errors[0] : ''}`);
    await ctx.close();
  }
  await browser.close();
})();
